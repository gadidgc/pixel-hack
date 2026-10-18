import {
  CONFIG_DEMO,
  CONFIG_POR_DEFECTO,
  DetectorArrebato,
  type EventoDetector,
  type LecturaGps,
  type MuestraImu,
  type Telemetria,
} from '@pixel-hack/detector';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform } from 'react-native';
import { enviar, hayBackend, type ResultadoEnvio } from './alertas';
import { Grabadora, type Etiqueta } from './grabadora';
import { hayPin, verificarPin } from './pin';
import { escucharSensores, pedirPermisoSensores } from './sensores';
import { escucharUbicacion, pedirPermisosUbicacion } from './ubicacion';

/**
 * El servicio de protección. Vive FUERA de la pantalla (es un único objeto para toda la app) porque
 * tiene que seguir funcionando con la app en segundo plano: los sensores (modules/sensores-fondo) y el GPS
 * (tarea de expo-location) lo alimentan aunque la pantalla esté apagada. La pantalla solo lo observa.
 */

/** Segundos que esperamos antes de avisar a la familia, para que el dueño pueda cancelar con su PIN. */
export const ESPERA_FAMILIA_S = 10;
const ETIQUETA_PANTALLA = 'proteccion';

export interface Registro {
  id: number;
  t: number;
  texto: string;
  tipo: 'info' | 'aviso' | 'alerta' | 'error';
}

export type EstadoFamilia = 'esperando' | 'enviando' | 'avisada' | 'no_avisada' | 'cancelada';

export interface AlertaEnCurso {
  evento: Extract<EventoDetector, { tipo: 'alerta' }>;
  /** Resultado del envío al panel; `null` mientras se envía. */
  panel: ResultadoEnvio | null;
  familia: EstadoFamilia;
  detalleFamilia: string;
  segundosParaFamilia: number;
}

export interface EstadoProteccion {
  activa: boolean;
  /** `true`: sigue con la pantalla apagada. `false`: solo con la app abierta (web o Expo Go). */
  segundoPlano: boolean | null;
  modoDemo: boolean;
  telemetria: Telemetria | null;
  tieneGiroscopio: boolean | null;
  tieneGps: boolean | null;
  alerta: AlertaEnCurso | null;
  registros: Registro[];
  grabando: boolean;
  filasGrabadas: number;
}

export function describirEvento(e: EventoDetector): string {
  switch (e.tipo) {
    case 'posible_jalon':
      return `Posible jalón: ${e.picoAceleracionG.toFixed(1)} g, giro ${e.picoGiroRadS?.toFixed(1) ?? '—'} rad/s`;
    case 'descartado':
      return `Descartado: ${e.motivo.replace(/_/g, ' ')}`;
    case 'alerta':
      return `ALERTA (${e.via.replace(/_/g, ' ')}, confianza ${e.confianza}) a ${((e.t - e.tJalon) / 1000).toFixed(1)} s del jalón`;
  }
}

class ServicioProteccion {
  private estado: EstadoProteccion = {
    activa: false,
    segundoPlano: null,
    modoDemo: false,
    telemetria: null,
    tieneGiroscopio: null,
    tieneGps: null,
    alerta: null,
    registros: [],
    grabando: false,
    filasGrabadas: 0,
  };
  private readonly oyentes = new Set<(e: EstadoProteccion) => void>();
  private detector = new DetectorArrebato(CONFIG_POR_DEFECTO);
  private readonly grabadora = new Grabadora();
  private detenerTodo: Array<() => void | Promise<void>> = [];
  private contador = 0;
  private pantallaPrendida = false;
  /** Lecturas GPS de los últimos 60 s: la ruta que acompaña a la alerta. */
  private ruta: LecturaGps[] = [];
  private cuentaFamilia: ReturnType<typeof setInterval> | null = null;

  obtener(): EstadoProteccion {
    return this.estado;
  }

  suscribir(oyente: (e: EstadoProteccion) => void): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  private cambiar(cambios: Partial<EstadoProteccion>): void {
    this.estado = { ...this.estado, ...cambios };
    for (const o of this.oyentes) o(this.estado);
  }

  registrar(texto: string, tipo: Registro['tipo'] = 'info'): void {
    const r: Registro = { id: ++this.contador, t: Date.now(), texto, tipo };
    this.cambiar({ registros: [r, ...this.estado.registros].slice(0, 40) });
  }

  // --- Activar y desactivar -------------------------------------------------------------------------

