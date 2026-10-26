import { ErrorDeDatos } from './validar';

/**
 * "Tus notas de falsas alarmas" con Atomic Memory (opcional).
 *
 * Después de una falsa alarma, la dueña puede guardar una nota corta ("pasa cuando corro al paradero") y la
 * próxima vez la ve en la misma pantalla, con la opción de corregirla u olvidarla. Es solo un recordatorio
 * para ella: **nunca** decide si hubo arrebato, a quién avisar ni cuándo, y no es evidencia de nada. El
 * detector y los avisos no leen estas notas.
 *
 * Identidad: la app no tiene cuentas. El servidor entrega una llave aleatoria (256 bits) la primera vez que
 * la dueña guarda una nota y solo guarda su hash con un sujeto aleatorio (`vigia-<uuid>`). Ese sujeto es el
 * `user_id` de Atomic Memory: sale de la base, nunca de lo que mande el celular. Sin la llave no se puede
 * leer ni borrar la memoria de nadie.
 *
 * API (docs.atomicstrata.ai, HTTP de Atomic Memory): `POST /v1/memories/ingest/quick` (verbatim),
 * `POST /v1/memories/search/fast` y `DELETE /v1/memories/:id?user_id=`. Solo scope de usuario: sin
 * `session_id` (en Cloud reemplaza al sujeto), sin workspace ni agente.
 */

export interface EnvMemoria {
  DB: D1Database;
  /** `https://api.atomicstrata.ai` (Cloud) o la URL de un Core propio. Vacío = memoria apagada. */
  ATOMIC_MEMORY_URL?: string;
  /** Clave del proyecto (`amc_…`): secreto de Cloudflare, nunca en el repo ni en la app. */
  ATOMIC_MEMORY_API_KEY?: string;
}

export const MAX_NOTA = 140;
export const MAX_MOTIVO = 40;
/** Cuántas notas de antes mostramos: las más parecidas a lo que pasó hoy. */
export const MAX_NOTAS = 3;
/** Atomic Memory no debe trabar la pantalla: si tarda más, decimos que no respondió. */
export const ESPERA_MEMORIA_MS = 4000;
/** Separa estas notas de cualquier otra cosa del mismo proyecto de Atomic Memory. */
export const SITIO = 'vigia-falsas-alarmas';
/**
 * Cuotas (durables, en D1): Atomic Memory se paga por uso y `POST /api/memoria/llave` es público. Si se pasan,
 * la ruta responde 429 y no llama a Atomic Memory. No tocan las alertas: esas rutas no pasan por aquí.
 */
export const CUOTAS = {
  /** Llaves nuevas en todo el servicio, por hora. */
  llaveGlobalHora: 60,
  /** Llaves nuevas por red (HMAC de la IP), por día. */
  llaveRedDia: 5,
  /** Notas guardadas (o corregidas) por persona, por día. */
  escribirSujetoDia: 20,
  /** Notas guardadas en todo el servicio, por hora. */
  escribirGlobalHora: 300,
  /** Búsquedas de notas por persona, por día. */
  buscarSujetoDia: 60,
} as const;
const HORA_MS = 3600_000;
const DIA_MS = 24 * HORA_MS;
/** Cuántas notas borra cada llamada a `borrarTodo` (cada una es un subrequest del Worker; el plan gratis deja 50). */
export const LOTE_BORRADO = 10;

/** Las respuestas de Atomic Memory que usamos son chicas (3 notas de 140 caracteres): más que esto es un error. */
export const MAX_RESPUESTA = 64 * 1024;

const LLAVE = /^Bearer ([A-Za-z0-9_-]{43})$/;
const ID_MEMORIA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Nota {
  id: string;
  texto: string;
  motivo: string | null;
  creada: string | null;
}

export interface NotaNueva {
  texto: string;
  motivo: string | null;
  /** Corregir: la nota anterior se borra solo después de guardar la nueva. */
  reemplaza: string | null;
}

export type Resultado<T> = { ok: true; datos: T } | { ok: false; estado: number; detalle: string };

