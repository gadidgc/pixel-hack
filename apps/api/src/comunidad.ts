import { ErrorDeDatos } from './validar';

/**
 * Validación de "Cerca de ti" (reportes de la comunidad) y de las evidencias (video o audio).
 * Igual que en validar.ts: el endpoint es público, así que todo se revisa antes de tocar D1 o R2.
 */

export const TIPOS_REPORTE = ['arrebato_moto', 'arrebato_a_pie', 'intento', 'robo', 'sospechoso', 'zona_oscura'] as const;
/** 'grabacion' no se elige en "Reportar algo": lo crea el servidor cuando alguien sube una grabación con ubicación. */
export type TipoReporte = (typeof TIPOS_REPORTE)[number] | 'grabacion';

export const MAX_NOTA = 140;
/** Un mismo celular puede mandar hasta 5 reportes por hora (evita que alguien llene el mapa). */
export const MAX_REPORTES_POR_HORA = 5;
/** Solo mostramos lo de los últimos 30 días. */
export const VENTANA_REPORTES_MS = 30 * 24 * 3600_000;
export const RADIO_POR_DEFECTO_KM = 1;
export const RADIO_MAX_KM = 10;

/** Evidencias: hasta 50 MB por archivo y 20 subidas por hora por celular. */
export const MAX_EVIDENCIA_BYTES = 50 * 1024 * 1024;
export const MAX_EVIDENCIAS_POR_HORA = 20;
/** Miniatura de una grabación (un cuadro del video en JPEG): hasta 512 KB. */
export const MAX_MINIATURA_BYTES = 512 * 1024;
/**
 * Una grabación se suma al reporte que el mismo celular hizo hace menos de 10 min y a menos de ~300 m
 * (así dos videos del mismo hecho son una tarjeta con "2 videos"). Si no hay, se crea uno nuevo.
 */
export const JUNTAR_GRABACIONES_MS = 10 * 60_000;
export const JUNTAR_GRABACIONES_GRADOS = 0.003;

export interface NuevoReporte {
  dispositivo: string;
  tipo: TipoReporte;
  lat: number;
  lon: number;
  nota: string | null;
}

export interface Busqueda {
  lat: number;
  lon: number;
  radioKm: number;
}

export interface Caja {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

/** El id anónimo de la instalación: letras, números, `_` y `-` (igual que en validar.ts). */
export function validarDispositivo(v: unknown): string {
  if (typeof v !== 'string') throw new ErrorDeDatos('"dispositivo" debe ser texto');
  const limpio = v.trim();
  if (limpio.length === 0 || limpio.length > 64 || !/^[\w-]+$/.test(limpio)) throw new ErrorDeDatos('"dispositivo" no es válido');
  return limpio;
}

function coordenada(v: unknown, campo: string, max: number): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < -max || n > max) throw new ErrorDeDatos(`"${campo}" fuera de rango`);
  return n;
}

/**
 * Redondea a 3 decimales: ~110 m de latitud (y algo menos de longitud en Lima). Así un reporte dice
 * "por esta cuadra", no "en esta puerta".
 */
export function redondear(v: number): number {
  return Math.round(v * 1000) / 1000;
}

export function validarReporte(cuerpo: unknown): NuevoReporte {
  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) throw new ErrorDeDatos('"cuerpo" debe ser un objeto');
  const o = cuerpo as Record<string, unknown>;
  const dispositivo = validarDispositivo(o.dispositivo);
  if (typeof o.tipo !== 'string' || !(TIPOS_REPORTE as readonly string[]).includes(o.tipo)) throw new ErrorDeDatos('"tipo" de reporte desconocido');
  let nota: string | null = null;
  if (o.nota !== undefined && o.nota !== null) {
    if (typeof o.nota !== 'string') throw new ErrorDeDatos('"nota" debe ser texto');
    // Sin saltos de línea ni caracteres de control: es una línea corta que ven los vecinos.
    const limpia = o.nota.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
    if (limpia.length > MAX_NOTA) throw new ErrorDeDatos(`"nota" tiene más de ${MAX_NOTA} caracteres`);
    nota = limpia || null;
  }
  return {
    dispositivo,
    tipo: o.tipo as TipoReporte,
    lat: redondear(coordenada(o.lat, 'lat', 90)),
    lon: redondear(coordenada(o.lon, 'lon', 180)),
    nota,
  };
}

