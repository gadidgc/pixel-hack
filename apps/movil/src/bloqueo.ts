import { requireOptionalNativeModule } from 'expo';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

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
}
const modulo =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<ModuloBloqueo>('BloqueoPantalla')
    : null;

function motivoNoDisponible(): string {
  if (Platform.OS === 'ios')
    return 'iPhone no deja que una app lo bloquee (Apple solo lo permite con gestión de empresa, MDM). Las alertas funcionan igual. Para que el ladrón no pueda usar tu iPhone, activa la protección de Apple:';
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
  try {
    const estado = modulo.consultarEstado();
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
export async function solicitarAutorizacionBloqueo(): Promise<boolean> {
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
export function faltaParaBloqueo(estado: EstadoBloqueo): string | null {
  if (!estado.disponible) return null;
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
