import {
  CONFIG_DEMO,
  CONFIG_POR_DEFECTO,
  DetectorArrebato,
  reproducir,
  simular,
  type EventoDetector,
  type LecturaGps,
  type MuestraImu,
  type Telemetria,
} from '@pixel-hack/detector';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform } from 'react-native';
import { enviar, hayBackend, type ResultadoEnvio } from './alertas';
import { Grabadora, type Etiqueta } from './grabadora';
import { avisarTodoBien, pedirPermisoNotificaciones, quitarAviso } from './notificaciones';
import { hayPin, verificarPin } from './pin';
import { preferencias } from './preferencias';
import { escucharSensores, pedirPermisoSensores } from './sensores';
import { escucharUbicacion, pedirPermisosUbicacion } from './ubicacion';

/**
 * El servicio de protección. Vive FUERA de la pantalla (es un único objeto para toda la app) porque
 * tiene que seguir funcionando con la app en segundo plano: los sensores (modules/sensores-fondo) y el GPS
 * (tarea de expo-location) lo alimentan aunque la pantalla esté apagada. La pantalla solo lo observa.
 */

const ETIQUETA_PANTALLA = 'proteccion';

export interface Registro {
  id: number;
  t: number;
  texto: string;
  tipo: 'info' | 'aviso' | 'alerta' | 'error';
}

export type EstadoFamilia = 'esperando' | 'enviando' | 'avisada' | 'no_avisada' | 'cancelada';

export interface PasoAlerta {
  t: number;
  texto: string;
  clave: boolean;
}

export interface AlertaEnCurso {
  evento: Extract<EventoDetector, { tipo: 'alerta' }>;
  /** Resultado del envío al panel; `null` mientras se envía. */
  panel: ResultadoEnvio | null;
  familia: EstadoFamilia;
  detalleFamilia: string;
  segundosParaFamilia: number;
  /** La secuencia del robo, para la pantalla "Fue falsa alarma" (components/LineaDeTiempo). */
  pasos: PasoAlerta[];
  tFamilia: number | null;
}

export interface EstadoProteccion {
  activa: boolean;
  /** `true`: sigue con la pantalla apagada. `false`: solo con la app abierta (web o Expo Go). */
  segundoPlano: boolean | null;
  /** Desde cuándo está activa (época ms). */
  activaDesde: number | null;
  /** Hasta cuándo está en pausa (época ms). `null` si no está en pausa. */
  pausadaHasta: number | null;
  /** Permisos que faltaron al activar (modo limitado). */
  permisosFaltantes: string[];
  modoDemo: boolean;
  telemetria: Telemetria | null;
  tieneGiroscopio: boolean | null;
  tieneGps: boolean | null;
  alerta: AlertaEnCurso | null;
  registros: Registro[];
  grabando: boolean;
  filasGrabadas: number;
}

export interface ResultadoPrueba {
  jalonS: number | null;
  huidaS: number | null;
  envio: ResultadoEnvio;
}

export function describirEvento(e: EventoDetector): string {
  switch (e.tipo) {
    case 'posible_jalon':
      return `Posible jalón: ${e.picoAceleracionG.toFixed(1)} g, giro ${e.picoGiroRadS?.toFixed(1) ?? '—'} rad/s`;
    case 'descartado':
      return `Descartado: ${e.motivo.replace(/_/g, ' ')}`;
    case 'alerta':
      return `Alerta (${e.via.replace(/_/g, ' ')}, confianza ${e.confianza}) a ${((e.t - e.tJalon) / 1000).toFixed(1)} s del jalón`;
  }
}

