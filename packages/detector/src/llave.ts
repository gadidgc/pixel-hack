import { VentanaTemporal, mediana } from './matematica';

/**
 * Robo silencioso: la "llave" es otro celular (o, más adelante, una pulsera) que anuncia por Bluetooth (BLE).
 * El celular protegido mide qué tan fuerte le llega esa señal (RSSI, en dBm) y estima la distancia. Si la
 * llave se aleja más de `distanciaMaxM` y sigue lejos `sostenidoMs`, alguien se llevó el celular sin
 * jalón: de tu mochila o de la mesa.
 *
 * Como el detector de arrebato, NO usa el reloj del sistema: todo sale del `t` de las lecturas (y del `t`
 * que se le pasa a `revisar`), para que una grabación se reproduzca igual en las pruebas y en el celular.
 *
 * Ojo: el RSSI es ruidoso (±2 a 3 m a esta distancia) y el cuerpo o la mochila lo bajan, como si la llave
 * estuviera más lejos. Por eso usamos la mediana de unos segundos y pedimos que siga lejos un rato.
 */

export interface LecturaLlave {
  t: number;
  /** Potencia con que llegó la señal de la llave, en dBm (negativa: -50 es cerca, -90 es lejos). */
  rssi: number;
}

export interface ConfigLlave {
  /** Más allá de esta distancia estimada (m), la llave cuenta como lejos. */
  distanciaMaxM: number;
  /** Cuánto tiempo seguido (ms) tiene que estar lejos para dar la alerta. */
  sostenidoMs: number;
  /** Ventana (ms) para la mediana del RSSI: suaviza el ruido de la señal. */
  ventanaMs: number;
  /** Sin lecturas durante estos ms, la llave cuenta como lejos (salió del alcance o la apagaron). */
  sinSenalMs: number;
  /** Si al empezar no aparece la llave en estos ms, avisamos (¿la olvidaste?). */
  avisoSinLlaveMs: number;
  /**
   * Exponente de pérdida de la señal: 2 al aire libre, 2,5 a 3 bajo techo o con gente alrededor.
   * Estimación de la literatura, sin medir todavía con nuestros celulares.
   */
  exponente: number;
}

/** Demo: lo que pidió el equipo (5 m durante 5 s). */
export const CONFIG_LLAVE_DEMO: ConfigLlave = {
  distanciaMaxM: 5,
  sostenidoMs: 5_000,
  ventanaMs: 2_000,
  sinSenalMs: 3_000,
  avisoSinLlaveMs: 15_000,
  exponente: 2.5,
};

/**
 * Uso normal. ESTIMACIÓN, sin datos reales: más distancia y más tiempo, porque con la llave en el
 * bolsillo y el celular en la mochila el cuerpo baja la señal. Hay que medirlo antes de confiar en él.
 */
export const CONFIG_LLAVE_NORMAL: ConfigLlave = {
  distanciaMaxM: 8,
  sostenidoMs: 20_000,
  ventanaMs: 3_000,
  sinSenalMs: 10_000,
  avisoSinLlaveMs: 15_000,
  exponente: 2.5,
};

/** RSSI típico a 1 m si no se calibró (estimación; cada celular emite distinto). */
export const RSSI_A_1M_POR_DEFECTO = -60;

/**
 * Distancia estimada (m) con el modelo de pérdida logarítmica: d = 10^((RSSI a 1 m − RSSI) / (10·n)).
 */
export function distanciaDesdeRssi(rssi: number, rssiA1m: number, exponente: number): number {
  return Math.pow(10, (rssiA1m - rssi) / (10 * exponente));
}

/** Calibración: la mediana del RSSI con los dos celulares a 1 m. `null` si no llegó ninguna lectura. */
export function calibrarRssiA1m(rssis: readonly number[]): number | null {
  const m = mediana(rssis);
  return m === null ? null : Math.round(m);
}

/**
 * - `buscando`: todavía no vimos la llave cerca. No alerta (al activar puede que no esté, o la olvidaste).
 * - `cerca`: a menos de `distanciaMaxM`.
 * - `lejos`: más lejos (o sin señal); corre el tiempo.
 * - `separada`: siguió lejos `sostenidoMs`. Se queda aquí hasta `reiniciar()`.
 */
export type EstadoLlave = 'buscando' | 'cerca' | 'lejos' | 'separada';

export type EventoLlave =
  | { tipo: 'llave_cerca'; t: number; distanciaM: number }
  /** `distanciaM` es `null` cuando se perdió la señal. */
  | { tipo: 'llave_lejos'; t: number; distanciaM: number | null }
  | { tipo: 'llave_no_encontrada'; t: number }
  | { tipo: 'separacion'; t: number; tLejos: number; distanciaM: number | null };