/** `?lat=&lon=&radioKm=` de `GET /api/reportes`. */
export function validarBusqueda(params: URLSearchParams): Busqueda {
  if (!params.has('lat') || !params.has('lon')) throw new ErrorDeDatos('faltan "lat" y "lon"');
  const radio = params.get('radioKm');
  const radioKm = radio === null || radio === '' ? RADIO_POR_DEFECTO_KM : Number(radio);
  if (!Number.isFinite(radioKm) || radioKm <= 0 || radioKm > RADIO_MAX_KM) throw new ErrorDeDatos(`"radioKm" debe estar entre 0 y ${RADIO_MAX_KM}`);
  return { lat: coordenada(params.get('lat'), 'lat', 90), lon: coordenada(params.get('lon'), 'lon', 180), radioKm };
}

/** Caja alrededor de un punto (más simple y rápida en SQLite que un círculo; el círculo lo filtra quien lo necesite). */
export function cajaDe({ lat, lon, radioKm }: Busqueda): Caja {
  const dLat = radioKm / 110.574;
  // Cerca de los polos el coseno tiende a 0: lo acotamos para no dividir entre casi nada.
  const dLon = radioKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));
  return { latMin: lat - dLat, latMax: lat + dLat, lonMin: lon - dLon, lonMax: lon + dLon };
}

export type TipoEvidencia = 'video' | 'audio';

export interface NuevaEvidencia {
  dispositivo: string;
  tipo: TipoEvidencia;
  mime: string;
  bytes: number;
  lat: number | null;
  lon: number | null;
}

/**
 * Cabeceras de `POST /api/evidencias` (el cuerpo es el archivo tal cual):
 * `Content-Type` video/* o audio/*, `Content-Length` (obligatorio, hasta 50 MB), `X-Dispositivo`,
 * y opcionalmente `X-Lat` / `X-Lon` (dónde se grabó; van en cabeceras y no en la URL para que no queden en registros).
 */
export function validarEvidencia(cabeceras: Headers): NuevaEvidencia {
  const dispositivo = validarDispositivo(cabeceras.get('X-Dispositivo') ?? '');
  const mime = (cabeceras.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  const m = mime.match(/^(video|audio)\/[a-z0-9.+-]{1,40}$/);
  if (!m) throw new ErrorDeDatos('el archivo debe ser video/* o audio/*');
  const largo = cabeceras.get('Content-Length');
  const bytes = largo === null ? NaN : Number(largo);
  if (!Number.isInteger(bytes) || bytes <= 0) throw new ErrorDeDatos('falta "Content-Length"');
  if (bytes > MAX_EVIDENCIA_BYTES) throw new ErrorDeDatos('el archivo pasa de 50 MB');
  const lat = cabeceras.get('X-Lat');
  const lon = cabeceras.get('X-Lon');
  const conPosicion = lat !== null && lon !== null && lat !== '' && lon !== '';
  return {
    dispositivo,
    tipo: m[1] as TipoEvidencia,
    mime,
    bytes,
    lat: conPosicion ? redondear(coordenada(lat, 'X-Lat', 90)) : null,
    lon: conPosicion ? redondear(coordenada(lon, 'X-Lon', 180)) : null,
  };
}

/**
 * Cabeceras de `POST /api/evidencias/:id/miniatura` (el cuerpo es el JPEG tal cual): `Content-Type`
 * image/jpeg, `Content-Length` (hasta 512 KB) y `X-Dispositivo` (debe ser el mismo que subió la evidencia).
 */
export function validarMiniatura(cabeceras: Headers): { dispositivo: string; bytes: number } {
  const dispositivo = validarDispositivo(cabeceras.get('X-Dispositivo') ?? '');
  const mime = (cabeceras.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  if (mime !== 'image/jpeg') throw new ErrorDeDatos('la miniatura debe ser image/jpeg');
  const largo = cabeceras.get('Content-Length');
  const bytes = largo === null ? NaN : Number(largo);
  if (!Number.isInteger(bytes) || bytes <= 0) throw new ErrorDeDatos('falta "Content-Length"');
  if (bytes > MAX_MINIATURA_BYTES) throw new ErrorDeDatos('la miniatura pasa de 512 KB');
  return { dispositivo, bytes };
}
