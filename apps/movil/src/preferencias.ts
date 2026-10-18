import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Lo que la persona configura: su nombre, su red de confianza y cuánto esperar antes de avisar.
 * Se guarda SOLO en el celular (Keychain / Keystore; en la web, el navegador). Los teléfonos de la red
 * son datos personales de terceros: no salen del celular salvo en una alerta, para poder avisarles.
 */
export interface Contacto {
  nombre: string;
  telefono: string;
}

export interface Preferencias {
  bienvenidaHecha: boolean;
  nombre: string;
  contactos: Contacto[];
  /** Segundos de "¿Todo bien?" antes de avisar a la red (el dueño puede cancelar con su PIN). */
  esperaFamiliaS: number;
  /** La protección estaba encendida: si el sistema reabre la app (o se reinicia), vuelve a encenderla sola. */
  proteccionActiva: boolean;
  /**
   * iPhone: el número de la propia dueña. Al confirmar un arrebato le mandamos un SMS con la palabra de
   * bloqueo y su automatización de Atajos bloquea la pantalla. Vacío = no lo configuró.
   */
  numeroPropio: string;
}

const CLAVE = 'alerta-arrebato-preferencias';
const INICIAL: Preferencias = { bienvenidaHecha: false, nombre: '', contactos: [], esperaFamiliaS: 10, proteccionActiva: false, numeroPropio: '' };

let actuales: Preferencias = INICIAL;
let cargadas = false;
const oyentes = new Set<(p: Preferencias) => void>();

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

async function escribir(texto: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      globalThis.localStorage?.setItem(CLAVE, texto);
    } catch {
      // Navegación privada: queda solo en memoria.
    }
    return;
  }
  await SecureStore.setItemAsync(CLAVE, texto);
}

export async function cargarPreferencias(): Promise<Preferencias> {
  if (cargadas) return actuales;
  try {
    const texto = await leer();
    if (texto) actuales = { ...INICIAL, ...(JSON.parse(texto) as Partial<Preferencias>) };
  } catch {
    actuales = INICIAL;
  }
  cargadas = true;
  for (const o of oyentes) o(actuales);
  return actuales;
}

export function preferencias(): Preferencias {
  return actuales;
}

export async function guardarPreferencias(cambios: Partial<Preferencias>): Promise<Preferencias> {
  actuales = { ...actuales, ...cambios };
  for (const o of oyentes) o(actuales);
  await escribir(JSON.stringify(actuales));
  return actuales;
}

export function suscribirPreferencias(oyente: (p: Preferencias) => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** Muestra un teléfono sin exponerlo entero: +51 9•• ••• 214. */
export function telefonoOculto(t: string): string {
  const d = t.replace(/\D/g, '');
  if (d.length < 6) return t;
  return `+${d.length > 9 ? d.slice(0, d.length - 9) : '51'} ${d.slice(-9, -8)}•• ••• ${d.slice(-3)}`;
}
