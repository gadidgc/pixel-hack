import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';

/**
 * FIXTURE DE PRUEBA: imitación local de Atomic Memory. NO es el servicio real ni guarda nada fuera de este proceso.
 *
 * Responde solo las rutas que usa src/memoria.ts, con la forma de la API HTTP oficial
 * (docs.atomicstrata.ai/api-reference/http): `POST /v1/memories/ingest/quick`, `POST /v1/memories/search/fast`,
 * `GET /v1/memories/list` (`{ memories, count }`, con `limit`/`offset`, por defecto 20) y
 * `DELETE /v1/memories/:id?user_id=`. La búsqueda es por palabras en común, no semántica.
 *
 * Solo lo usan las pruebas (test/memoria.test.ts).
 */

/**
 * `normal` imita la API. Los demás simulan fallas: 503, más de 4 s, sin ids al guardar, `success: false` al borrar,
 * JSON `null` en todo, una redirección (que no se debe seguir) y una respuesta enorme.
 */
export type ModoFalso = 'normal' | 'falla' | 'lento' | 'sin_ids' | 'borrado_falso' | 'json_null' | 'redireccion' | 'enorme' | 'usuario_ajeno' | 'sitio_ajeno' | 'fila_rota';

interface MemoriaFalsa {
  id: string;
  user_id: string;
  source_site: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProveedorFalso {
  url: string;
  clave: string;
  memorias: MemoriaFalsa[];
  peticiones: { metodo: string; ruta: string; cuerpo: Record<string, unknown> | null; autorizacion: string | null }[];
  modo: ModoFalso;
  cerrar: () => Promise<void>;
}

const palabras = (t: string) => new Set(t.toLowerCase().normalize('NFD').replace(/[^a-z0-9ñ ]/g, ' ').split(/\s+/).filter((p) => p.length > 2));

async function leer(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  let texto = '';
  for await (const parte of req) texto += parte;
  if (!texto) return null;
  try {
    return JSON.parse(texto) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function iniciarProveedorFalso(puerto = 0, clave = 'amc_fixture_no_es_real'): Promise<ProveedorFalso> {
  const estado = { memorias: [] as MemoriaFalsa[], peticiones: [] as ProveedorFalso['peticiones'], modo: 'normal' as ModoFalso };
  const servidor: Server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const cuerpo = await leer(req);
    const autorizacion = req.headers.authorization ?? null;
    estado.peticiones.push({ metodo: req.method ?? '', ruta: url.pathname + url.search, cuerpo, autorizacion });
    const responder = (codigo: number, datos: unknown) => {
      res.writeHead(codigo, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(datos));
    };
    if (autorizacion !== `Bearer ${clave}`) return responder(401, { error: 'invalid api key' });
    if (estado.modo === 'falla') return responder(503, { error: 'upstream unavailable', retryable: true });
    if (estado.modo === 'lento') await new Promise((r) => setTimeout(r, 6000));
    if (estado.modo === 'json_null') return responder(200, null);
    if (estado.modo === 'enorme') return responder(200, { memories: [], relleno: 'x'.repeat(200_000) });
    if (estado.modo === 'redireccion') {
      res.writeHead(307, { Location: 'https://otro-sitio.invalid/robar-clave' });
      return res.end();
    }

    if (req.method === 'POST' && url.pathname === '/v1/memories/ingest/quick') {
      const c = cuerpo ?? {};
      if (typeof c.user_id !== 'string' || typeof c.conversation !== 'string' || typeof c.source_site !== 'string') return responder(400, { error: 'user_id, conversation and source_site are required' });
      const ids: string[] = [];
      if (estado.modo !== 'sin_ids') {
        const m: MemoriaFalsa = { id: randomUUID(), user_id: c.user_id, source_site: c.source_site, content: c.conversation, metadata: (c.metadata as Record<string, unknown>) ?? {}, created_at: new Date().toISOString() };
        estado.memorias.push(m);
        ids.push(m.id);
      }
      return responder(200, { episode_id: randomUUID(), facts_extracted: 0, memories_stored: ids.length, memories_updated: 0, memories_deleted: 0, memories_skipped: ids.length ? 0 : 1, stored_memory_ids: ids, updated_memory_ids: [], links_created: 0, composites_created: 0 });
    }
    if (req.method === 'POST' && url.pathname === '/v1/memories/search/fast') {
      const c = cuerpo ?? {};
      if (typeof c.user_id !== 'string' || typeof c.query !== 'string') return responder(400, { error: 'user_id and query are required' });
      const consulta = palabras(c.query);
      const limite = typeof c.limit === 'number' ? c.limit : 10;
      const memorias = estado.memorias
        .filter((m) => m.user_id === c.user_id && (!c.source_site || m.source_site === c.source_site))
        .map((m) => ({ m, puntos: [...palabras(m.content)].filter((p) => consulta.has(p)).length }))
        .sort((a, b) => b.puntos - a.puntos || b.m.created_at.localeCompare(a.m.created_at))
        .slice(0, limite)
        .map(({ m, puntos }) => ({ id: m.id, user_id: estado.modo === 'usuario_ajeno' ? 'otro-sujeto' : m.user_id, source_site: estado.modo === 'sitio_ajeno' ? 'otra-app' : m.source_site, content: m.content, metadata: m.metadata, created_at: m.created_at, relevance: puntos }));
      return responder(200, { count: memorias.length, memories: memorias });
    }
    if (req.method === 'GET' && url.pathname === '/v1/memories/list') {
      const usuario = url.searchParams.get('user_id');
      if (!usuario) return responder(400, { error: 'user_id is required' });
      const sitio = url.searchParams.get('source_site');
      const limite = Number(url.searchParams.get('limit') ?? 20);
      const desde = Number(url.searchParams.get('offset') ?? 0);
      const memorias = estado.memorias
        .filter((m) => m.user_id === usuario && (!sitio || m.source_site === sitio))
        .slice(desde, desde + limite)
        .map((m) => estado.modo === 'fila_rota' ? { id: m.id, user_id: m.user_id, source_site: m.source_site } : ({ id: m.id, user_id: estado.modo === 'usuario_ajeno' ? 'otro-sujeto' : m.user_id, source_site: estado.modo === 'sitio_ajeno' ? 'otra-app' : m.source_site, content: m.content, metadata: m.metadata, created_at: m.created_at }));
      return responder(200, { memories: memorias, count: memorias.length });
    }
    const borrar = url.pathname.match(/^\/v1\/memories\/([^/]+)$/);
    if (req.method === 'DELETE' && borrar) {
      const usuario = url.searchParams.get('user_id');
      if (!usuario) return responder(400, { error: 'user_id (string) is required' });
      const i = estado.memorias.findIndex((m) => m.id === borrar[1] && m.user_id === usuario);
      if (i < 0) return responder(404, { error: 'Memory not found' });
      if (estado.modo === 'borrado_falso') return responder(200, { success: false });
      estado.memorias.splice(i, 1);
      return responder(200, { success: true });
    }
    return responder(404, { error: 'not found' });
  });
  await new Promise<void>((listo) => servidor.listen(puerto, '127.0.0.1', listo));
  const direccion = servidor.address();
  const real = typeof direccion === 'object' && direccion ? direccion.port : puerto;
  return {
    url: `http://127.0.0.1:${real}`,
    clave,
    get memorias() {
      return estado.memorias;
    },
    get peticiones() {
      return estado.peticiones;
    },
    get modo() {
      return estado.modo;
    },
    set modo(m: ModoFalso) {
      estado.modo = m;
    },
    cerrar: () => new Promise<void>((listo) => servidor.close(() => listo())),
  };
}