class ServicioProteccion {
  private estado: EstadoProteccion = {
    activa: false,
    segundoPlano: null,
    activaDesde: null,
    pausadaHasta: null,
    permisosFaltantes: [],
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
  private idNotificacion: string | null = null;

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

  // --- Permisos ----------------------------------------------------------------------------------------

  /**
   * Pide todos los permisos (pantalla "Permisos explicados"). Devuelve los que faltan.
   * En iPhone y Android exigimos la ubicación "Permitir siempre": sin ella el sistema cierra la app en
   * segundo plano y la protección no serviría cuando la usas de verdad.
   */
  async pedirPermisos(): Promise<string[]> {
    const faltan: string[] = [];
    if (!(await pedirPermisoSensores())) faltan.push('movimiento');
    const ubicacion = await pedirPermisosUbicacion();
    if (!ubicacion.primerPlano) faltan.push('ubicación');
    else if (Platform.OS !== 'web' && !ubicacion.segundoPlano) faltan.push('ubicación "Permitir siempre"');
    if (Platform.OS !== 'web' && !(await pedirPermisoNotificaciones())) faltan.push('notificaciones');
    return faltan;
  }

  // --- Activar, pausar y desactivar --------------------------------------------------------------------

  /** Debe llamarse directo desde el toque del botón (requisito de iPhone en la web). */
  async activar(): Promise<boolean> {
    if (this.estado.activa) return true;
    try {
      if (!(await hayPin())) {
        this.registrar('Primero crea tu PIN: lo necesitarás para cancelar una alerta o apagar la protección.', 'error');
        return false;
      }
      const faltan = await this.pedirPermisos();
      if (faltan.includes('movimiento') || faltan.includes('ubicación') || faltan.some((f) => f.startsWith('ubicación "'))) {
        this.cambiar({ permisosFaltantes: faltan });
        this.registrar(`Faltan permisos: ${faltan.join(', ')}. Sin ellos la protección se apagaría al usar otra app o bloquear la pantalla.`, 'error');
        return false;
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
        const pausa = this.estado.pausadaHasta;
        if (pausa !== null && Date.now() >= pausa) {
          this.cambiar({ pausadaHasta: null });
          this.registrar('Terminó la pausa: estás protegida otra vez.');
        }
        this.cambiar({ telemetria: this.detector.obtenerTelemetria(), filasGrabadas: this.grabadora.cantidad });
      }, 250);
      this.detenerTodo.push(() => clearInterval(reloj));

      this.cambiar({
        activa: true,
        activaDesde: Date.now(),
        pausadaHasta: null,
        permisosFaltantes: faltan,
        segundoPlano: sensores.segundoPlano,
        tieneGiroscopio: sensores.tieneGiroscopio,
        tieneGps: null,
      });
      this.registrar(
        sensores.segundoPlano ? 'Protección activa, también con la pantalla apagada.' : 'Protección activa SOLO con la app abierta (web o Expo Go).',
        sensores.segundoPlano ? 'info' : 'aviso',
      );
      if (!sensores.tieneGiroscopio) this.registrar('Este celular no tiene giroscopio: pedimos un jalón más fuerte.', 'aviso');
      return true;
    } catch (e) {
      await this.apagar();
      this.registrar(e instanceof Error ? e.message : 'No se pudo activar la protección.', 'error');
      return false;
    }
  }

  /**
   * Pausar exige el PIN (quien te robe el celular no debe poder pausarla). Mientras dura la pausa los
   * sensores siguen encendidos pero no se evalúan: así la app no se duerme y vuelve sola.
   */
  async pausar(minutos: number, pin: string): Promise<boolean> {
    if (!(await verificarPin(pin))) {
      this.registrar('PIN incorrecto: la protección sigue activa.', 'error');
      return false;
    }
    this.detector.reiniciar();
    this.cambiar({ pausadaHasta: Date.now() + minutos * 60_000 });
    this.registrar(`Protección en pausa por ${minutos} min. Vuelve sola.`);
    return true;
  }

  reanudar(): void {
    this.cambiar({ pausadaHasta: null });
    this.registrar('Protección reanudada.');
  }