export interface TelemetriaLlave {
  estado: EstadoLlave;
  /** Distancia estimada con la mediana reciente; `null` sin lecturas en la ventana. */
  distanciaM: number | null;
  /** Mediana del RSSI en la ventana (dBm). */
  rssi: number | null;
  /** ms desde la última lectura; `null` si nunca llegó una. */
  msSinSenal: number | null;
}

export class VigilanteLlave {
  private estadoActual: EstadoLlave = 'buscando';
  private readonly lecturas: VentanaTemporal<number>;
  private ultimaLectura: number | null = null;
  private tInicio: number | null = null;
  private tLejos: number | null = null;
  private avisoSinLlaveDado = false;
  private ultimoT: number | null = null;

  constructor(
    private readonly config: ConfigLlave,
    private readonly rssiA1m: number = RSSI_A_1M_POR_DEFECTO,
  ) {
    this.lecturas = new VentanaTemporal<number>(config.ventanaMs);
  }

  get estado(): EstadoLlave {
    return this.estadoActual;
  }

  procesar(l: LecturaLlave): EventoLlave[] {
    if (!Number.isFinite(l.rssi)) return this.revisar(l.t);
    this.lecturas.agregar(l.t, l.rssi);
    this.ultimaLectura = l.t;
    const eventos: EventoLlave[] = [];
    const d = this.distanciaEn(l.t);
    if (d !== null && this.estadoActual !== 'separada') {
      const cerca = d <= this.config.distanciaMaxM;
      if (cerca && this.estadoActual !== 'cerca') {
        // Desde `buscando` la encontramos; desde `lejos` volvió a tiempo.
        if (this.estadoActual === 'lejos') eventos.push({ tipo: 'llave_cerca', t: l.t, distanciaM: d });
        this.estadoActual = 'cerca';
        this.tLejos = null;
      } else if (!cerca && this.estadoActual === 'cerca') {
        this.estadoActual = 'lejos';
        this.tLejos = l.t;
        eventos.push({ tipo: 'llave_lejos', t: l.t, distanciaM: d });
      }
    }
    return [...eventos, ...this.revisar(l.t)];
  }

  /**
   * Revisa los plazos (sin señal, tiempo lejos). Hay que llamarlo seguido aunque no lleguen lecturas de la
   * llave (en la app, con cada lote de sensores): justo cuando se la llevan, dejan de llegar.
   */
  revisar(t: number): EventoLlave[] {
    this.ultimoT = t;
    if (this.tInicio === null) this.tInicio = t;
    const eventos: EventoLlave[] = [];
    if (this.estadoActual === 'buscando') {
      if (!this.avisoSinLlaveDado && t - this.tInicio >= this.config.avisoSinLlaveMs) {
        this.avisoSinLlaveDado = true;
        eventos.push({ tipo: 'llave_no_encontrada', t });
      }
      return eventos;
    }
    if (this.estadoActual === 'cerca' && this.ultimaLectura !== null && t - this.ultimaLectura > this.config.sinSenalMs) {
      this.estadoActual = 'lejos';
      // El plazo se cuenta desde que venció la señal, no desde que alguien llamó a `revisar`.
      this.tLejos = this.ultimaLectura + this.config.sinSenalMs;
      eventos.push({ tipo: 'llave_lejos', t, distanciaM: null });
    }
    if (this.estadoActual === 'lejos' && this.tLejos !== null && t - this.tLejos >= this.config.sostenidoMs) {
      this.estadoActual = 'separada';
      eventos.push({ tipo: 'separacion', t, tLejos: this.tLejos, distanciaM: this.distanciaEn(t) });
    }
    return eventos;
  }

  /** Vuelve a `buscando`: hasta ver la llave cerca otra vez, no alerta. */
  reiniciar(): void {
    this.estadoActual = 'buscando';
    this.lecturas.vaciar();
    this.ultimaLectura = null;
    this.tInicio = null;
    this.tLejos = null;
    this.avisoSinLlaveDado = false;
  }

  obtenerTelemetria(): TelemetriaLlave {
    const t = this.ultimoT;
    const rssi = t === null ? null : this.rssiEn(t);
    return {
      estado: this.estadoActual,
      distanciaM: rssi === null ? null : distanciaDesdeRssi(rssi, this.rssiA1m, this.config.exponente),
      rssi,
      msSinSenal: t === null || this.ultimaLectura === null ? null : Math.max(0, t - this.ultimaLectura),
    };
  }

  private rssiEn(t: number): number | null {
    return mediana(this.lecturas.entre(t - this.config.ventanaMs, t).map((x) => x.dato));
  }

  private distanciaEn(t: number): number | null {
    const rssi = this.rssiEn(t);
    return rssi === null ? null : distanciaDesdeRssi(rssi, this.rssiA1m, this.config.exponente);
  }
}