/**
 * La URL base, solo si es segura: HTTPS, o HTTP a la propia máquina (el fixture de las pruebas). Sin usuario,
 * contraseña, consulta ni fragmento. Cualquier otra cosa deja la memoria apagada: la clave nunca viaja en claro.
 */
export function urlMemoria(env: EnvMemoria): string | null {
  const texto = env.ATOMIC_MEMORY_URL?.trim();
  if (!texto) return null;
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return null;
  }
  const local = url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]';
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

export function memoriaActiva(env: EnvMemoria): boolean {
  return Boolean(urlMemoria(env) && env.ATOMIC_MEMORY_API_KEY?.trim());
}

function esRegistro(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** Lee el cuerpo sin pasar de `MAX_RESPUESTA` bytes. `null` si es más grande. */
async function leerAcotado(r: Response): Promise<string | null> {
  if (Number(r.headers.get('Content-Length') ?? 0) > MAX_RESPUESTA) {
    await r.body?.cancel().catch(() => undefined);
    return null;
  }
  if (!r.body) return '';
  const lector = r.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPUESTA) {
      await lector.cancel().catch(() => undefined);
      return null;
    }
    partes.push(value);
  }
  const todo = new Uint8Array(total);
  let i = 0;
  for (const p of partes) {
    todo.set(p, i);
    i += p.byteLength;
  }
  return new TextDecoder().decode(todo);
}

/** JSON de afuera: `null` si no es un objeto (JSON `null`, un número, una lista, o texto roto). */
function objetoJson(texto: string | null): Record<string, unknown> | null {
  if (!texto) return null;
  try {
    const x: unknown = JSON.parse(texto);
    return esRegistro(x) ? x : null;
  } catch {
    return null;
  }
}

export function esIdMemoria(id: string): boolean {
  return ID_MEMORIA.test(id);
}

export function validarNota(cuerpo: unknown): NotaNueva {
  if (typeof cuerpo !== 'object' || cuerpo === null) throw new ErrorDeDatos('falta la nota');
  const c = cuerpo as Record<string, unknown>;
  const texto = typeof c.texto === 'string' ? c.texto.replace(/\s+/g, ' ').trim() : '';
  if (!texto) throw new ErrorDeDatos('la nota está vacía');
  if (texto.length > MAX_NOTA) throw new ErrorDeDatos(`la nota tiene máximo ${MAX_NOTA} caracteres`);
  return { texto, motivo: validarMotivo(c.motivo), reemplaza: validarReemplaza(c.reemplaza) };
}

export function validarMotivo(valor: unknown): string | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || valor.trim().length > MAX_MOTIVO) throw new ErrorDeDatos('motivo inválido');
  return valor.trim();
}

function validarReemplaza(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string' || !esIdMemoria(valor)) throw new ErrorDeDatos('nota a corregir inválida');
  return valor;
}

