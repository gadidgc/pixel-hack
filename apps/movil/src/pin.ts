import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * PIN del dueño. Se pide para cancelar una alerta y para desactivar la protección:
 * así el ladrón, que tiene el celular en la mano, no puede apagarla.
 * En iPhone y Android se guarda cifrado (Keychain / Keystore); en la web, en el navegador.
 */
const CLAVE = 'alerta-arrebato-pin';

async function leer(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(CLAVE) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(CLAVE);
}

export function pinValido(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function hayPin(): Promise<boolean> {
  return (await leer()) !== null;
}

export async function guardarPin(pin: string): Promise<void> {
  if (!pinValido(pin)) throw new Error('El PIN debe tener de 4 a 6 números.');
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(CLAVE, pin);
    return;
  }
  await SecureStore.setItemAsync(CLAVE, pin);
}

export async function verificarPin(pin: string): Promise<boolean> {
  const guardado = await leer();
  return guardado !== null && guardado === pin;
}

/** Herramientas del equipo: borra el PIN para volver a crearlo en la bienvenida. */
export async function borrarPin(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.removeItem(CLAVE);
    } catch {
      // Navegación privada: no había nada guardado.
    }
    return;
  }
  await SecureStore.deleteItemAsync(CLAVE);
}
