import { CONFIG_POR_DEFECTO, type ConfigDetector } from './config';
import { FiltroGravedad } from './filtro-gravedad';
import { distanciaM } from './geo';
import { G, autocorrelacionMaxima, desviacion, mediana, norma, VentanaTemporal } from './matematica';
import type {
  EstadoDetector,
  EventoDetector,
  LecturaGps,
  MotivoDescarte,
  MuestraImu,
  PosicionSimple,
  Telemetria,
  Vec3,
} from './tipos';

interface PuntoGps {
  lat: number;
  lon: number;
  /** Velocidad reportada o, si falta, calculada con la lectura anterior. */
  velocidad: number | null;
  precision: number | null;
  valida: boolean;
}

interface Pico {
  linealG: number;
  giro: number | null;
}

interface JalonEnCurso {
  t: number;
  picoAceleracionG: number;
  picoGiroRadS: number | null;
  posicion: PosicionSimple | null;
  lecturasRapidas: number;
  huboGpsValido: boolean;
  ultimaVelocidad: number | null;
  /** Ya hubo al menos una lectura de huida (rápida o con desplazamiento). */
  huidaVista: boolean;
  /** Momento en que el celular quedó quieto; se confirma con el GPS antes de descartar. */
  quietoPendiente: number | null;
  /** El GPS mostró movimiento (más que caminar) después del jalón. */
  movimientoVisto: boolean;
}

/**
 * Detector de arrebato desde una moto.
 *
 * Máquina de estados (ver docs/PLAN.md §3):
 *
 *   reposo ──(pico de aceleración + giro, y antes íbamos a pie)──▶ posible_jalon
 *   posible_jalon ──(velocidad de vehículo o desplazamiento por GPS)──▶ alerta
 *   posible_jalon ──(sin GPS: movimiento fuerte y sin ritmo de pasos)──▶ alerta (confianza media)
 *   posible_jalon ──(quedó quieto / no hubo huida / ritmo de pasos)──▶ reposo
 *   alerta ──(el dueño cancela)──▶ reposo
 *
 * No usa el reloj del sistema: todo depende del `t` de las muestras, así que una grabación
 * se reproduce exactamente igual en una prueba, en la terminal o en el celular.
 */
export class DetectorArrebato {
  readonly config: ConfigDetector;
  private estadoActual: EstadoDetector = 'reposo';
  private readonly filtro = new FiltroGravedad();
  private readonly picos: VentanaTemporal<Pico>;
  /** Magnitud total del acelerómetro (en g), para quietud, energía y ritmo de pasos. */
  private readonly magnitudes: VentanaTemporal<number>;
  private readonly gps: VentanaTemporal<PuntoGps>;
  private jalon: JalonEnCurso | null = null;
  private tInicio: number | null = null;
  private tUltimoDescarte = -Infinity;
  private tActual = -Infinity;
  private ultimoGpsValido: { t: number; punto: PuntoGps } | null = null;
  /** Última vez que vimos 2 lecturas GPS seguidas con velocidad de vehículo. */
  private tUltimoVehiculo = -Infinity;
  private lecturasVehiculoSeguidas = 0;
  private telemetria: Telemetria = {
    t: 0,
    estado: 'reposo',
    aceleracionLinealG: 0,
    giroRadS: null,
    velocidadMs: null,
    precisionGpsM: null,
  };

  constructor(config: Partial<ConfigDetector> = {}) {
    this.config = { ...CONFIG_POR_DEFECTO, ...config };
    this.picos = new VentanaTemporal(this.config.ventanaJalonMs);
    this.magnitudes = new VentanaTemporal(this.config.ventanaConfirmacionMs + 2000);
    this.gps = new VentanaTemporal(this.config.ventanaPreviaMs + this.config.ventanaConfirmacionMs + 5000);
  }

  get estado(): EstadoDetector {
    return this.estadoActual;
  }

  obtenerTelemetria(): Telemetria {
    return { ...this.telemetria, estado: this.estadoActual };
  }

