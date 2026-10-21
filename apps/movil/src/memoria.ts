import { hayBackend, urlBackend } from './alertas';
import { guardarPreferencias, preferencias } from './preferencias';

/**
 * "Tus notas de falsas alarmas" (Atomic Memory, a través del backend: la clave del proyecto nunca está en la
 * app). La app solo guarda la llave que le dio el backend. Las notas son un recordatorio para la dueña: el
 * detector y los avisos no las leen.
 */

export interface Nota {
  id: string;
  texto: string;
  motivo: string | null;
}

export const MAX_NOTA = 140;
/** El backend ya espera a Atomic Memory como mucho 4 s: con 8 s cubrimos eso más la red. */
const ESPERA_MS = 8000;
/** Borrar un lote son dos esperas seguidas en el backend (listar y borrar, 4 s cada una), más la red. */
const ESPERA_BORRAR_MS = 15_000;
/** Cada llamada borra hasta 10 notas: 100 vueltas = 1000 notas, mucho más de lo que deja la cuota diaria. */
const MAX_VUELTAS_BORRAR = 100;

export type Resultado<T> = { ok: true; datos: T } | { ok: false; motivo: string };
type Respuesta = { ok: true; datos: Record<string, unknown> } | { ok: false; motivo: string; estado: number | null };

async function pedir(ruta: string, llave: string | null, init: RequestInit = {}, esperaMs = ESPERA_MS): Promise<Respuesta> {
  if (!hayBackend()) return { ok: false, motivo: 'la app no está conectada al servidor', estado: null };
  const headers: Record<string, string> = init.body ? { 'Content-Type': 'application/json' } : {};
  if (llave) headers.Authorization = `Bearer ${llave}`;
  try {
    const r = await fetch(`${urlBackend()}${ruta}`, { ...init, headers, signal: AbortSignal.timeout(esperaMs) });
    const x: unknown = await r.json().catch(() => null);
    const d: Record<string, unknown> = typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
    if (!r.ok) return { ok: false, motivo: typeof d.detalle === 'string' ? d.detalle : `el servidor respondió ${r.status}`, estado: r.status };
    return { ok: true, datos: d };
  } catch (e) {
    return { ok: false, motivo: e instanceof Error && e.name === 'TimeoutError' ? 'el servidor tardó en responder' : 'sin conexión con el servidor', estado: null };
  }
}

/** `true`/`false` según el backend; `false` también si no hay backend o no responde: la sección no aparece. */
export async function memoriaActiva(): Promise<boolean> {
  if (!hayBackend()) return false;
  const r = await pedir('/api/memoria', null);
  return r.ok && r.datos.activa === true;
}

/** El backend ya no reconoce la llave (por ejemplo, otra base): la olvidamos para pedir una nueva al guardar. */
async function siLlaveInvalida(r: Respuesta): Promise<Respuesta> {
  if (!r.ok && r.estado === 401) await guardarPreferencias({ llaveMemoria: '' });
  return r;
}

/** Las notas de antes más parecidas al motivo de hoy. Sin llave todavía = no guardó ninguna. */
export async function buscarNotas(motivo: string | null): Promise<Resultado<Nota[]>> {
  const llave = preferencias().llaveMemoria;
  if (!llave) return { ok: true, datos: [] };
  const r = await siLlaveInvalida(await pedir(`/api/memoria/notas${motivo ? `?motivo=${encodeURIComponent(motivo)}` : ''}`, llave));
  if (!r.ok) return { ok: false, motivo: r.motivo };
  if (!Array.isArray(r.datos.notas)) return { ok: false, motivo: 'el servidor respondió algo que no entendimos' };
  const notas: Nota[] = [];
  for (const n of r.datos.notas as unknown[]) {
    if (typeof n !== 'object' || n === null) continue;
    const { id, texto, motivo: m } = n as Record<string, unknown>;
    if (typeof id === 'string' && typeof texto === 'string') notas.push({ id, texto, motivo: typeof m === 'string' ? m : null });
  }
  return { ok: true, datos: notas };
}

