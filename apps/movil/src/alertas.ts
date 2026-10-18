import type { EventoDetector, LecturaGps } from '@pixel-hack/detector';
import { Platform } from 'react-native';
import { idDispositivo, type Contacto, type PerfilBloqueo } from './preferencias';

/**
 * Envío de alertas al backend (apps/api: Cloudflare Workers + D1, ver docs/PLAN.md §6).
 * - `EXPO_PUBLIC_URL_ALERTAS` manda (por ejemplo, para probar con `wrangler dev`).
 * - En la web publicada usamos el mismo dominio (la web y el backend viven en la misma URL).
 * - Si no, el backend público del equipo.
 * Vacío (`EXPO_PUBLIC_URL_ALERTAS=ninguno`): la alerta queda solo en la app.
 */
export const URL_PUBLICA = 'https://alerta-arrebato.gabrieldgc1999.workers.dev';

function urlAlertas(): string {
  const env = process.env.EXPO_PUBLIC_URL_ALERTAS;
  if (env === 'ninguno') return '';
  if (env) return env;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.protocol === 'https:') return `${window.location.origin}/api/eventos`;
  return `${URL_PUBLICA}/api/eventos`;
}

const URL_ALERTAS = urlAlertas();

/** Raíz del backend (para leer una alerta desde la página del contacto). */
export function urlBackend(): string {
  return URL_ALERTAS.replace(/\/api\/eventos$/, '');
}

/**
 * Lo que la app manda (nada más: un "posible jalón" NO se envía, porque caminando hay cientos por hora).
 * - `alerta`: al instante, al panel, con la ruta de los últimos segundos.
 * - `notificar_familia`: 10 s después, si el dueño no la canceló con su PIN.
 * - `ubicacion`: cada lectura GPS mientras dure la alerta (la ruta de huida).
 * - `cancelada`: el dueño puso su PIN: era falsa alarma.
 * - `prueba`: la prueba guiada; el backend manda a la red un mensaje marcado como PRUEBA.
 * - `motivo_falsa_alarma`: opcional, para mejorar el detector.
 * `contactos` viaja solo en una alerta o prueba, para que el backend sepa a quién escribir.
 * `bloqueo` (bancos, operadora, línea, IMEI, DNI opcional) viaja con la alerta para el kit de bloqueo.
 */
export type MensajeAlerta =
  | { tipo: 'alerta'; evento: EventoDetector; ruta: LecturaGps[]; nombre: string; contactos: Contacto[]; esperaS: number; bloqueo?: Partial<PerfilBloqueo> }
  | { tipo: 'notificar_familia'; evento: EventoDetector; nombre: string; contactos: Contacto[]; bloqueo?: Partial<PerfilBloqueo> }
  | { tipo: 'cancelada'; evento: EventoDetector }
  | { tipo: 'ubicacion'; lectura: LecturaGps }
  | { tipo: 'prueba'; nombre: string; contactos: Contacto[] }
  | { tipo: 'motivo_falsa_alarma'; motivo: string };

export interface ResultadoEnvio {
  enviado: boolean;
  detalle: string;
  /** Enlace público de la alerta (`/a/<id>`), el mismo que recibe la red. */
  enlace?: string;
  /** Cuántos contactos recibieron el mensaje (WhatsApp/SMS), y de cuántos. */
  avisados?: number;
  total?: number;
}

interface RespuestaBackend {
  ok?: boolean;
  detalle?: string;
  enlace?: string;
  avisados?: number;
  total?: number;
}

/** Identificador anónimo de esta instalación (no es un dato personal). Vive en preferencias, para que no cambie al reabrir. */
export { idDispositivo };

export function hayBackend(): boolean {
  return URL_ALERTAS.startsWith('https://') || URL_ALERTAS.startsWith('http://');
}

export async function enviar(mensaje: MensajeAlerta): Promise<ResultadoEnvio> {
  if (!hayBackend()) return { enviado: false, detalle: 'falta conectar el panel; quedó solo en este celular' };
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), 5000);
  try {
    const r = await fetch(URL_ALERTAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispositivo: idDispositivo(), enviadoEn: Date.now(), ...mensaje }),
      signal: control.signal,
    });
    const datos = (await r.json().catch(() => ({}))) as RespuestaBackend;
    if (!r.ok) return { enviado: false, detalle: datos.detalle ?? `el servidor respondió ${r.status}` };
    // Para avisar a la red no basta con que el backend lo reciba: tiene que haber salido al menos un mensaje.
    const avisaRed = mensaje.tipo === 'notificar_familia' || mensaje.tipo === 'prueba';
    const enviado = avisaRed && datos.total ? (datos.avisados ?? 0) > 0 : true;
    return { enviado, detalle: datos.detalle ?? 'enviado', enlace: datos.enlace, avisados: datos.avisados, total: datos.total };
  } catch (e) {
    return { enviado: false, detalle: e instanceof Error ? e.message : 'error de red' };
  } finally {
    clearTimeout(limite);
  }
}

export interface SaludBackend {
  base: boolean;
  /** `true` si el backend tiene con qué mandar WhatsApp (Meta o Zavu). */
  mensajes: boolean;
}

/** Pregunta al backend si está listo de verdad (no basta con tener la URL). `null`: no responde. */
export async function revisarBackend(): Promise<SaludBackend | null> {
  if (!hayBackend()) return null;
  try {
    const r = await fetch(`${urlBackend()}/api/salud`, { signal: AbortSignal.timeout(5000) });
    const d = (await r.json()) as { base?: boolean; mensajes?: string };
    return { base: Boolean(d.base), mensajes: Boolean(d.mensajes && d.mensajes !== 'sin proveedor') };
  } catch {
    return null;
  }
}
