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

/** Bancos y billeteras que se pueden marcar (los mismos ids que apps/api/src/bloqueo.ts). */
export const ENTIDADES = [
  { id: 'yape', nombre: 'Yape' },
  { id: 'plin', nombre: 'Plin' },
  { id: 'bcp', nombre: 'BCP' },
  { id: 'interbank', nombre: 'Interbank' },
  { id: 'bbva', nombre: 'BBVA' },
  { id: 'scotiabank', nombre: 'Scotiabank' },
  { id: 'otro_banco', nombre: 'Otro banco o caja' },
] as const;

export const OPERADORES = [
  { id: 'movistar', nombre: 'Movistar' },
  { id: 'claro', nombre: 'Claro' },
  { id: 'entel', nombre: 'Entel' },
  { id: 'bitel', nombre: 'Bitel' },
] as const;

/**
 * Lo que necesita tu red para bloquear tus cuentas si confirma el robo. Viaja con la alerta y solo se le
 * muestra a tu red DESPUÉS de que alguien confirme el robo; el backend lo borra a las 24 h. Nunca claves ni
 * números de tarjeta. El DNI es opcional: vacío = no se guarda ni se envía.
 */
export interface PerfilBloqueo {
  entidades: string[];
  operador: string | null;
  linea: string;
  imei: string;
  dni: string;
}

export interface Preferencias {
  bienvenidaHecha: boolean;
  nombre: string;
  contactos: Contacto[];
  /** Segundos de "¿Todo bien?" antes de avisar a la red (el dueño puede cancelar con su PIN). */
  esperaFamiliaS: number;
  /** La protección estaba encendida: si el sistema reabre la app (o se reinicia), vuelve a encenderla sola. */
  proteccionActiva: boolean;
  bloqueo: PerfilBloqueo;
  /**
   * Id anónimo de esta instalación (no es un dato personal). Se guarda para que no cambie al reabrir la app:
   * con él la dueña cancela con su PIN una alerta enviada antes de que el sistema cerrara la app.
   */
  dispositivo: string;
  /**
   * iPhone: el número de la propia dueña. Al confirmar un arrebato le mandamos un SMS con la palabra de
   * bloqueo y su automatización de Atajos bloquea la pantalla. Vacío = no lo configuró.
   */
  numeroPropio: string;
}

export const PERFIL_VACIO: PerfilBloqueo = { entidades: [], operador: null, linea: '', imei: '', dni: '' };

/** Lo que se manda al backend: solo lo que la persona llenó (sin el DNI si lo dejó vacío). `undefined` si no llenó nada. */
export function perfilParaEnviar(p: PerfilBloqueo): Partial<PerfilBloqueo> | undefined {
  const limpio = (t: string) => t.replace(/\s/g, '');
  const envio: Partial<PerfilBloqueo> = {};
  if (p.entidades.length) envio.entidades = p.entidades;
  if (p.operador) envio.operador = p.operador;
  if (limpio(p.linea)) envio.linea = limpio(p.linea);
  if (limpio(p.imei)) envio.imei = limpio(p.imei);
  if (limpio(p.dni)) envio.dni = limpio(p.dni);
  return Object.keys(envio).length ? envio : undefined;
}

const CLAVE = 'alerta-arrebato-preferencias';
const INICIAL: Preferencias = {
  bienvenidaHecha: false,
  nombre: '',
  contactos: [],
  esperaFamiliaS: 10,
  proteccionActiva: false,
  bloqueo: PERFIL_VACIO,
  dispositivo: '',
  numeroPropio: '',
};

/** Id para esta sesión hasta que carguen las preferencias (o si no se pueden guardar). */
const DISPOSITIVO_RESPALDO = `${Platform.OS}-${Math.random().toString(36).slice(2, 10)}`;

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
    if (texto) {
      const guardadas = JSON.parse(texto) as Partial<Preferencias>;
      actuales = { ...INICIAL, ...guardadas, bloqueo: { ...PERFIL_VACIO, ...guardadas.bloqueo } };
    }
  } catch {
    actuales = INICIAL;
  }
  cargadas = true;
  if (!actuales.dispositivo) {
    // Primera vez (o versión anterior de la app): fijamos el id de esta instalación.
    actuales = { ...actuales, dispositivo: DISPOSITIVO_RESPALDO };
    await escribir(JSON.stringify(actuales)).catch(() => undefined);
  }
  for (const o of oyentes) o(actuales);
  return actuales;
}

export function idDispositivo(): string {
  return actuales.dispositivo || DISPOSITIVO_RESPALDO;
}

export function preferencias(): Preferencias {
  return actuales;
}

export async function guardarPreferencias(cambios: Partial<Preferencias>): Promise<Preferencias> {
  actuales = { ...actuales, ...cambios };
  for (const o of oyentes) o(actuales);
  // Si el almacenamiento falla, el cambio sigue en memoria: ninguna pantalla debe quedarse trabada por esto.
  await escribir(JSON.stringify(actuales)).catch((e) => console.warn('No se pudieron guardar las preferencias', e));
  return actuales;
}

/**
 * Herramientas del equipo: vuelve a como recién instalada (sin nombre, sin red, sin bienvenida) para probar
 * la bienvenida otra vez. El id de la instalación se queda: no es un dato personal y lo usa el backend.
 */
export async function borrarPreferencias(): Promise<Preferencias> {
  return guardarPreferencias({ ...INICIAL, dispositivo: actuales.dispositivo });
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
