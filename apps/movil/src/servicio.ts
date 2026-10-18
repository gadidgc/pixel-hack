import {
  CONFIG_POR_DEFECTO,
  ESPACIOS_DEMO,
  configDemo,
  distanciaDemoPorDefecto,
  DetectorArrebato,
  reproducir,
  simular,
  type ConfigDetector,
  type EspacioDemo,
  type EventoDetector,
  type DiagnosticoDescarte,
  type LecturaGps,
  type MuestraImu,
  type Telemetria,
} from '@pixel-hack/detector';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Platform, Vibration } from 'react-native';
import { enviar, hayBackend, type ResultadoEnvio } from './alertas';
import { bloquearAlDetectar, mostrarSobreBloqueo, ocultarSobreBloqueo, quitarBloqueoApps, type ResultadoBloqueo } from './bloqueo';
import { Grabadora, type Etiqueta } from './grabadora';
import { avisarTodoBien, pedirPermisoNotificaciones, quitarAviso } from './notificaciones';
import { borrarPin, hayPin, verificarPin } from './pin';
import { borrarPreferencias, guardarPreferencias, perfilParaEnviar, preferencias, type Contacto } from './preferencias';
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
  /** Orden del sistema, independiente del envío al panel y del PIN de la app. */
  bloqueo: ResultadoBloqueo | null;
  /** El "¿Todo bien?" se muestra encima de la pantalla de bloqueo: se cancela sin desbloquear Android. */
  sobreBloqueo: boolean;
  /** Resultado del envío al panel; `null` mientras se envía. */
  panel: ResultadoEnvio | null;
  familia: EstadoFamilia;
  detalleFamilia: string;
  segundosParaFamilia: number;
  /** La secuencia del robo, para la pantalla "Fue falsa alarma" (components/LineaDeTiempo). */
  pasos: PasoAlerta[];
  tFamilia: number | null;
  /** Enlace público de la alerta (lo que recibe la red); `null` si no llegó al backend. */
  enlace: string | null;
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
  /** Dónde se hace la demo: cambia cuánto hay que correr y si se usa el GPS (solo con el modo demo). */
  espacioDemo: EspacioDemo;
  /** Cuántos metros hay que correr en la demo (con GPS). Cambia al elegir otro espacio. */
  distanciaDemoM: number;
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

/** "GPS 6 (4 válidas, ±12 m) · máx 1.8 m/s · 7 m · energía 0.42 g": para saber por qué no hubo alerta. */
export function describirDiagnostico(d: DiagnosticoDescarte): string {
  const precision = d.mejorPrecisionM !== null ? `, ±${Math.round(d.mejorPrecisionM)} m` : '';
  const gps = `GPS ${d.lecturasGps} (${d.lecturasGpsValidas} válidas${precision})`;
  const velocidad = d.maxVelocidadMs !== null ? ` · máx ${d.maxVelocidadMs.toFixed(1)} m/s` : ' · sin velocidad';
  const metros = d.maxDesplazamientoM !== null ? ` · ${Math.round(d.maxDesplazamientoM)} m` : '';
  const energia = d.energiaG !== null ? ` · energía ${d.energiaG.toFixed(2)} g` : '';
  return gps + velocidad + metros + energia;
}

export function describirEvento(e: EventoDetector): string {
  switch (e.tipo) {
    case 'posible_jalon':
      return `Posible jalón: ${e.picoAceleracionG.toFixed(1)} g, giro ${e.picoGiroRadS?.toFixed(1) ?? '—'} rad/s`;
    case 'descartado':
      return `Descartado: ${e.motivo.replace(/_/g, ' ')}${e.diagnostico ? ` · ${describirDiagnostico(e.diagnostico)}` : ''}`;
    case 'alerta':
      return `Alerta (${e.via.replace(/_/g, ' ')}, confianza ${e.confianza}) a ${((e.t - e.tJalon) / 1000).toFixed(1)} s del jalón`;
  }
}

