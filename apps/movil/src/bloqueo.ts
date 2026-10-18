import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export interface EstadoBloqueo {
  disponible: boolean;
  administradorActivo: boolean;
  bloqueoSeguro: boolean;
  bloqueado: boolean;
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
}
const modulo =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<ModuloBloqueo>('BloqueoPantalla')
    : null;

function motivoNoDisponible(): string {
  if (Platform.OS === 'ios')
    return 'iPhone no permite a esta app bloquear el sistema. El bloqueo remoto de Apple requiere gestión de dispositivos (MDM). Las alertas siguen disponibles.';
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
          : 'Autorizado: al confirmar un arrebato pediremos el bloqueo inmediato de Android.';
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
