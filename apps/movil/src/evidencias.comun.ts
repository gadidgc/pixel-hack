import { idDispositivo } from './alertas';

/** Lo que comparten evidencias.ts (iPhone y Android) y evidencias.web.ts. */

/** `reporte`: el reporte de "Cerca de ti" donde quedó publicada (null si se subió sin ubicación). */
export type ResultadoSubida = { ok: true; id: string; enlace: string; conAlerta: boolean; reporte: string | null } | { ok: false; motivo: string };

/** El servidor acepta hasta 50 MB por archivo. */
export const MAX_BYTES = 50 * 1024 * 1024;

/** La posición va en cabeceras (no en la URL) para que no quede en los registros. */
export function cabecerasEvidencia(mime: string, pos: { lat: number; lon: number } | null): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': mime, 'X-Dispositivo': idDispositivo() };
  if (pos) {
    h['X-Lat'] = pos.lat.toFixed(5);
    h['X-Lon'] = pos.lon.toFixed(5);
  }
  return h;
}

export function leerRespuesta(estado: number, cuerpo: string): ResultadoSubida {
  let d: { id?: string; enlace?: string; alerta?: string | null; reporte?: string | null; detalle?: string } = {};
  try {
    d = JSON.parse(cuerpo) as typeof d;
  } catch {
    // Sin JSON: nos quedamos con el código.
  }
  if (estado >= 200 && estado < 300 && d.id && d.enlace) return { ok: true, id: d.id, enlace: d.enlace, conAlerta: Boolean(d.alerta), reporte: d.reporte ?? null };
  return { ok: false, motivo: d.detalle ?? `el servidor respondió ${estado}` };
}