  /** Procesa una muestra del acelerómetro (+ giroscopio). Devuelve los eventos que provocó. */
  procesarImu(m: MuestraImu): EventoDetector[] {
    const eventos: EventoDetector[] = [];
    if (this.tInicio === null) this.tInicio = m.t;
    this.tActual = Math.max(this.tActual, m.t);

    const aceleracion: Vec3 = [m.ax, m.ay, m.az];
    const giro: Vec3 | null = m.gx === null || m.gy === null || m.gz === null ? null : [m.gx, m.gy, m.gz];
    const lineal = this.filtro.actualizar(m.t, aceleracion, giro);
    const linealG = norma(lineal) / G;
    const giroMag = giro ? norma(giro) : null;

    this.picos.agregar(m.t, { linealG, giro: giroMag });
    this.magnitudes.agregar(m.t, norma(aceleracion) / G);
    this.telemetria = { ...this.telemetria, t: m.t, aceleracionLinealG: linealG, giroRadS: giroMag };

    this.revisarTiempo(m.t, eventos);

    if (this.estadoActual === 'reposo') {
      this.buscarJalon(m.t, eventos);
    } else if (this.estadoActual === 'posible_jalon') {
      this.reanclarJalon(m.t, eventos);
      this.revisarQuietud(m.t, eventos);
    }
    return eventos;
  }

  /** Procesa una lectura del GPS. Devuelve los eventos que provocó. */
  procesarGps(l: LecturaGps): EventoDetector[] {
    const eventos: EventoDetector[] = [];
    this.tActual = Math.max(this.tActual, l.t);

    const valida = l.precision === null || l.precision <= this.config.precisionGpsMaxM;
    let velocidad = l.velocidad !== null && l.velocidad >= 0 && Number.isFinite(l.velocidad) ? l.velocidad : null;
    if (velocidad === null && valida) velocidad = this.velocidadDerivada(l);

    const punto: PuntoGps = { lat: l.lat, lon: l.lon, velocidad, precision: l.precision, valida };
    this.gps.agregar(l.t, punto);
    if (valida) this.ultimoGpsValido = { t: l.t, punto };
    if (valida && velocidad !== null) {
      this.lecturasVehiculoSeguidas = velocidad >= this.config.velocidadVehiculoMs ? this.lecturasVehiculoSeguidas + 1 : 0;
      // Durante un posible jalón no actualizamos el historial: esa velocidad puede ser la del ladrón.
      if (this.lecturasVehiculoSeguidas >= 2 && this.estadoActual === 'reposo') this.tUltimoVehiculo = l.t;
    }
    this.telemetria = { ...this.telemetria, velocidadMs: velocidad, precisionGpsM: l.precision };

    this.revisarTiempo(l.t, eventos);

    const jalon = this.jalon;
    if (this.estadoActual === 'posible_jalon' && jalon && valida && l.t > jalon.t) {
      jalon.huboGpsValido = true;
      jalon.ultimaVelocidad = velocidad;
      const posicion: PosicionSimple = { t: l.t, lat: l.lat, lon: l.lon, precision: l.precision };
      if (!jalon.posicion) jalon.posicion = posicion;

      if (velocidad !== null) {
        jalon.lecturasRapidas = velocidad >= this.config.velocidadHuidaMs ? jalon.lecturasRapidas + 1 : 0;
      }

      const desplazamiento = distanciaM(jalon.posicion.lat, jalon.posicion.lon, l.lat, l.lon);
      // El desplazamiento solo cuenta si es claramente mayor que el error de las dos lecturas.
      const errorConjunto = (jalon.posicion.precision ?? 10) + (l.precision ?? 10);
      // Y la velocidad promedio desde el jalón también debe ser de huida (40 m en 10 s también se hacen en bici).
      const segundos = Math.max(1, (l.t - jalon.posicion.t) / 1000);
      const seMovio =
        desplazamiento >= this.config.desplazamientoHuidaM &&
        desplazamiento > errorConjunto &&
        desplazamiento / segundos >= this.config.velocidadHuidaMs;

      if (jalon.lecturasRapidas > 0 || seMovio) jalon.huidaVista = true;
      const limite = this.config.huidaInmediataMs;
      if (jalon.huidaVista || (velocidad ?? 0) >= this.config.velocidadPeatonMaxMs) jalon.movimientoVisto = true;
      if (limite !== null && !jalon.huidaVista && l.t - jalon.t > limite) {
        this.descartar(l.t, 'arranque_gradual', eventos);
      } else if (jalon.lecturasRapidas >= this.config.lecturasHuidaMin) {
        this.alertar(l.t, 'velocidad_gps', posicion, eventos);
      } else if (seMovio) {
        this.alertar(l.t, 'desplazamiento_gps', posicion, eventos);
      }
    }
    return eventos;
  }