async function llaveParaGuardar(): Promise<Resultado<string>> {
  const actual = preferencias().llaveMemoria;
  if (actual) return { ok: true, datos: actual };
  const r = await pedir('/api/memoria/llave', null, { method: 'POST' });
  if (!r.ok) return { ok: false, motivo: r.motivo };
  if (typeof r.datos.llave !== 'string') return { ok: false, motivo: 'el servidor no entregó la llave' };
  await guardarPreferencias({ llaveMemoria: r.datos.llave });
  return { ok: true, datos: r.datos.llave };
}

/**
 * Guarda una nota (o corrige `reemplaza`). Solo devuelve `ok` si el backend confirma que Atomic Memory la guardó.
 * `anteriorBorrada: false` = la nueva quedó, pero la anterior sigue ahí.
 */
export async function guardarNota(texto: string, motivo: string | null, reemplaza?: string): Promise<Resultado<{ id: string; anteriorBorrada: boolean | null }>> {
  const llave = await llaveParaGuardar();
  if (!llave.ok) return llave;
  const r = await siLlaveInvalida(await pedir('/api/memoria/notas', llave.datos, { method: 'POST', body: JSON.stringify({ texto, motivo, reemplaza }) }));
  if (!r.ok) return { ok: false, motivo: r.motivo };
  if (r.datos.guardada !== true || typeof r.datos.id !== 'string') return { ok: false, motivo: 'el servidor no confirmó que se guardó' };
  return { ok: true, datos: { id: r.datos.id, anteriorBorrada: typeof r.datos.anteriorBorrada === 'boolean' ? r.datos.anteriorBorrada : null } };
}

export async function olvidarNota(id: string): Promise<Resultado<null>> {
  const llave = preferencias().llaveMemoria;
  if (!llave) return { ok: false, motivo: 'no hay notas guardadas en este celular' };
  const r = await siLlaveInvalida(await pedir(`/api/memoria/notas/${encodeURIComponent(id)}`, llave, { method: 'DELETE' }));
  if (!r.ok) return { ok: false, motivo: r.motivo };
  return r.datos.borrada === true ? { ok: true, datos: null } : { ok: false, motivo: 'el servidor no confirmó que se borró' };
}

/**
 * "Borrar todo" (Herramientas): borra en Atomic Memory todas las notas de este celular y recién entonces olvida
 * la llave. Si algo falla, devuelve el motivo y la llave se queda para reintentar: nunca deja notas huérfanas
 * diciendo que se borraron. Sin llave = nunca guardó notas: no hay nada que borrar.
 */
export async function borrarTodasLasNotas(): Promise<Resultado<null>> {
  const llave = preferencias().llaveMemoria;
  if (!llave) return { ok: true, datos: null };
  for (let vuelta = 0; vuelta < MAX_VUELTAS_BORRAR; vuelta++) {
    const r = await pedir('/api/memoria', llave, { method: 'DELETE' }, ESPERA_BORRAR_MS);
    if (!r.ok) {
      // 401: el servidor ya no conoce la llave (quizá se revocó en un intento cuya respuesta no llegó, o se perdió
      // la base). Con ella ya no se puede borrar nada: la olvidamos para no trabar "Borrar todo", pero no decimos
      // que las notas se borraron.
      if (r.estado === 401) {
        await guardarPreferencias({ llaveMemoria: '' });
        return { ok: false, motivo: 'el servidor ya no reconoce la llave de tus notas; si quedaba alguna, no se puede borrar desde aquí. Vuelve a intentar para borrar lo demás' };
      }
      return { ok: false, motivo: r.motivo };
    }
    if (r.datos.completa === true) {
      await guardarPreferencias({ llaveMemoria: '' });
      return { ok: true, datos: null };
    }
    if (typeof r.datos.borradas !== 'number' || r.datos.borradas < 1) return { ok: false, motivo: 'el servidor no confirmó que se borraron' };
  }
  return { ok: false, motivo: 'quedan notas por borrar; vuelve a intentar' };
}