async function hashDe(llave: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(llave)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Suma uno a cada cuota y dice cuál se pasó (`null` = todas bien). Es atómico por cuota (UPSERT con RETURNING):
 * dos pedidos a la vez no pueden pasar los dos con la última unidad. Lo que se pasó igual queda contado.
 */
export async function consumirCuotas(env: EnvMemoria, ahora: number, cuotas: { clave: string; ventanaMs: number; limite: number }[]): Promise<string | null> {
  const sentencias = cuotas.map((c) =>
    env.DB.prepare('INSERT INTO memoria_uso (clave, ventana, n) VALUES (?, ?, 1) ON CONFLICT (clave, ventana) DO UPDATE SET n = n + 1 RETURNING n').bind(
      c.clave,
      Math.floor(ahora / c.ventanaMs) * c.ventanaMs,
    ),
  );
  const resultados = await env.DB.batch<{ n: number }>(sentencias);
  for (let i = 0; i < cuotas.length; i++) {
    const n = resultados[i]?.results?.[0]?.n;
    if (typeof n !== 'number' || n > cuotas[i].limite) return cuotas[i].clave;
  }
  return null;
}

/** Borra las ventanas viejas (la tarea de cada minuto). */
export async function limpiarCuotas(env: EnvMemoria, ahora: number): Promise<void> {
  await env.DB.prepare('DELETE FROM memoria_uso WHERE ventana < ?').bind(ahora - 2 * DIA_MS).run();
}

/**
 * Para contar llaves por red sin guardar la IP: HMAC-SHA-256 de la IP con la clave del proyecto (un secreto que
 * no está en la base), recortado. Sin el secreto no se puede volver a la IP probando las 4 mil millones de IPv4.
 */
async function redDe(env: EnvMemoria, peticion: Request): Promise<string> {
  const ip = peticion.headers.get('CF-Connecting-IP')?.trim() || 'sin-ip';
  const secreto = new TextEncoder().encode(env.ATOMIC_MEMORY_API_KEY?.trim() || 'sin-clave');
  const llave = await crypto.subtle.importKey('raw', secreto, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const firma = new Uint8Array(await crypto.subtle.sign('HMAC', llave, new TextEncoder().encode(`vigia-red:${ip}`)));
  return Array.from(firma.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function cuotasLlave(red: string) {
  return [
    { clave: 'llave:global', ventanaMs: HORA_MS, limite: CUOTAS.llaveGlobalHora },
    { clave: `llave:red:${red}`, ventanaMs: DIA_MS, limite: CUOTAS.llaveRedDia },
  ];
}

export function cuotasEscribir(sujeto: string) {
  return [
    { clave: `escribir:${sujeto}`, ventanaMs: DIA_MS, limite: CUOTAS.escribirSujetoDia },
    { clave: 'escribir:global', ventanaMs: HORA_MS, limite: CUOTAS.escribirGlobalHora },
  ];
}

export function cuotasBuscar(sujeto: string) {
  return [{ clave: `buscar:${sujeto}`, ventanaMs: DIA_MS, limite: CUOTAS.buscarSujetoDia }];
}

/** Nueva llave para este celular, si la cuota lo permite (`null` = se pasó: 429). */
export async function entregarLlave(env: EnvMemoria, peticion: Request, ahora: number): Promise<string | null> {
  if (await consumirCuotas(env, ahora, cuotasLlave(await redDe(env, peticion)))) return null;
  return crearLlave(env, ahora);
}

/** Nueva llave para este celular. Se devuelve una sola vez; en la base queda solo su hash. */
export async function crearLlave(env: EnvMemoria, ahora: number): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const llave = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await env.DB.prepare('INSERT INTO memoria_llaves (llave_hash, sujeto, creada) VALUES (?, ?, ?)')
    .bind(await hashDe(llave), `vigia-${crypto.randomUUID()}`, ahora)
    .run();
  return llave;
}

/** El sujeto de Atomic Memory que corresponde a la llave de la cabecera `Authorization`, o `null`. */
export async function sujetoDe(env: EnvMemoria, peticion: Request): Promise<string | null> {
  const llave = peticion.headers.get('Authorization')?.match(LLAVE)?.[1];
  if (!llave) return null;
  const fila = await env.DB.prepare('SELECT sujeto FROM memoria_llaves WHERE llave_hash = ?').bind(await hashDe(llave)).first<{ sujeto: string }>();
  return fila?.sujeto ?? null;
}

async function llamar(env: EnvMemoria, metodo: 'GET' | 'POST' | 'DELETE', ruta: string, cuerpo?: unknown): Promise<Resultado<Record<string, unknown>>> {
  const base = urlMemoria(env);
  const clave = env.ATOMIC_MEMORY_API_KEY?.trim();
  if (!base || !clave) return { ok: false, estado: 503, detalle: 'la memoria no está configurada' };
  try {
    const r = await fetch(`${base}${ruta}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${clave}`, ...(cuerpo ? { 'Content-Type': 'application/json' } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      // Una redirección podría llevarse la clave a otro lado: no se sigue (Workers no acepta `redirect: 'error'`).
      redirect: 'manual',
      signal: AbortSignal.timeout(ESPERA_MEMORIA_MS),
    });
    if (r.status >= 300 && r.status < 400) {
      await r.body?.cancel().catch(() => undefined);
      return { ok: false, estado: 502, detalle: 'la memoria intentó redirigir' };
    }
    const datos = objetoJson(await leerAcotado(r));
    if (r.status === 404) return { ok: false, estado: 404, detalle: 'esa nota ya no existe' };
    if (!r.ok) {
      // Solo el código: el texto del proveedor podría repetir la nota de la dueña y no debe quedar en el log.
      console.warn('Atomic Memory respondió', r.status);
      return { ok: false, estado: 502, detalle: `la memoria respondió ${r.status}` };
    }
    if (!datos) return { ok: false, estado: 502, detalle: 'la memoria respondió algo que no entendimos' };
    return { ok: true, datos };
  } catch (e) {
    const tiempo = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return { ok: false, estado: 504, detalle: tiempo ? 'la memoria no respondió a tiempo' : 'no pudimos conectar con la memoria' };
  }
}

/** El filtro del proveedor no sustituye la atribución explícita de cada fila. */
function esFilaAjena(fila: Record<string, unknown>, sujeto: string): boolean {
  return (fila.user_id !== undefined && fila.user_id !== sujeto)
    || (fila.source_site !== undefined && fila.source_site !== SITIO);
}

/** Las notas de esta persona más parecidas al motivo de hoy (o a falsas alarmas en general). */
export async function buscarNotas(env: EnvMemoria, sujeto: string, motivo: string | null): Promise<Resultado<Nota[]>> {
  const r = await llamar(env, 'POST', '/v1/memories/search/fast', {
    user_id: sujeto,
    query: motivo ? `Falsa alarma de Vigía: ${motivo}` : 'Qué suele causar mis falsas alarmas de Vigía',
    source_site: SITIO,
    limit: MAX_NOTAS,
  });
  if (!r.ok) return r;
  if (!Array.isArray(r.datos.memories)) return { ok: false, estado: 502, detalle: 'la memoria respondió algo que no entendimos' };
  const notas: Nota[] = [];
  for (const m of r.datos.memories.slice(0, MAX_NOTAS) as unknown[]) {
    if (!esRegistro(m) || esFilaAjena(m, sujeto) || typeof m.id !== 'string' || !esIdMemoria(m.id) || typeof m.content !== 'string') continue;
    const meta = esRegistro(m.metadata) ? m.metadata : {};
    notas.push({
      id: m.id,
      texto: (typeof meta.nota === 'string' ? meta.nota : m.content).slice(0, MAX_NOTA),
      motivo: typeof meta.motivo === 'string' ? meta.motivo.slice(0, MAX_MOTIVO) : null,
      creada: typeof m.created_at === 'string' ? m.created_at : null,
    });
  }
  return { ok: true, datos: notas };
}

/** Guarda la nota tal cual (verbatim, sin extracción). Solo dice "guardada" si Atomic Memory devuelve su id. */
export async function guardarNota(env: EnvMemoria, sujeto: string, nota: NotaNueva): Promise<Resultado<{ id: string; anteriorBorrada: boolean | null }>> {
  const r = await llamar(env, 'POST', '/v1/memories/ingest/quick', {
    user_id: sujeto,
    conversation: nota.motivo ? `Falsa alarma de Vigía (${nota.motivo}): ${nota.texto}` : `Falsa alarma de Vigía: ${nota.texto}`,
    source_site: SITIO,
    skip_extraction: true,
    content_class: 'summary',
    metadata: { nota: nota.texto, ...(nota.motivo ? { motivo: nota.motivo } : {}) },
  });
  if (!r.ok) return r;
  const ids = [r.datos.stored_memory_ids, r.datos.updated_memory_ids].flatMap((x): unknown[] => (Array.isArray(x) ? x : [])).filter((x): x is string => typeof x === 'string' && esIdMemoria(x));
  if (!ids.length) return { ok: false, estado: 502, detalle: 'la memoria no confirmó que la guardó' };
  if (!nota.reemplaza || nota.reemplaza === ids[0]) return { ok: true, datos: { id: ids[0], anteriorBorrada: null } };
  const borrada = await borrarNota(env, sujeto, nota.reemplaza);
  return { ok: true, datos: { id: ids[0], anteriorBorrada: borrada.ok } };
}

/**
 * Borra una nota. `user_id` va siempre: Atomic Memory solo borra memorias de ese sujeto. Solo cuenta como
 * borrada si responde `{ "success": true }` (lo que documenta la API); cualquier otro 2xx no se da por hecho.
 */
export async function borrarNota(env: EnvMemoria, sujeto: string, id: string): Promise<Resultado<null>> {
  const r = await llamar(env, 'DELETE', `/v1/memories/${encodeURIComponent(id)}?user_id=${encodeURIComponent(sujeto)}`);
  if (!r.ok) return r;
  if (r.datos.success !== true) return { ok: false, estado: 502, detalle: 'la memoria no confirmó que la borró' };
  return { ok: true, datos: null };
}

/**
 * "Borrar todo": borra hasta `LOTE_BORRADO` notas de esta persona y, cuando Atomic Memory ya no lista ninguna,
 * revoca la llave (se borra su fila: el sujeto queda inaccesible). La app repite la llamada mientras
 * `completa` sea `false`, y solo olvida su llave con `completa: true`.
 *
 * Atomic Memory Cloud no expone `reset-source` (solo Core), así que se usa lo documentado y disponible en Cloud:
 * `GET /v1/memories/list?user_id=&source_site=&limit=&offset=0` (responde `{ memories, count }`) y
 * `DELETE /v1/memories/:id?user_id=` con `{ success: true }`. Siempre se lista desde `offset=0`: lo borrado sale
 * de la lista, así que no se saltan notas. Si un borrado no se confirma, se detiene y lo dice; la llave sigue.
 */
export async function borrarTodo(env: EnvMemoria, sujeto: string): Promise<Resultado<{ completa: boolean; borradas: number }>> {
  const r = await llamar(env, 'GET', `/v1/memories/list?user_id=${encodeURIComponent(sujeto)}&source_site=${encodeURIComponent(SITIO)}&limit=${LOTE_BORRADO}&offset=0`);
  if (!r.ok) return r;
  if (!Array.isArray(r.datos.memories)) return { ok: false, estado: 502, detalle: 'la memoria respondió algo que no entendimos' };
  const ids: string[] = [];
  for (const m of r.datos.memories.slice(0, LOTE_BORRADO) as unknown[]) {
    // Un elemento sin id válido no se puede borrar: no damos el borrado por completo con él adentro.
    if (!esRegistro(m) || esFilaAjena(m, sujeto) || typeof m.id !== 'string' || !esIdMemoria(m.id)
      || typeof m.content !== 'string' || !esRegistro(m.metadata) || typeof m.metadata.nota !== 'string') {
      return { ok: false, estado: 502, detalle: 'la memoria listó una nota que no podemos atribuir y borrar; conservamos la llave para reintentar' };
    }
    ids.push(m.id);
  }
  if (!ids.length) {
    await env.DB.prepare('DELETE FROM memoria_llaves WHERE sujeto = ?').bind(sujeto).run();
    return { ok: true, datos: { completa: true, borradas: 0 } };
  }
  const resultados = await Promise.all(ids.map((id) => borrarNota(env, sujeto, id)));
  // 404 = ya no existe (otra llamada la borró): para "borrar todo" eso también es borrada.
  const fallo = resultados.find((x): x is Extract<Resultado<null>, { ok: false }> => !x.ok && x.estado !== 404);
  if (fallo) return { ok: false, estado: fallo.estado, detalle: `no se pudieron borrar todas tus notas: ${fallo.detalle}` };
  return { ok: true, datos: { completa: false, borradas: ids.length } };
}