  /**
   * Pide TODOS los permisos que hacen falta. En iPhone y Android exigimos la ubicación "Permitir siempre":
   * sin ella el sistema cierra la app en segundo plano y la protección no serviría cuando la usas de verdad.
   * Debe llamarse directo desde el toque del botón (requisito de iPhone en la web).
   */
  async activar(): Promise<void> {
    if (this.estado.activa) return;
    try {
      if (!(await hayPin())) {
        this.registrar('Primero crea tu PIN: lo necesitarás para cancelar una alerta o apagar la protección.', 'error');
        return;
      }
      if (!(await pedirPermisoSensores())) {
        this.registrar('Sin permiso de movimiento (o este dispositivo no tiene sensores). En la laptop usa "Simular".', 'error');
        return;
      }
      const permisos = await pedirPermisosUbicacion();
      if (!permisos.primerPlano) {
        this.registrar('Sin permiso de ubicación no podemos confirmar el robo ni mandar la ruta. Actívalo en los ajustes.', 'error');
        return;
      }
      if (Platform.OS !== 'web' && !permisos.segundoPlano) {
        this.registrar(
          'Falta la ubicación "Permitir siempre" (Ajustes > Apps > Alerta Arrebato > Ubicación). Sin ella la protección se apaga al salir de la app.',
          'error',
        );
        return;
      }

      const sensores = await escucharSensores((m) => this.alImu(m));
      this.detenerTodo.push(sensores.detener);
      this.detenerTodo.push(await escucharUbicacion((l) => this.alGps(l)));

      // Sin segundo plano (web o Expo Go), al menos la pantalla no se apaga sola.
      if (!sensores.segundoPlano) {
        this.pantallaPrendida = await activateKeepAwakeAsync(ETIQUETA_PANTALLA).then(
          () => true,
          () => false,
        );
      }
      const reloj = setInterval(() => {
        this.cambiar({ telemetria: this.detector.obtenerTelemetria(), filasGrabadas: this.grabadora.cantidad });
      }, 250);
      this.detenerTodo.push(() => clearInterval(reloj));

      this.cambiar({ activa: true, segundoPlano: sensores.segundoPlano, tieneGiroscopio: sensores.tieneGiroscopio, tieneGps: null });
      this.registrar(
        sensores.segundoPlano
          ? 'Protección activa, también con la pantalla apagada.'
          : 'Protección activa SOLO con la app abierta (web o Expo Go: compila la app para segundo plano).',
        sensores.segundoPlano ? 'info' : 'aviso',
      );
      if (!sensores.tieneGiroscopio) this.registrar('Este celular no tiene giroscopio: pedimos un jalón más fuerte.', 'aviso');
    } catch (e) {
      await this.apagar();
      this.registrar(e instanceof Error ? e.message : 'No se pudo activar la protección.', 'error');
    }
  }

  /** Apagar la protección exige el PIN: el ladrón no debe poder hacerlo. */
  async desactivar(pin: string): Promise<boolean> {
    if (!(await verificarPin(pin))) {
      this.registrar('PIN incorrecto: la protección sigue activa.', 'error');
      return false;
    }
    if (this.estado.alerta && this.detector.estado === 'alerta') await this.cancelarAlerta(pin);
    await this.apagar();
    this.registrar('Protección desactivada.');
    return true;
  }

  private async apagar(): Promise<void> {
    const pendientes = this.detenerTodo;
    this.detenerTodo = [];
    for (const f of pendientes) await f();
    this.detenerCuentaFamilia();
    this.detector.reiniciar();
    if (this.pantallaPrendida) {
      this.pantallaPrendida = false;
      Promise.resolve(deactivateKeepAwake(ETIQUETA_PANTALLA)).catch(() => undefined);
    }
    this.cambiar({ activa: false, telemetria: null, segundoPlano: null });
  }

  // --- Alerta ------------------------------------------------------------------------------------------

  /** Cancelar una alerta (falsa alarma) exige el PIN. */
  async cancelarAlerta(pin: string): Promise<boolean> {
    if (!(await verificarPin(pin))) {
      this.registrar('PIN incorrecto: la alerta sigue.', 'error');
      return false;
    }
    const alerta = this.estado.alerta;
    this.detenerCuentaFamilia();
    const eventos = this.detector.cancelar();
    // Solo avisamos "cancelada" si algo ya salió del celular.
    if (alerta && (alerta.panel?.enviado || alerta.familia === 'avisada')) {
      for (const e of eventos) void enviar({ tipo: 'cancelada', evento: e });
    }
    this.cambiar({ alerta: null });
    this.registrar(
      alerta?.familia === 'avisada'
        ? 'Falsa alarma: cancelada con tu PIN. Tu familia ya había sido avisada; le mandamos que fue falsa alarma.'
        : 'Falsa alarma: cancelada con tu PIN antes de avisar a tu familia.',
    );
    return true;
  }

