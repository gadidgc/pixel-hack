/**
 * La onda de un audio para su tarjeta en "Cerca de ti": mientras graba, la app lee el volumen (metering,
 * en dB: 0 es lo más fuerte, -160 es silencio) y al terminar lo resume en niveles del 0 al 9, como texto
 * ("0137…"). Se dibuja con el sonido real de esa grabación: nada inventado.
 */

/** Cuántas barras tiene la onda. */
export const BARRAS_ONDA = 48;

/** Debajo de esto es silencio (la calle rara vez baja de -50 dB). */
const PISO_DB = -60;

/** Resume las lecturas en `barras` niveles (el más alto de cada tramo). Null si hay muy pocas lecturas. */
export function ondaDesdeDecibeles(lecturas: number[], barras = BARRAS_ONDA): string | null {
  const validas = lecturas.filter((d) => Number.isFinite(d));
  if (validas.length < 8) return null;
  const n = Math.min(barras, validas.length);
  let onda = '';
  for (let i = 0; i < n; i++) {
    const tramo = validas.slice(Math.floor((i * validas.length) / n), Math.floor(((i + 1) * validas.length) / n));
    const db = Math.max(...tramo);
    const nivel = Math.round(((Math.min(0, Math.max(PISO_DB, db)) - PISO_DB) / -PISO_DB) * 9);
    onda += String(nivel);
  }
  return onda;
}

/** "0:42", "12:05". */
export function textoDuracion(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