  /** Avanza el reloj sin datos nuevos (por ejemplo, si el GPS dejó de responder). */
  avanzarTiempo(t: number): EventoDetector[] {
    const eventos: EventoDetector[] = [];
    this.tActual = Math.max(this.tActual, t);
    this.revisarTiempo(t, eventos);
    return eventos;
  }

  /** El dueño cancela la alerta (falsa alarma) o el posible jalón. */
  cancelar(t: number = this.tActual): EventoDetector[] {
    if (this.estadoActual === 'reposo') return [];
    const eventos: EventoDetector[] = [];
    this.descartar(t, 'cancelado', eventos);
    return eventos;
  }

  /** Olvida todo (por ejemplo, al desactivar la protección). */
  reiniciar(): void {
    this.estadoActual = 'reposo';
    this.filtro.reiniciar();
    this.picos.vaciar();
    this.magnitudes.vaciar();
    this.gps.vaciar();
    this.jalon = null;
    this.tInicio = null;
    this.tUltimoDescarte = -Infinity;
    this.tActual = -Infinity;
    this.ultimoGpsValido = null;
    this.tUltimoVehiculo = -Infinity;
    this.lecturasVehiculoSeguidas = 0;
  }

  // ---------------------------------------------------------------------------

  /** ¿Hay un pico de jalón (aceleración + giro) en la ventana de los últimos 0,5 s (y después de `desde`)? */
  private medirPico(desde = -Infinity): { maxLineal: number; maxGiro: number | null } | null {
    const c = this.config;
    let maxLineal = 0;
    let maxGiro = 0;
    let hayGiro = false;
    for (const { dato } of this.picos.entre(desde)) {
      if (dato.linealG > maxLineal) maxLineal = dato.linealG;
      if (dato.giro !== null) {
        hayGiro = true;
        if (dato.giro > maxGiro) maxGiro = dato.giro;
      }
    }
    const hayPico = hayGiro
      ? maxLineal >= c.umbralJalonG && maxGiro >= c.umbralGiroRadS
      : maxLineal >= c.umbralJalonSinGiroG;
    return hayPico ? { maxLineal, maxGiro: hayGiro ? maxGiro : null } : null;
  }

  /** Solo el GPS puede decir si ya íbamos en un vehículo (ver comentario en buscarJalon). */
  private yaEnVehiculo(t: number): { si: boolean; velocidadPrevia: number | null } {
    const c = this.config;
    const velocidadPrevia = this.velocidadPrevia(t);
    const vehiculoReciente = t - this.tUltimoVehiculo < c.historialVehiculoMs;
    return { si: (velocidadPrevia !== null && velocidadPrevia >= c.velocidadPeatonMaxMs) || vehiculoReciente, velocidadPrevia };
  }