  private iniciarAlerta(evento: Extract<EventoDetector, { tipo: 'alerta' }>): void {
    this.cambiar({
      alerta: { evento, panel: null, familia: 'esperando', detalleFamilia: '', segundosParaFamilia: ESPERA_FAMILIA_S },
    });
    // 1) Al panel, al instante y en silencio, con la ruta de los últimos segundos.
    void enviar({ tipo: 'alerta', evento, ruta: [...this.ruta] }).then((panel) => {
      if (this.estado.alerta?.evento !== evento) return;
      this.cambiar({ alerta: { ...this.estado.alerta, panel } });
      this.registrar(`Panel: ${panel.detalle}`, panel.enviado ? 'info' : 'aviso');
    });
    // 2) A la familia, después de la espera, si el dueño no canceló con su PIN.
    this.detenerCuentaFamilia();
    this.cuentaFamilia = setInterval(() => {
      const a = this.estado.alerta;
      if (!a || a.evento !== evento || a.familia !== 'esperando') return this.detenerCuentaFamilia();
      if (a.segundosParaFamilia > 1) {
        this.cambiar({ alerta: { ...a, segundosParaFamilia: a.segundosParaFamilia - 1 } });
        return;
      }
      this.detenerCuentaFamilia();
      this.cambiar({ alerta: { ...a, segundosParaFamilia: 0, familia: 'enviando' } });
      void enviar({ tipo: 'notificar_familia', evento }).then((r) => {
        const actual = this.estado.alerta;
        if (actual?.evento !== evento) return;
        this.cambiar({ alerta: { ...actual, familia: r.enviado ? 'avisada' : 'no_avisada', detalleFamilia: r.detalle } });
        this.registrar(`Familia: ${r.enviado ? 'avisada' : `NO avisada (${r.detalle})`}`, r.enviado ? 'info' : 'error');
      });
    }, 1000);
  }

  private detenerCuentaFamilia(): void {
    if (this.cuentaFamilia) clearInterval(this.cuentaFamilia);
    this.cuentaFamilia = null;
  }

  // --- Datos -------------------------------------------------------------------------------------------

  private atender(eventos: EventoDetector[]): void {
    for (const e of eventos) {
      // Los descartes son muchos (caminando hay picos cada pocos segundos): solo los registramos.
      this.registrar(describirEvento(e), e.tipo === 'alerta' ? 'alerta' : e.tipo === 'posible_jalon' ? 'aviso' : 'info');
      if (e.tipo === 'alerta') this.iniciarAlerta(e);
    }
  }

  private alImu(m: MuestraImu): void {
    this.grabadora.agregar({ tipo: 'imu', muestra: m });
    this.atender(this.detector.procesarImu(m));
  }

  private alGps(l: LecturaGps): void {
    this.grabadora.agregar({ tipo: 'gps', lectura: l });
    this.ruta = [...this.ruta.filter((x) => l.t - x.t <= 60_000), l];
    // Durante una alerta mandamos la ruta de huida en vivo (1 lectura por segundo, solo en ese momento).
    if (this.detector.estado === 'alerta' && hayBackend()) void enviar({ tipo: 'ubicacion', lectura: l });
    this.atender(this.detector.procesarGps(l));
    if (!this.estado.tieneGps) this.cambiar({ tieneGps: true });
  }

  // --- Otros -------------------------------------------------------------------------------------------

  cambiarModoDemo(modoDemo: boolean): void {
    this.detector = new DetectorArrebato(modoDemo ? CONFIG_DEMO : CONFIG_POR_DEFECTO);
    this.detenerCuentaFamilia();
    this.cambiar({ modoDemo, alerta: null });
    this.registrar(modoDemo ? 'Modo demo: la huida corriendo cuenta.' : 'Modo normal: solo huida en vehículo.');
  }

  empezarGrabacion(etiqueta: Etiqueta): void {
    this.grabadora.empezar(etiqueta);
    this.cambiar({ grabando: true, filasGrabadas: 0 });
  }

  async detenerGrabacion(): Promise<void> {
    this.grabadora.detener();
    this.cambiar({ grabando: false, filasGrabadas: this.grabadora.cantidad });
    try {
      this.registrar(`Grabación guardada: ${await this.grabadora.exportar()}`);
    } catch (e) {
      this.registrar(`No se pudo exportar: ${e instanceof Error ? e.message : 'error'}`, 'error');
    }
  }
}

export const servicio = new ServicioProteccion();
