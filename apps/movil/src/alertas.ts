import type { EventoDetector, LecturaGps } from '@pixel-hack/detector';
import { Platform } from 'react-native';

/**
 * Envío de alertas al panel (backend en construcción, ver docs/PLAN.md §6).
 * Si no está configurada `EXPO_PUBLIC_URL_ALERTAS`, la alerta solo se registra en la app:
 * así la demo funciona aunque el backend no esté listo.
 */
const URL_ALERTAS = process.env.EXPO_PUBLIC_URL_ALERTAS ?? '';

/**
 * Lo que la app manda (nada más: un "posible jalón" NO se envía, porque caminando hay cientos por hora).
 * - `alerta`: al instante, al panel, con la ruta de los últimos segundos.
 * - `notificar_familia`: 10 s después, si el dueño no la canceló con su PIN.
 * - `ubicacion`: cada lectura GPS mientras dure la alerta (la ruta de huida).
 * - `cancelada`: el dueño puso su PIN: era falsa alarma.
 */
export type MensajeAlerta =
  | { tipo: 'alerta'; evento: EventoDetector; ruta: LecturaGps[] }
  | { tipo: 'notificar_familia' | 'cancelada'; evento: EventoDetector }
  | { tipo: 'ubicacion'; lectura: LecturaGps };

export interface ResultadoEnvio {
  enviado: boolean;
  detalle: string;
}

/** Identificador anónimo de esta instalación (no es un dato personal). */
const idDispositivo = `${Platform.OS}-${Math.random().toString(36).slice(2, 10)}`;

export function hayBackend(): boolean {
  return URL_ALERTAS.startsWith('https://') || URL_ALERTAS.startsWith('http://');
}

export async function enviar(mensaje: MensajeAlerta): Promise<ResultadoEnvio> {
  if (!hayBackend()) return { enviado: false, detalle: 'sin backend configurado (solo local)' };
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), 5000);
  try {
    const r = await fetch(URL_ALERTAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispositivo: idDispositivo, enviadoEn: Date.now(), ...mensaje }),
      signal: control.signal,
    });
    return { enviado: r.ok, detalle: r.ok ? 'enviado' : `el servidor respondió ${r.status}` };
  } catch (e) {
    return { enviado: false, detalle: e instanceof Error ? e.message : 'error de red' };
  } finally {
    clearTimeout(limite);
  }
}