/** Segundos extra para avisar a la red cuando el dueño tiene que desbloquear Android antes de cancelar. */
export const SEGUNDOS_EXTRA_DESBLOQUEO = 15;
/** PIN incorrectos seguidos antes de hacer esperar, y cuánto (crece con cada intento de más). */
const INTENTOS_PIN = 5;
const ESPERA_PIN_MS = 30_000;
/**
 * Vibración del "¿Todo bien?": pausa, vibra, pausa (ms), y se repite hasta que el dueño responde o se avisa a la red.
 * En iPhone la duración de cada vibración la fija el sistema (~0,4 s); solo cuentan las pausas.
 */
const PATRON_VIBRACION_TODO_BIEN = [0, 700, 500];

class ServicioProteccion {
  private estado: EstadoProteccion = {
    activa: false,
    segundoPlano: null,
    activaDesde: null,
    pausadaHasta: null,
    permisosFaltantes: [],
    modoDemo: false,
    espacioDemo: 'calle',
    distanciaDemoM: distanciaDemoPorDefecto('calle'),
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
  /** La activación en curso (ver `activar`). */
  private activando: Promise<boolean> | null = null;
  private contador = 0;
  private pantallaPrendida = false;
  /** Lecturas GPS de los últimos 60 s: la ruta que acompaña a la alerta. */
  private ruta: LecturaGps[] = [];
  private cuentaFamilia: ReturnType<typeof setInterval> | null = null;
  private cuentaPendiente: {
    evento: Extract<EventoDetector, { tipo: 'alerta' }>;
    nombre: string;
    contactos: Contacto[];
    limite: number;
    /** iPhone con Atajos: el mismo número de la `alerta`, para repetir el SMS de bloqueo al vencer. */
    numeroPropio: string;
  } | null = null;
  private ultimaRevisionCuenta = 0;
  private idNotificacion: string | null = null;
  private ensayo: { hora: number; plantilla: Extract<EventoDetector, { tipo: 'alerta' }> } | null = null;
  private envioAlerta: Promise<ResultadoEnvio> | null = null;
  private pinFallidos = 0;
  private pinEsperarHasta = 0;

  obtener(): EstadoProteccion {
    return this.estado;
  }

  suscribir(oyente: (e: EstadoProteccion) => void): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  private cambiar(cambios: Partial<EstadoProteccion>): void {
    const antes = this.estado.alerta;
    this.estado = { ...this.estado, ...cambios };
    // Terminó la alerta: la app deja de verse sobre la pantalla de bloqueo y vuelve la de Android.
    if (antes?.sobreBloqueo && !this.estado.alerta) ocultarSobreBloqueo();
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

  /**
   * Debe llamarse directo desde el toque del botón (requisito de iPhone en la web). Si ya se está activando
   * (por ejemplo, al reabrir la app y tocar "Activar" a la vez), devuelve la misma promesa: así nunca quedan
   * dos suscripciones a los sensores.
   */
  activar(): Promise<boolean> {
    this.activando ??= this.activarUnaVez().finally(() => {
      this.activando = null;
    });
    return this.activando;
  }

  private async activarUnaVez(): Promise<boolean> {
    if (this.estado.activa) return true;
    // Lo que faltó en un intento anterior ya no vale: si este falla por otra razón, no hay que repetirlo.
    this.cambiar({ permisosFaltantes: [] });
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
        // `grabando` también: la grabadora se detiene sola al llegar a su máximo de filas.
        this.cambiar({ telemetria: this.detector.obtenerTelemetria(), filasGrabadas: this.grabadora.cantidad, grabando: this.grabadora.grabando });
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
      void guardarPreferencias({ proteccionActiva: true });
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

  /**
   * Al abrir la app: si la protección estaba encendida (el sistema cerró y reabrió la app, por ejemplo iPhone
   * después de quedarse sin memoria), la vuelve a encender sin pedir nada (los permisos ya están dados).
   */
  async reanudarSiEstabaActiva(): Promise<void> {
    if (this.estado.activa || !preferencias().proteccionActiva) return;
    if (await this.activar()) this.registrar('La app se reabrió: volvimos a encender la protección.');
  }

  /** Apagar la protección exige el PIN. */
  async desactivar(pin: string): Promise<boolean> {
    if (!(await verificarPin(pin))) {
      this.registrar('PIN incorrecto: la protección sigue activa.', 'error');
      return false;
    }
    if (this.estado.alerta && this.detector.estado === 'alerta') await this.cancelarAlerta(pin);
    await this.apagar();
    void guardarPreferencias({ proteccionActiva: false });
    this.registrar('Protección desactivada.');
    return true;
  }

  /**
   * Herramientas del equipo: apaga la protección y borra todo lo guardado (red, nombre, PIN) para ver la
   * bienvenida otra vez. Pide el PIN como apagar: si no, el ladrón podría usarlo para quitar la protección.
   * Los permisos del sistema no se pueden quitar desde la app: siguen dados.
   */
  async borrarTodo(pin: string): Promise<boolean> {
    if ((await hayPin()) && !(await verificarPin(pin))) {
      this.registrar('PIN incorrecto: no se borró nada.', 'error');
      return false;
    }
    if (this.estado.alerta && this.detector.estado === 'alerta') await this.cancelarAlerta(pin);
    await this.apagar();
    await borrarPin();
    await borrarPreferencias();
    this.registrar('Se borró todo: la app vuelve a la bienvenida.');
    return true;
  }

  private async apagar(): Promise<void> {
    const pendientes = this.detenerTodo;
    this.detenerTodo = [];
    for (const f of pendientes) {
      try {
        await f();
      } catch (e) {
        // Si un sensor no se deja apagar, igual apagamos el resto (y el reloj de 250 ms).
        console.warn('No se pudo detener una parte de la protección', e);
      }
    }
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
    if (this.mensajePin()) return false;
    if (!(await verificarPin(pin))) {
      this.pinFallidos++;
      if (this.pinFallidos >= INTENTOS_PIN) {
        // Sobre la pantalla de bloqueo cualquiera puede probar PINs: frenamos el adivinar por fuerza bruta.
        this.pinEsperarHasta = Date.now() + ESPERA_PIN_MS * (this.pinFallidos - INTENTOS_PIN + 1);
      }
      this.registrar('PIN incorrecto: la alerta sigue.', 'error');
      return false;
    }
    this.pinFallidos = 0;
    this.pinEsperarHasta = 0;
    const alerta = this.estado.alerta;
    this.detenerCuentaFamilia();
    void quitarAviso(this.idNotificacion);
    this.detector.cancelar();
    // iPhone: fue falsa alarma, las demás apps vuelven (en Android no hace nada: lo quita la clave del sistema).
    quitarBloqueoApps();
    // El backend cuenta por su lado y avisa a la red si no le llega "cancelada". Se manda SIEMPRE que haya
    // backend (también en un ensayo, donde el detector no tiene alerta, y aunque el envío de la alerta siga
    // en camino): esperamos a que llegue la alerta para que "cancelada" no llegue antes que ella.
    if (alerta && hayBackend()) {
      const evento = alerta.evento;
      void (this.envioAlerta ?? Promise.resolve()).finally(() => void enviar({ tipo: 'cancelada', evento }));
    }
    this.cambiar({ alerta: null });
    this.registrar(
      alerta?.familia === 'avisada'
        ? 'Falsa alarma: cancelada con tu PIN. Tu red ya había sido avisada; le mandamos que estás bien.'
        : 'Falsa alarma: cancelada con tu PIN antes de avisar a tu red.',
    );
    return true;
  }

  /**
   * iPhone: destapa las demás apps cuando ya no hay alerta (recuperaste el celular, o tras "Probar bloqueo").
   * Exige el PIN: el ladrón no debe poder quitarlo.
   */
  async desbloquearApps(pin: string): Promise<boolean> {
    if (this.mensajePin()) return false;
    if (!(await verificarPin(pin))) {
      this.pinFallidos++;
      if (this.pinFallidos >= INTENTOS_PIN) this.pinEsperarHasta = Date.now() + ESPERA_PIN_MS * (this.pinFallidos - INTENTOS_PIN + 1);
      this.registrar('PIN incorrecto: las apps siguen bloqueadas.', 'error');
      return false;
    }
    this.pinFallidos = 0;
    this.pinEsperarHasta = 0;
    quitarBloqueoApps();
    this.registrar('Apps del iPhone desbloqueadas con tu PIN.');
    return true;
  }

  /** Si hubo demasiados PIN incorrectos, cuánto falta para poder intentar de nuevo; si no, `null`. */
  mensajePin(): string | null {
    const faltan = Math.ceil((this.pinEsperarHasta - Date.now()) / 1000);
    return faltan > 0 ? `Demasiados intentos. Espera ${faltan} s para volver a intentar.` : null;
  }

  /** Motivo opcional de una falsa alarma ("Iba en auto", "Se me cayó"…): nos ayuda a mejorar el detector. */
  enviarMotivo(motivo: string): void {
    if (hayBackend()) void enviar({ tipo: 'motivo_falsa_alarma', motivo });
    this.registrar(`Motivo de la falsa alarma: ${motivo}.`);
  }

  private iniciarAlerta(evento: Extract<EventoDetector, { tipo: 'alerta' }>): void {
    const elegida = preferencias().esperaFamiliaS;
    // Los intentos de PIN cuentan por alerta: errores de otros días no deben dejar a la dueña sin poder cancelar.
    this.pinFallidos = 0;
    this.pinEsperarHasta = 0;
    const conVelocidad = evento.velocidadMs !== null ? ` y luego ${Math.round(evento.velocidadMs * 3.6)} km/h` : '';

    // 0) Bloqueo de Android, lo primero: si el celular estaba desbloqueado en la mano, cada segundo cuenta.
    // Es síncrono y no espera al servidor ni a la cuenta para avisar a la familia.
    const bloqueo = bloquearAlDetectar();
    // Con el celular bloqueado, el "¿Todo bien?" se abre ENCIMA de la pantalla de bloqueo (como un
    // despertador): el dueño cancela con el PIN de la app sin tener que desbloquear Android primero.
    const sobreBloqueo = bloqueo.estado === 'solicitado' && mostrarSobreBloqueo(elegida);
    // Respaldo: si Android no deja la pregunta sobre el bloqueo, el dueño tiene que desbloquear Android
    // antes de escribir el PIN. Le damos 15 s más para que una falsa alarma no avise a su familia.
    // iPhone con el SMS de Atajos: la pantalla se bloquea en segundos y también hay que desbloquear para cancelar.
    const numeroPropio = Platform.OS === 'ios' && hayBackend() ? preferencias().numeroPropio : '';
    // Un solo SMS de bloqueo por alerta (Zavu deja 1 por minuto al mismo número): al detectar o al llegar a 0.
    const bloqueoAl = preferencias().bloqueoIphoneAl;
    const bloqueaAlDetectar = Boolean(numeroPropio) && bloqueoAl === 'detectar';
    const extra = (bloqueo.estado === 'solicitado' && !sobreBloqueo) || bloqueaAlDetectar ? SEGUNDOS_EXTRA_DESBLOQUEO : 0;
    const espera = elegida + extra;

    this.cambiar({
      alerta: {
        evento,
        bloqueo,
        sobreBloqueo,
        panel: null,
        familia: 'esperando',
        detalleFamilia: '',
        segundosParaFamilia: espera,
        tFamilia: null,
        enlace: null,
        pasos: [
          { t: Date.now(), texto: 'Te preguntamos "¿Todo bien?"', clave: false },
          { t: evento.tJalon, texto: `Movimiento brusco${conVelocidad}`, clave: false },
        ],
      },
    });
    this.registrar(`Bloqueo de pantalla: ${bloqueo.detalle}`, bloqueo.estado === 'solicitado' ? 'info' : 'aviso');
    if (bloqueo.estado === 'solicitado' && !sobreBloqueo) {
      this.registrar(`${Platform.OS === 'ios' ? 'iPhone' : 'Android'} no deja mostrar el "¿Todo bien?" sobre la pantalla de bloqueo: para cancelar hay que desbloquear. Esperamos ${extra} s más antes de avisar.`, 'aviso');
    }
    // Sobre la pantalla de bloqueo ya va nuestro aviso de pantalla completa; no repetimos la notificación.
    if (!sobreBloqueo) void avisarTodoBien(espera).then((id) => (this.idNotificacion = id));

    // 1) Al panel, al instante y en silencio, con la ruta de los últimos segundos.
    const { nombre, contactos, bloqueo: perfil } = preferencias();
    // Con `numeroPropio` y `bloqueoAl: 'detectar'`, el backend le manda al instante el SMS que bloquea el iPhone
    // (Atajos), sin esperar la cuenta. Con `'vencer'` solo lo guarda para mandarlo al llegar a 0.
    this.envioAlerta = enviar({
      tipo: 'alerta',
      evento,
      ruta: [...this.ruta],
      nombre,
      contactos,
      esperaS: espera,
      bloqueo: perfilParaEnviar(perfil),
      ...(numeroPropio ? { numeroPropio, bloqueoAl } : {}),
    });
    if (bloqueaAlDetectar) this.registrar('iPhone: pedimos el SMS que bloquea la pantalla con tu automatización de Atajos.');
    else if (numeroPropio) this.registrar('iPhone: el SMS que bloquea la pantalla saldrá si la cuenta llega a 0 sin tu PIN.');
    void this.envioAlerta.then((panel) => {
      if (this.estado.alerta?.evento !== evento) return;
      this.cambiar({ alerta: { ...this.estado.alerta, panel, enlace: panel.enlace ?? this.estado.alerta.enlace } });
      this.registrar(`Panel: ${panel.detalle}`, panel.enviado ? 'info' : 'aviso');
    });

    // 2) A la red, después de la espera, si el dueño no canceló con su PIN. La cuenta va por hora límite
    // (no restando de a 1) y se revisa desde el reloj Y desde cada lote de sensores: en Android, con la
    // pantalla apagada, los setInterval de JS se congelan pero los sensores (servicio en primer plano) siguen.
    // El backend también cuenta por su lado (`esperaS`): si el ladrón apaga el celular, avisa igual.
    this.detenerCuentaFamilia();
    // El celular vibra (sin sonido) mientras dura la pregunta, para que el dueño se entere aunque lo tenga
    // en el bolsillo y alcance a cancelar si fue falsa alarma. Va DESPUÉS de `detenerCuentaFamilia`, que
    // la apaga: así la vibración dura lo mismo que la cuenta.
    Vibration.vibrate(PATRON_VIBRACION_TODO_BIEN, true);
    // Al vencer solo se pide el SMS si no salió ya al detectar.
    this.cuentaPendiente = { evento, nombre, contactos, limite: Date.now() + espera * 1000, numeroPropio: bloqueaAlDetectar ? '' : numeroPropio };
    this.cuentaFamilia = setInterval(() => this.revisarCuentaFamilia(), 1000);
  }

  private revisarCuentaFamilia(): void {
    const p = this.cuentaPendiente;
    const a = this.estado.alerta;
    if (!p || !a || a.evento !== p.evento || a.familia !== 'esperando') return this.detenerCuentaFamilia();
    const faltan = Math.ceil((p.limite - Date.now()) / 1000);
    if (faltan > 0) {
      if (faltan !== a.segundosParaFamilia) this.cambiar({ alerta: { ...a, segundosParaFamilia: faltan } });
      return;
    }
    this.detenerCuentaFamilia();
    const { evento, nombre, contactos, numeroPropio } = p;
    this.cambiar({ alerta: { ...a, segundosParaFamilia: 0, familia: 'enviando' } });
    // iPhone con Atajos y `bloqueoAl: 'vencer'`: venció el "¿Todo bien?" sin PIN, así que pedimos el SMS que bloquea la pantalla.
    if (numeroPropio) this.registrar('iPhone: venció la espera; pedimos el SMS que bloquea la pantalla.');
    void enviar({
      tipo: 'notificar_familia',
      evento,
      nombre,
      contactos,
      bloqueo: perfilParaEnviar(preferencias().bloqueo),
      ...(numeroPropio ? { numeroPropio } : {}),
    }).then((r) => {
      const actual = this.estado.alerta;
      if (actual?.evento !== evento) return;
      const quienes = contactos.map((c) => c.nombre).join(', ') || 'tu red';
      this.cambiar({
        alerta: {
          ...actual,
          familia: r.enviado ? 'avisada' : 'no_avisada',
          detalleFamilia: r.detalle,
          tFamilia: Date.now(),
          enlace: r.enlace ?? actual.enlace,
          pasos: [
            { t: Date.now(), texto: r.enviado ? `Alerta enviada a ${quienes}` : `No se pudo avisar a ${quienes}: ${r.detalle}`, clave: true },
            ...actual.pasos,
          ],
        },
      });
      this.registrar(`Red: ${r.enviado ? 'avisada' : `NO avisada (${r.detalle})`}`, r.enviado ? 'info' : 'error');
    });
  }

  private detenerCuentaFamilia(): void {
    Vibration.cancel();
    if (this.cuentaFamilia) clearInterval(this.cuentaFamilia);
    this.cuentaFamilia = null;
    this.cuentaPendiente = null;
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
    const r = reproducir(sim.entradas, this.configDetector());
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

  /**
   * Guía de Atajos (iPhone): manda ya el SMS de bloqueo a tu número, para comprobar que la automatización
   * bloquea la pantalla. Guarda el número si llegó el SMS.
   */
  async probarBloqueoPorMensaje(numeroPropio: string): Promise<ResultadoEnvio> {
    const envio = await enviar({ tipo: 'probar_bloqueo', numeroPropio });
    if (envio.enviado) await guardarPreferencias({ numeroPropio });
    this.registrar(
      envio.enviado ? 'SMS de bloqueo enviado a tu número: tu iPhone debería bloquearse en unos segundos.' : `No se pudo mandar el SMS de bloqueo: ${envio.detalle}`,
      envio.enviado ? 'info' : 'aviso',
    );
    return envio;
  }

  /**
   * Ensayo de la alerta COMPLETA para el equipo y la demo (sin moto): en `retrasoS` segundos dispara una
   * alerta real con un arrebato simulado: bloquea Android, muestra el "¿Todo bien?" sobre el bloqueo,
   * avisa al panel y, si nadie cancela con el PIN, a la red. El retraso deja tiempo para ir a otra app o
   * apagar la pantalla y probar que la pregunta aparece igual.
   */
  ensayarAlertaCompleta(retrasoS: number): boolean {
    if (!this.estado.activa || this.estado.alerta) return false;
    const r = reproducir(simular('arrebato_moto', 1).entradas, CONFIG_POR_DEFECTO);
    if (!r.alerta) return false;
    const plantilla = r.alerta;
    this.registrar(`Ensayo: alerta completa en ${retrasoS} s (bloquea de verdad y avisa si no cancelas).`, 'aviso');
    this.ensayo = { hora: Date.now() + retrasoS * 1000, plantilla };
    // Con la app en segundo plano los temporizadores de JS se congelan: también se revisa con cada lote
    // de sensores (alImu), igual que la cuenta para avisar a la familia.
    setTimeout(() => this.revisarEnsayo(), retrasoS * 1000);
    return true;
  }

  private revisarEnsayo(): void {
    const e = this.ensayo;
    if (!e || Date.now() < e.hora) return;
    this.ensayo = null;
    if (!this.estado.activa || this.estado.alerta) return;
    const t = Date.now();
    this.atender([{ ...e.plantilla, t, tJalon: t - (e.plantilla.t - e.plantilla.tJalon) }]);
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
    // Con la pantalla apagada en Android, esto es lo único que sigue latiendo (ver revisarCuentaFamilia).
    if (this.cuentaPendiente && Date.now() - this.ultimaRevisionCuenta >= 250) {
      this.ultimaRevisionCuenta = Date.now();
      this.revisarCuentaFamilia();
    }
    this.grabadora.agregar({ tipo: 'imu', muestra: m });
    if (this.ensayo) this.revisarEnsayo();
    if (this.enPausa()) return;
    this.atender(this.detector.procesarImu(m));
  }

  private alGps(l: LecturaGps): void {
    this.grabadora.agregar({ tipo: 'gps', lectura: l });
    this.ruta = [...this.ruta.filter((x) => l.t - x.t <= 60_000), l];
    // Durante una alerta mandamos la ruta de huida en vivo (1 lectura por segundo, solo en ese momento).
    if ((this.detector.estado === 'alerta' || this.estado.alerta) && hayBackend()) void enviar({ tipo: 'ubicacion', lectura: l });
    if (!this.estado.tieneGps) this.cambiar({ tieneGps: true });
    if (this.enPausa()) return;
    this.atender(this.detector.procesarGps(l));
  }

  /** La ruta de los últimos 60 s (para mostrar en la app lo que ve la red). */
  rutaReciente(): LecturaGps[] {
    return [...this.ruta];
  }

  /** Última posición conocida (para "Grabar evidencia"). */
  ultimaPosicion(): LecturaGps | null {
    return this.ruta[this.ruta.length - 1] ?? null;
  }

  // --- Herramientas del equipo -------------------------------------------------------------------------

  /** Los umbrales que usa ahora el detector (normal, o demo según el espacio elegido). */
  configDetector(): ConfigDetector {
    return this.estado.modoDemo ? configDemo(this.estado.espacioDemo, this.estado.distanciaDemoM) : CONFIG_POR_DEFECTO;
  }

  cambiarModoDemo(modoDemo: boolean): void {
    if (this.alertaEnCurso()) return;
    this.cambiar({ modoDemo, alerta: null });
    this.reiniciarDetector();
    this.registrar(modoDemo ? `Modo demo: la huida corriendo cuenta (${this.describirEspacioDemo()}).` : 'Modo normal: solo huida en vehículo.');
  }

  /** "Sala chica, 4 m" o "Solo sensores" (sin GPS la distancia no cuenta). */
  describirEspacioDemo(): string {
    const { espacioDemo, distanciaDemoM } = this.estado;
    return `${ESPACIOS_DEMO[espacioDemo].titulo}${configDemo(espacioDemo).usarGps ? `, ${distanciaDemoM} m` : ''}`;
  }

  cambiarEspacioDemo(espacioDemo: EspacioDemo): void {
    if (this.alertaEnCurso()) return;
    this.cambiar({ espacioDemo, distanciaDemoM: distanciaDemoPorDefecto(espacioDemo) });
    this.reiniciarDetector();
    this.registrar(`Espacio de la demo: ${this.describirEspacioDemo()}.`);
  }

  cambiarDistanciaDemo(distanciaDemoM: number): void {
    if (distanciaDemoM === this.estado.distanciaDemoM || this.alertaEnCurso()) return;
    this.cambiar({ distanciaDemoM });
    this.reiniciarDetector();
    this.registrar(`Distancia de huida en la demo: ${distanciaDemoM} m.`);
  }

  /**
   * Cambiar el ajuste reinicia el detector y corta la cuenta para avisar a la red: mientras esa cuenta
   * corre, eso dejaría el "¿Todo bien?" colgado y la red sin aviso. Con la alerta ya resuelta sí se puede.
   */
  private alertaEnCurso(): boolean {
    if (!this.cuentaPendiente && this.estado.alerta?.familia !== 'esperando') return false;
    this.registrar('Hay una alerta en curso: cambia el ajuste de la demo cuando termine.', 'aviso');
    return true;
  }

  private reiniciarDetector(): void {
    this.detector = new DetectorArrebato(this.configDetector());
    this.detenerCuentaFamilia();
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
