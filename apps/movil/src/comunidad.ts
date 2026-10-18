import type { LecturaGps } from '@pixel-hack/detector';
import * as Location from 'expo-location';
import { hayBackend, idDispositivo, urlBackend } from './alertas';
import { servicio } from './servicio';

/**
 * "Cerca de ti": los reportes de la comunidad (apps/api: `GET/POST /api/reportes`).
 * El backend redondea la ubicación a ~100 m y nunca devuelve quién reportó.
 */

export type TipoReporte = 'arrebato_moto' | 'arrebato_a_pie' | 'intento' | 'robo' | 'sospechoso' | 'zona_oscura';

/** Cómo se agrupan en el mapa (los colores del diseño): arrebato, aviso o robo. */
export type Categoria = 'arrebato' | 'aviso' | 'robo';

export const TIPOS: Record<TipoReporte, { nombre: string; categoria: Categoria }> = {
  arrebato_moto: { nombre: 'Arrebato desde moto', categoria: 'arrebato' },
  arrebato_a_pie: { nombre: 'Arrebato a pie', categoria: 'arrebato' },
  intento: { nombre: 'Intento de arrebato', categoria: 'arrebato' },
  robo: { nombre: 'Robo', categoria: 'robo' },
  sospechoso: { nombre: 'Moto o persona sospechosa', categoria: 'aviso' },
  zona_oscura: { nombre: 'Zona oscura o sin vigilancia', categoria: 'aviso' },
};

export const MAX_NOTA = 140;

export interface Reporte {
  id: string;
  tipo: TipoReporte;
  lat: number;
  lon: number;
  nota: string | null;
  /** 'alerta': la app lo detectó y se avisó a la red. 'comunidad': lo reportó alguien. */
  origen: 'alerta' | 'comunidad';
  creado: number;
}

export type Resultado<T> = { ok: true; datos: T } | { ok: false; motivo: string };

async function pedir(ruta: string, init?: RequestInit): Promise<Resultado<Record<string, unknown>>> {
  if (!hayBackend()) return { ok: false, motivo: 'la app no está conectada al servidor' };
  try {
    const r = await fetch(`${urlBackend()}${ruta}`, { ...init, signal: AbortSignal.timeout(8000) });
    const d = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) return { ok: false, motivo: typeof d.detalle === 'string' ? d.detalle : `el servidor respondió ${r.status}` };
    return { ok: true, datos: d };
  } catch (e) {
    // fetch falla con TypeError ("Failed to fetch") cuando no hay red o el servidor no responde.
    return { ok: false, motivo: e instanceof Error && e.name !== 'TimeoutError' && !(e instanceof TypeError) ? e.message : 'sin conexión con el servidor' };
  }
}

export async function buscarReportes(lat: number, lon: number, radioKm: number): Promise<Resultado<Reporte[]>> {
  const r = await pedir(`/api/reportes?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&radioKm=${radioKm}`);
  if (!r.ok) return r;
  // Solo los tipos que conocemos (si el servidor suma uno nuevo, esta versión lo ignora).
  const lista = Array.isArray(r.datos.reportes) ? (r.datos.reportes as Reporte[]) : [];
  return { ok: true, datos: lista.filter((x) => x.tipo in TIPOS) };
}

export async function reportar(tipo: TipoReporte, nota: string, pos: { lat: number; lon: number }): Promise<Resultado<Reporte>> {
  const r = await pedir('/api/reportes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dispositivo: idDispositivo, tipo, nota: nota.trim() || undefined, lat: pos.lat, lon: pos.lon }),
  });
  if (!r.ok) return r;
  return { ok: true, datos: r.datos.reporte as Reporte };
}

/**
 * Dónde está la persona ahora: la última lectura de la protección si es reciente; si no, una lectura
 * puntual (en la web, el navegador pide permiso).
 */
export async function posicionActual(): Promise<Resultado<LecturaGps>> {
  const ultima = servicio.ultimaPosicion();
  if (ultima && Date.now() - ultima.t < 2 * 60_000) return { ok: true, datos: ultima };
  try {
    const permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) return { ok: false, motivo: 'sin permiso de ubicación' };
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error('el GPS tardó demasiado')), 15_000)),
    ]);
    const { latitude, longitude, speed, accuracy } = pos.coords;
    return { ok: true, datos: { t: Date.now(), lat: latitude, lon: longitude, velocidad: speed !== null && speed >= 0 ? speed : null, precision: accuracy ?? null } };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : 'no se pudo leer la ubicación' };
  }
}

/** Distancia aproximada en metros (equirectangular: sobra para 1 km). */
export function distanciaM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const x = (b.lon - a.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  const y = (b.lat - a.lat) * 110_574;
  return Math.hypot(x, y);
}

/** "350 m", "1,2 km". Como la ubicación está redondeada a ~100 m, menos de 100 m es "aquí cerca". */
export function textoDistancia(m: number): string {
  if (m < 100) return 'aquí cerca';
  if (m < 1000) return `${Math.round(m / 50) * 50} m`;
  return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/** "19:42" si es de hoy, "ayer", o "hace 3 días". */
export function textoCuando(t: number, ahora = Date.now()): string {
  const hoy = new Date(ahora);
  hoy.setHours(0, 0, 0, 0);
  if (t >= hoy.getTime()) return new Date(t).toTimeString().slice(0, 5);
  const dias = Math.ceil((hoy.getTime() - t) / 86_400_000);
  return dias <= 1 ? 'ayer' : `hace ${dias} días`;
}
