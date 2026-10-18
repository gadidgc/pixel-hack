import type { LecturaLlave } from '@pixel-hack/detector';
import { requireOptionalNativeModule, type NativeModule } from 'expo';
import { PermissionsAndroid, Platform } from 'react-native';

/**
 * La llave del robo silencioso: otro celular con la app que anuncia por Bluetooth (modules/llave-ble).
 * Aquí solo se habla con el módulo nativo; la lógica (distancia, cuánto tiempo lejos) vive en
 * packages/detector (llave.ts). Solo Android: iPhone y la web no dejan anunciar ni escanear así.
 */

type Eventos = {
  onLlave: (lectura: LecturaLlave) => void;
  onErrorLlave: (error: { detalle: string }) => void;
};

declare class ModuloLlave extends NativeModule<Eventos> {
  disponible(): { bluetooth: boolean; encendido: boolean; anunciar: boolean };
  anunciar(codigo: string): Promise<boolean>;
  dejarDeAnunciar(): void;
  escanear(codigo: string): void;
  detenerEscaneo(): void;
}

const modulo = Platform.OS === 'android' ? requireOptionalNativeModule<ModuloLlave>('LlaveBle') : null;

export interface EstadoBluetooth {
  disponible: boolean;
  encendido: boolean;
  /** Puede anunciarse (servir de llave). Algunos celulares baratos solo escuchan. */
  puedeSerLlave: boolean;
  detalle: string;
}

export function consultarBluetooth(): EstadoBluetooth {
  const vacio = { disponible: false, encendido: false, puedeSerLlave: false };
  if (!modulo) {
    return {
      ...vacio,
      detalle:
        Platform.OS === 'android'
          ? 'Requiere recompilar la app Android con el módulo de la llave. No funciona en Expo Go.'
          : 'La llave por Bluetooth solo funciona en la app de Android por ahora.',
    };
  }
  try {
    const d = modulo.disponible();
    return {
      disponible: d.bluetooth,
      encendido: d.encendido,
      puedeSerLlave: d.anunciar,
      detalle: !d.bluetooth ? 'Este celular no tiene Bluetooth.' : !d.encendido ? 'Prende el Bluetooth para usar la llave.' : 'Bluetooth listo.',
    };
  } catch {
    return { ...vacio, detalle: 'No pudimos consultar el Bluetooth.' };
  }
}

/** "Dispositivos cercanos" (Android 12+). En Android 11 o menos basta la ubicación, que ya pedimos. */
export async function pedirPermisosBluetooth(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Number(Platform.Version) < 31) return true;
  const permisos = [
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ];
  try {
    const r = await PermissionsAndroid.requestMultiple(permisos);
    return permisos.every((p) => r[p] === PermissionsAndroid.RESULTS.GRANTED);
  } catch {
    return false;
  }
}

/** Código de vinculación de 4 dígitos (va en el paquete Bluetooth; no es el PIN). */
export function nuevoCodigoLlave(): string {
  return String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
}

export function codigoLlaveValido(codigo: string): boolean {
  return /^\d{4}$/.test(codigo);
}

/** Este celular pasa a ser la llave. Lanza un error con el motivo si Android no lo deja. */
export async function anunciarComoLlave(codigo: string): Promise<void> {
  if (!modulo) throw new Error(consultarBluetooth().detalle);
  if (!(await pedirPermisosBluetooth())) throw new Error('Falta el permiso "Dispositivos cercanos" para usar el Bluetooth.');
  await modulo.anunciar(codigo);
}

export function dejarDeSerLlave(): void {
  try {
    modulo?.dejarDeAnunciar();
  } catch {
    // Si falla, Android deja de anunciar al cerrar la app.
  }
}

/**
 * Escucha la llave con ese código. Devuelve la función para dejar de escuchar. Lanza un error si no se
 * puede (sin módulo, sin permiso o con el Bluetooth apagado).
 */
export async function escucharLlave(codigo: string, alRecibir: (l: LecturaLlave) => void, alFallar: (detalle: string) => void): Promise<() => void> {
  if (!modulo) throw new Error(consultarBluetooth().detalle);
  if (!(await pedirPermisosBluetooth())) throw new Error('Falta el permiso "Dispositivos cercanos": no podemos vigilar tu llave.');
  const lecturas = modulo.addListener('onLlave', alRecibir);
  const errores = modulo.addListener('onErrorLlave', ({ detalle }) => alFallar(detalle));
  try {
    modulo.escanear(codigo);
  } catch (e) {
    lecturas.remove();
    errores.remove();
    throw e instanceof Error ? e : new Error('No se pudo buscar la llave por Bluetooth.');
  }
  return () => {
    lecturas.remove();
    errores.remove();
    try {
      modulo?.detenerEscaneo();
    } catch {
      // Ya no escanea.
    }
  };
}
