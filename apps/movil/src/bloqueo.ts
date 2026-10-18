import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

/**
 * iPhone: la palabra del SMS que dispara la automatización de Atajos "Bloquear pantalla". Tiene que ser la
 * misma que `PALABRA_BLOQUEO` en apps/api/src/mensajes.ts.
 */
export const PALABRA_BLOQUEO_ATAJOS = 'AA-BLOQUEO';

export interface EstadoBloqueo {
  disponible: boolean;
  administradorActivo: boolean;
  bloqueoSeguro: boolean;
  bloqueado: boolean;
  /** Android deja abrir el "¿Todo bien?" sobre la pantalla de bloqueo (permiso de pantalla completa). */
  pantallaCompleta: boolean;
  detalle: string;
}
export interface ResultadoBloqueo {
  estado:
    'solicitado' | 'sin_autorizacion' | 'sin_clave' | 'no_disponible' | 'error';
  detalle: string;
}
interface ModuloBloqueo {
  consultarEstado(): Omit<EstadoBloqueo, 'detalle'>;
  solicitarAutorizacion(): Promise<boolean>;
  abrirBloqueoSeguro(): Promise<boolean>;
  bloquearAhora(): ResultadoBloqueo;
  abrirPermisoPantallaCompleta(): Promise<boolean>;
  mostrarSobreBloqueo(titulo: string, texto: string): boolean;
  ocultarSobreBloqueo(): void;
  /** Solo iPhone: el escudo de Tiempo de uso sigue puesto sobre las demás apps. */
  appsBloqueadas?(): boolean;
  /** Solo iPhone: quita el escudo (en Android el bloqueo lo quita la clave del sistema). */
  quitarBloqueoApps?(): void;
}
const modulo =
  Platform.OS === 'android' || Platform.OS === 'ios'
    ? requireOptionalNativeModule<ModuloBloqueo>('BloqueoPantalla')
    : null;
const esIphone = Platform.OS === 'ios';

/**
 * iPhone de TestFlight o de instalación interna: se compilan sin el permiso de Tiempo de uso porque Apple
 * todavía no aprueba distribuirlo (app.config.js pone `extra.sinTiempoDeUso`). Ahí iOS rechaza el pedido sin
 * mostrar el diálogo de Apple, así que no ofrecemos "Autorizar" (parecería que no responde) y lo explicamos.
 */
const sinTiempoDeUso = esIphone && Constants.expoConfig?.extra?.sinTiempoDeUso === true;
const SIN_TIEMPO_DE_USO =
  'Esta versión de prueba (TestFlight) no puede tapar tus apps: Apple todavía no aprueba el permiso de Tiempo de uso para distribuirla. El bloqueo con Atajos sí funciona:';

function motivoNoDisponible(): string {
  if (esIphone)
    return 'Requiere recompilar la app de iPhone con el módulo de bloqueo (iOS 16 o más). No funciona en Expo Go. Mientras tanto, activa la protección de Apple:';
  if (Platform.OS === 'web')
    return 'La web no puede bloquear tu teléfono. Instala la app compilada de Android.';
  return 'Requiere recompilar la app Android con el módulo de bloqueo. No funciona en Expo Go.';
}
export function consultarBloqueo(): EstadoBloqueo {
  const vacio = {
    disponible: false,
    administradorActivo: false,
    bloqueoSeguro: false,
    bloqueado: false,
    pantallaCompleta: false,
  };
  if (!modulo) return { ...vacio, detalle: motivoNoDisponible() };
  // Sin el permiso de Apple no hay nada que autorizar ni configurar: como no disponible, pero diciendo por qué.
  if (sinTiempoDeUso) return { ...vacio, detalle: SIN_TIEMPO_DE_USO };
  try {
    const estado = modulo.consultarEstado();
    if (esIphone) return { ...estado, detalle: detalleIphone(estado) };
    const detalle = !estado.disponible
      ? 'Este Android no admite bloqueo mediante administración.'
      : !estado.bloqueoSeguro
        ? 'Primero configura un PIN, patrón o contraseña de Android.'
        : !estado.administradorActivo
          ? 'Autoriza el bloqueo automático al confirmar un arrebato.'
          : !estado.pantallaCompleta
            ? 'Autorizado, pero Android no deja mostrar el "¿Todo bien?" sobre la pantalla de bloqueo: tendrías que desbloquear para cancelar.'
            : 'Autorizado: al confirmar un arrebato bloquearemos Android y te preguntaremos "¿Todo bien?" sobre la pantalla de bloqueo.';
    return { ...estado, detalle };
  } catch {
    return {
      ...vacio,
      detalle:
        'No pudimos consultar el bloqueo del sistema. La detección y las alertas continúan.',
    };
  }
}
/**
 * iPhone no se puede bloquear desde una app (Apple solo lo deja con MDM). Lo más cercano: con Tiempo de uso
 * tapamos todas las demás apps, también la que esté abierta cuando te lo arranchan.
 */