  /** Apagar la protección exige el PIN. */
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
    this.cambiar({ activa: false, activaDesde: null, pausadaHasta: null, telemetria: null, segundoPlano: null });
  }

  // --- Alerta ------------------------------------------------------------------------------------------

  /**
   * "Estoy bien" / "Fue falsa alarma": exige el PIN. Si la red ya fue avisada, le mandamos que fue
   * falsa alarma.
   */
  async cancelarAlerta(pin: string): Promise<boolean> {
    if (!(await verificarPin(pin))) {
      this.registrar('PIN incorrecto: la alerta sigue.', 'error');
      return false;
    }
    const alerta = this.estado.alerta;
    this.detenerCuentaFamilia();
    void quitarAviso(this.idNotificacion);
    const eventos = this.detector.cancelar();
    if (alerta && (alerta.panel?.enviado || alerta.familia === 'avisada')) {
      for (const e of eventos) void enviar({ tipo: 'cancelada', evento: e });
    }
    this.cambiar({ alerta: null });
    this.registrar(
      alerta?.familia === 'avisada'
        ? 'Falsa alarma: cancelada con tu PIN. Tu red ya había sido avisada; le mandamos que estás bien.'
        : 'Falsa alarma: cancelada con tu PIN antes de avisar a tu red.',
    );
    return true;
  }

  /** Motivo opcional de una falsa alarma ("Iba en auto", "Se me cayó"…): nos ayuda a mejorar el detector. */
  enviarMotivo(motivo: string): void {
    if (hayBackend()) void enviar({ tipo: 'motivo_falsa_alarma', motivo });
    this.registrar(`Motivo de la falsa alarma: ${motivo}.`);
  }

  private iniciarAlerta(evento: Extract<EventoDetector, { tipo: 'alerta' }>): void {
    const espera = preferencias().esperaFamiliaS;
    const conVelocidad = evento.velocidadMs !== null ? ` y luego ${Math.round(evento.velocidadMs * 3.6)} km/h` : '';
    this.cambiar({
      alerta: {
        evento,
        panel: null,
        familia: 'esperando',
        detalleFamilia: '',
        segundosParaFamilia: espera,
        tFamilia: null,
        pasos: [
          { t: Date.now(), texto: 'Te preguntamos "¿Todo bien?"', clave: false },
          { t: evento.tJalon, texto: `Movimiento brusco${conVelocidad}`, clave: false },
        ],
      },
    });
    void avisarTodoBien(espera).then((id) => (this.idNotificacion = id));

    // 1) Al panel, al instante y en silencio, con la ruta de los últimos segundos.
    const { nombre, contactos } = preferencias();
    void enviar({ tipo: 'alerta', evento, ruta: [...this.ruta], nombre, contactos }).then((panel) => {
      if (this.estado.alerta?.evento !== evento) return;
      this.cambiar({ alerta: { ...this.estado.alerta, panel } });
      this.registrar(`Panel: ${panel.detalle}`, panel.enviado ? 'info' : 'aviso');
    });

    // 2) A la red, después de la espera, si el dueño no canceló con su PIN.
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
      void enviar({ tipo: 'notificar_familia', evento, nombre, contactos }).then((r) => {
        const actual = this.estado.alerta;
        if (actual?.evento !== evento) return;
        const quienes = contactos.map((c) => c.nombre).join(', ') || 'tu red';
        this.cambiar({
          alerta: {
            ...actual,
            familia: r.enviado ? 'avisada' : 'no_avisada',
            detalleFamilia: r.detalle,
            tFamilia: Date.now(),
            pasos: [
              { t: Date.now(), texto: r.enviado ? `Alerta enviada a ${quienes}` : `No se pudo avisar a ${quienes} (${r.detalle})`, clave: true },
              ...actual.pasos,
            ],
          },
        });
        this.registrar(`Red: ${r.enviado ? 'avisada' : `NO avisada (${r.detalle})`}`, r.enviado ? 'info' : 'error');
      });
    }, 1000);
  }

  private detenerCuentaFamilia(): void {
    if (this.cuentaFamilia) clearInterval(this.cuentaFamilia);
    this.cuentaFamilia = null;
  }

  /** Cierra la pantalla de una alerta ya terminada (avisada o no) sin cancelarla. */
  descartarPantallaAlerta(): void {
    if (this.estado.alerta && this.estado.alerta.familia !== 'esperando') this.cambiar({ alerta: null });
  }

  // --- Prueba guiada -----------------------------------------------------------------------------------

  /**
   * "Probemos una vez": pasa un arrebato grabado (simulado) por el MISMO detector y manda un mensaje de
   * PRUEBA a la red, para que sepa cómo se verá.
   */
  async probar(): Promise<ResultadoPrueba> {
    const sim = simular('arrebato_moto', 1 + Math.floor(Math.random() * 500));
    const r = reproducir(sim.entradas, this.estado.modoDemo ? CONFIG_DEMO : CONFIG_POR_DEFECTO);
    const jalon = r.eventos.find((e) => e.tipo === 'posible_jalon');
    const base = sim.tJalon ?? 0;
    const { nombre, contactos } = preferencias();
    const envio = await enviar({ tipo: 'prueba', nombre, contactos });
    this.registrar(`Prueba: ${r.alerta ? 'alerta detectada' : 'sin alerta'}; mensaje de prueba ${envio.enviado ? 'enviado' : `no enviado (${envio.detalle})`}.`);
    return {
      jalonS: jalon ? Math.max(0, (jalon.t - base) / 1000) : null,
      huidaS: r.alerta ? (r.alerta.t - base) / 1000 : null,
      envio,
    };
  }

  // --- Datos -------------------------------------------------------------------------------------------

  private atender(eventos: EventoDetector[]): void {
    for (const e of eventos) {
      this.registrar(describirEvento(e), e.tipo === 'alerta' ? 'alerta' : e.tipo === 'posible_jalon' ? 'aviso' : 'info');
      if (e.tipo === 'alerta') this.iniciarAlerta(e);
    }
  }

  private enPausa(): boolean {
    const p = this.estado.pausadaHasta;
    return p !== null && Date.now() < p;
  }

  private alImu(m: MuestraImu): void {
    this.grabadora.agregar({ tipo: 'imu', muestra: m });
    if (this.enPausa()) return;
    this.atender(this.detector.procesarImu(m));
  }

  private alGps(l: LecturaGps): void {
    this.grabadora.agregar({ tipo: 'gps', lectura: l });
    this.ruta = [...this.ruta.filter((x) => l.t - x.t <= 60_000), l];
    // Durante una alerta mandamos la ruta de huida en vivo (1 lectura por segundo, solo en ese momento).
    if (this.detector.estado === 'alerta' && hayBackend()) void enviar({ tipo: 'ubicacion', lectura: l });
    if (!this.estado.tieneGps) this.cambiar({ tieneGps: true });
    if (this.enPausa()) return;
    this.atender(this.detector.procesarGps(l));
  }

  /** Última posición conocida (para "Grabar evidencia"). */
  ultimaPosicion(): LecturaGps | null {
    return this.ruta[this.ruta.length - 1] ?? null;
  }

  // --- Herramientas del equipo -------------------------------------------------------------------------

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