  /**
   * Caminando hay picos "falsos" cada ~30 s (datos reales de SHL). Si llega un pico nuevo mientras
   * esperamos la huida de uno anterior, la cuenta se reinicia desde el nuevo: si no, el arranchón
   * verdadero quedaría tapado por el pico viejo y su plazo vencería.
   */
  private reanclarJalon(t: number, eventos: EventoDetector[]): void {
    const jalon = this.jalon;
    if (!this.config.reanclarJalon || !jalon || jalon.huidaVista || jalon.movimientoVisto) return;
    if (t - jalon.t <= this.config.ventanaJalonMs) return;
    // Solo cuenta un pico NUEVO: el del jalón actual todavía puede estar dentro de la ventana.
    const pico = this.medirPico(jalon.t + this.config.ventanaJalonMs);
    if (!pico || this.yaEnVehiculo(t).si) return;
    const previo = this.ultimoGpsValido;
    jalon.t = t;
    jalon.picoAceleracionG = pico.maxLineal;
    jalon.picoGiroRadS = pico.maxGiro;
    jalon.lecturasRapidas = 0;
    jalon.quietoPendiente = null;
    jalon.movimientoVisto = false;
    if (previo && t - previo.t <= 5000) {
      jalon.posicion = { t: previo.t, lat: previo.punto.lat, lon: previo.punto.lon, precision: previo.punto.precision };
    }
    eventos.push({ tipo: 'posible_jalon', t, picoAceleracionG: pico.maxLineal, picoGiroRadS: pico.maxGiro, velocidadPreviaMs: null });
  }

  private buscarJalon(t: number, eventos: EventoDetector[]): void {
    const c = this.config;
    if (this.tInicio === null || t - this.tInicio < c.calentamientoMs) return;
    if (t - this.tUltimoDescarte < c.refractarioMs) return;

    const pico = this.medirPico();
    if (!pico) return;
    const maxLineal = pico.maxLineal;
    const hayGiro = pico.maxGiro !== null;
    const maxGiro = pico.maxGiro ?? 0;

    // Solo el GPS puede decir si ya íbamos en un vehículo. Con datos reales (dataset SPU), la mano
    // de alguien parado se mueve tanto como la vibración de un vehículo: el acelerómetro no los separa.
    const { si: enVehiculo, velocidadPrevia } = this.yaEnVehiculo(t);
    if (enVehiculo) {
      this.tUltimoDescarte = t;
      eventos.push({ tipo: 'descartado', t, motivo: 'ya_en_vehiculo', tJalon: t });
      return;
    }

    const previo = this.ultimoGpsValido;
    this.jalon = {
      t,
      picoAceleracionG: maxLineal,
      picoGiroRadS: hayGiro ? maxGiro : null,
      posicion:
        previo && t - previo.t <= 5000
          ? { t: previo.t, lat: previo.punto.lat, lon: previo.punto.lon, precision: previo.punto.precision }
          : null,
      lecturasRapidas: 0,
      huboGpsValido: false,
      ultimaVelocidad: null,
      huidaVista: false,
      quietoPendiente: null,
      movimientoVisto: false,
    };
    this.estadoActual = 'posible_jalon';
    eventos.push({
      tipo: 'posible_jalon',
      t,
      picoAceleracionG: maxLineal,
      picoGiroRadS: hayGiro ? maxGiro : null,
      velocidadPreviaMs: velocidadPrevia,
    });
  }

  /**
   * El celular no dio velocidad: la calculamos con una posición de hace 2 a 6 s.
   * Es conservadora: le restamos el error de las dos lecturas, para que el "temblor" del GPS
   * de alguien parado no parezca movimiento.
   */
  private velocidadDerivada(l: LecturaGps): number | null {
    let base: { t: number; dato: PuntoGps } | null = null;
    for (const e of this.gps.entre(l.t - 6000, l.t - 2000)) {
      if (e.dato.valida) {
        base = e;
        break;
      }
    }
    if (!base) return null;
    const distancia = distanciaM(base.dato.lat, base.dato.lon, l.lat, l.lon);
    const error = ((base.dato.precision ?? 10) + (l.precision ?? 10)) / 2;
    return Math.max(0, distancia - error) / ((l.t - base.t) / 1000);
  }

  /** Autocorrelación en desfases de 0,3 a 0,75 s (lo que dura un paso). */
  private ritmo(muestras: Array<{ t: number; dato: number }>): number {
    if (muestras.length < 2) return 0;
    const primera = muestras[0]!;
    const ultima = muestras[muestras.length - 1]!;
    const dtMs = (ultima.t - primera.t) / Math.max(1, muestras.length - 1);
    return autocorrelacionMaxima(
      muestras.map((e) => e.dato),
      Math.round(300 / dtMs),
      Math.round(750 / dtMs),
    );
  }