function detalleIphone(estado: Omit<EstadoBloqueo, 'detalle'>): string {
  if (!estado.disponible) return 'Bloquear las apps necesita iOS 16 o más. Activa la protección de Apple:';
  if (!estado.bloqueoSeguro) return 'Primero ponle un código a tu iPhone (Ajustes › Face ID y código).';
  if (!estado.administradorActivo)
    return 'Autoriza Tiempo de uso: si te lo arranchan, taparemos WhatsApp, tu banco y las demás apps. Apple no deja bloquear la pantalla; esto es lo más cercano.';
  return 'Autorizado: al confirmar un arrebato taparemos las demás apps del iPhone. Para cancelar tendrás que desbloquearlo y escribir tu PIN, y las apps vuelven. Además, activa la protección de Apple:';
}
export async function solicitarAutorizacionBloqueo(): Promise<boolean> {
  if (sinTiempoDeUso) return false;
  try {
    return (await modulo?.solicitarAutorizacion()) ?? false;
  } catch {
    return false;
  }
}
export async function abrirBloqueoSeguro(): Promise<boolean> {
  try {
    return (await modulo?.abrirBloqueoSeguro()) ?? false;
  } catch {
    return false;
  }
}
/** Solo ante alerta confirmada o prueba manual explícita; no abre ajustes durante un robo. */
export function bloquearAlDetectar(): ResultadoBloqueo {
  if (!modulo)
    return { estado: 'no_disponible', detalle: motivoNoDisponible() };
  if (sinTiempoDeUso)
    return { estado: 'no_disponible', detalle: 'Esta versión de prueba no puede tapar las apps: Apple todavía no aprueba el permiso de Tiempo de uso.' };
  try {
    return modulo.bloquearAhora();
  } catch {
    return {
      estado: 'error',
      detalle: 'Falló la orden de bloqueo. El envío de la alerta continúa.',
    };
  }
}
export async function abrirPermisoPantallaCompleta(): Promise<boolean> {
  try {
    return (await modulo?.abrirPermisoPantallaCompleta()) ?? false;
  } catch {
    return false;
  }
}
/**
 * Pone el "¿Todo bien?" encima de la pantalla de bloqueo (como un despertador). Devuelve `true` si
 * Android puede abrirlo solo; `false` si el dueño tendría que desbloquear antes de cancelar.
 */
export function mostrarSobreBloqueo(segundos: number): boolean {
  if (!modulo) return false;
  try {
    return modulo.mostrarSobreBloqueo(
      '¿Todo bien?',
      `Notamos un movimiento brusco y luego velocidad. Si fue tuyo, confírmalo con tu PIN. Avisaremos en 0:${String(segundos).padStart(2, '0')}.`,
    );
  } catch {
    return false;
  }
}
/** iPhone: `true` si las demás apps siguen tapadas por una alerta o una prueba. En Android, siempre `false`. */
export function appsBloqueadas(): boolean {
  try {
    return modulo?.appsBloqueadas?.() ?? false;
  } catch {
    return false;
  }
}
/** iPhone: destapa las demás apps (falsa alarma cancelada o celular recuperado, siempre con el PIN). */
export function quitarBloqueoApps(): void {
  try {
    modulo?.quitarBloqueoApps?.();
  } catch {
    // Si falla, el dueño puede quitarlo en Ajustes › Tiempo de uso; no frenamos la cancelación.
  }
}
export function ocultarSobreBloqueo(): void {
  try {
    modulo?.ocultarSobreBloqueo();
  } catch {
    // Si falla, Android igual quita la ventana al cerrar la app; la alerta ya terminó.
  }
}
/** `true` si Android está en la pantalla de bloqueo. Fuera de Android, siempre `false`. */
export function pantallaBloqueada(): boolean {
  if (!modulo) return false;
  try {
    return modulo.consultarEstado().bloqueado;
  } catch {
    return false;
  }
}
/**
 * Sigue si Android está bloqueado mientras `activo` (una alerta sobre la pantalla de bloqueo). Empieza en
 * `true`: ante la duda mostramos solo el "¿Todo bien?", nunca el resto de la app sobre el bloqueo.
 */
export function usePantallaBloqueada(activo: boolean): boolean {
  const [bloqueada, setBloqueada] = useState(true);
  useEffect(() => {
    // Al terminar una alerta vuelve a "bloqueada": la próxima empieza mostrando solo el "¿Todo bien?".
    if (!activo) return setBloqueada(true);
    const revisar = () => setBloqueada(pantallaBloqueada());
    revisar();
    const reloj = setInterval(revisar, 500);
    const sub = AppState.addEventListener('change', revisar);
    return () => {
      clearInterval(reloj);
      sub.remove();
    };
  }, [activo]);
  return activo && bloqueada;
}
/**
 * Qué falta para que el bloqueo funcione, en una frase para mostrar en Inicio y antes de un ensayo.
 * `null` si está listo o si no se puede arreglar desde aquí (iPhone, web, Expo Go).
 */
export function faltaParaBloqueo(estado: EstadoBloqueo, numeroPropio = ''): string | null {
  // iPhone: el bloqueo de verdad es el de Atajos (funciona también sin el módulo, por ejemplo en iOS 15).
  if (esIphone && !numeroPropio) return 'Falta configurar el bloqueo con Atajos.';
  if (!estado.disponible) return null;
  if (esIphone) {
    if (!estado.bloqueoSeguro) return 'Falta ponerle un código a tu iPhone.';
    if (!estado.administradorActivo) return 'Falta autorizar Tiempo de uso para tapar tus apps.';
    // iPhone nunca deja la pregunta sobre el bloqueo: no es algo que falte arreglar.
    return null;
  }
  if (!estado.bloqueoSeguro) return 'Falta poner un PIN, patrón o contraseña en Android.';
  if (!estado.administradorActivo) return 'Falta autorizar a la app para bloquear el celular.';
  if (!estado.pantallaCompleta) return 'Falta permitir el "¿Todo bien?" sobre la pantalla de bloqueo.';
  return null;
}
/** Estado del bloqueo, al día cada vez que vuelves a la app (por ejemplo, después de dar un permiso). */
export function useEstadoBloqueo(): EstadoBloqueo {
  const [estado, setEstado] = useState(consultarBloqueo);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (fase) => {
      if (fase === 'active') setEstado(consultarBloqueo());
    });
    return () => sub.remove();
  }, []);
  return estado;
}