  /** Mediana de la velocidad GPS válida en los segundos previos al pico. */
  private velocidadPrevia(t: number): number | null {
    const velocidades: number[] = [];
    for (const { dato } of this.gps.entre(t - this.config.ventanaPreviaMs, t)) {
      if (dato.valida && dato.velocidad !== null) velocidades.push(dato.velocidad);
    }
    return mediana(velocidades);
  }

  private revisarQuietud(t: number, eventos: EventoDetector[]): void {
    const jalon = this.jalon;
    if (!jalon) return;
    const c = this.config;
    const desde = t - c.quietudDuracionMs;
    if (desde < jalon.t + c.quietudInicioMs || t > jalon.t + c.quietudHastaMs) return;
    const valores = this.magnitudes.entre(desde, t).map((e) => e.dato);
    if (valores.length < 10) return;
    if (jalon.quietoPendiente !== null || desviacion(valores) >= c.quietudDesviacionG) return;
    // Quieto. Pero dentro de un auto o bus el celular en la mano también se ve quieto (datos reales
    // de SHL): si el GPS ya muestra movimiento, no descartamos. Si no hay GPS después del jalón,
    // esperamos la próxima lectura (o, sin GPS, descartamos al rato en revisarTiempo).
    if (jalon.huidaVista || jalon.movimientoVisto) return;
    jalon.quietoPendiente = t;
  }

  private revisarTiempo(t: number, eventos: EventoDetector[]): void {
    const jalon = this.jalon;
    if (this.estadoActual !== 'posible_jalon' || !jalon) return;
    // Quedó quieto y en 4 s el GPS no mostró ningún movimiento: era una caída o lo dejaron en la mesa.
    if (jalon.quietoPendiente !== null && !jalon.movimientoVisto && t - jalon.quietoPendiente > this.config.quietudConfirmacionMs) {
      this.descartar(t, 'quieto_despues', eventos);
      return;
    }
    if (t - jalon.t < this.config.ventanaConfirmacionMs) return;

    if (jalon.huboGpsValido || !this.config.alertaSoloSensores) {
      this.descartar(t, 'sin_huida', eventos);
      return;
    }

    // Sin GPS: decidimos solo con el acelerómetro.
    const muestras = this.magnitudes.entre(jalon.t + 1000, t);
    const valores = muestras.map((e) => e.dato);
    if (valores.length < 50 || desviacion(valores) < this.config.energiaHuidaMinG) {
      this.descartar(t, 'sin_huida', eventos);
      return;
    }
    const energiaCorrer = this.config.energiaCorrerMinG;
    const corriendo = energiaCorrer !== null && desviacion(valores) >= energiaCorrer;
    if (!corriendo && this.ritmo(muestras) >= this.config.umbralRitmoPasos) {
      this.descartar(t, 'ritmo_de_pasos', eventos);
      return;
    }
    this.alertar(t, 'solo_sensores', null, eventos);
  }

  private alertar(
    t: number,
    via: 'velocidad_gps' | 'desplazamiento_gps' | 'solo_sensores',
    ultimaPosicion: PosicionSimple | null,
    eventos: EventoDetector[],
  ): void {
    const jalon = this.jalon;
    if (!jalon) return;
    this.estadoActual = 'alerta';
    eventos.push({
      tipo: 'alerta',
      t,
      tJalon: jalon.t,
      via,
      confianza: via === 'solo_sensores' ? 'media' : 'alta',
      velocidadMs: jalon.ultimaVelocidad,
      posicionJalon: jalon.posicion,
      ultimaPosicion,
      picoAceleracionG: jalon.picoAceleracionG,
      picoGiroRadS: jalon.picoGiroRadS,
    });
  }

  private descartar(t: number, motivo: MotivoDescarte, eventos: EventoDetector[]): void {
    eventos.push({ tipo: 'descartado', t, motivo, tJalon: this.jalon?.t ?? null });
    this.estadoActual = 'reposo';
    this.jalon = null;
    this.tUltimoDescarte = t;
  }
}
