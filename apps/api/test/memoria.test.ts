import { readdirSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import worker, { type Env } from '../src/index';
import { CUOTAS, LOTE_BORRADO, urlMemoria } from '../src/memoria';
import { iniciarProveedorFalso, type ProveedorFalso } from './fixtures/atomic-memory-falso';

/**
 * "Tus notas de falsas alarmas": el Worker completo con D1 local y un FIXTURE que imita Atomic Memory
 * (test/fixtures/atomic-memory-falso.ts). Ninguna prueba llama al servicio real.
 */

let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
let base: Env;
let env: Env;
let falso: ProveedorFalso;
const ctx = { waitUntil: (p: Promise<unknown>) => void p.catch(() => undefined), passThroughOnException() {} } as unknown as ExecutionContext;

async function pedir(ruta: string, init: RequestInit = {}, llave?: string, conEnv: Env = env): Promise<{ estado: number; datos: Record<string, unknown> }> {
  const headers = new Headers(init.headers);
  if (llave) headers.set('Authorization', `Bearer ${llave}`);
  const r = await worker.fetch(new Request(`https://prueba.local${ruta}`, { ...init, headers }), conEnv, ctx);
  return { estado: r.status, datos: (await r.json()) as Record<string, unknown> };
}

// Cada llave desde otra IP de prueba: la cuota por red (5 al día) se prueba aparte.
let ip = 0;
async function nuevaLlave(): Promise<string> {
  const r = await pedir('/api/memoria/llave', { method: 'POST', headers: { 'CF-Connecting-IP': `203.0.113.${++ip}` } });
  expect(r.estado).toBe(200);
  return r.datos.llave as string;
}

/** El `user_id` que el Worker mandó en la última nota guardada. */
const ultimoSujeto = () => falso.peticiones.filter((p) => p.ruta === '/v1/memories/ingest/quick').at(-1)?.cuerpo?.user_id as string;
const borrarTodo = (llave: string) => pedir('/api/memoria', { method: 'DELETE' }, llave);

const guardar = (llave: string, cuerpo: unknown) => pedir('/api/memoria/notas', { method: 'POST', body: JSON.stringify(cuerpo) }, llave);

beforeAll(async () => {
  proxy = await getPlatformProxy<Env>({ configPath: 'wrangler.jsonc', persist: false });
  base = { ...proxy.env, META_WA_TOKEN: undefined, ZAVU_API_KEY: undefined, ATOMIC_MEMORY_URL: undefined, ATOMIC_MEMORY_API_KEY: undefined } as Env;
  for (const archivo of readdirSync('migrations').sort()) {
    const sql = readFileSync(`migrations/${archivo}`, 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    for (const sentencia of sql.split(';').map((s) => s.trim()).filter(Boolean)) await base.DB.prepare(sentencia).run();
  }
  falso = await iniciarProveedorFalso();
  env = { ...base, ATOMIC_MEMORY_URL: falso.url, ATOMIC_MEMORY_API_KEY: falso.clave };
}, 30_000);

afterAll(async () => {
  await falso?.cerrar();
  await proxy?.dispose();
});

beforeEach(() => {
  falso.modo = 'normal';
});

describe('Memoria apagada (sin configurar)', () => {
  it('dice que no está activa y no llama a nadie', async () => {
    const antes = falso.peticiones.length;
    expect((await pedir('/api/memoria', {}, undefined, base)).datos).toEqual({ ok: true, activa: false });
    const llave = await pedir('/api/memoria/llave', { method: 'POST' }, undefined, base);
    expect(llave.estado).toBe(503);
    expect(llave.datos.activa).toBe(false);
    expect((await pedir('/api/memoria/notas', {}, 'x'.repeat(43), base)).estado).toBe(503);
    expect(falso.peticiones.length).toBe(antes);
  });

  it('solo acepta HTTPS (o HTTP a la propia máquina): si no, la memoria queda apagada', async () => {
    const con = (url: string) => urlMemoria({ DB: base.DB, ATOMIC_MEMORY_URL: url, ATOMIC_MEMORY_API_KEY: 'amc_x' });
    expect(con('https://api.atomicstrata.ai/')).toBe('https://api.atomicstrata.ai');
    expect(con('http://127.0.0.1:4607')).toBe('http://127.0.0.1:4607');
    expect(con('http://localhost:4607')).toBe('http://localhost:4607');
    for (const mala of ['http://api.atomicstrata.ai', 'ftp://127.0.0.1', 'file:///etc/passwd', 'https://u:p@api.atomicstrata.ai', 'https://api.atomicstrata.ai/?x=1', 'no es url']) expect(con(mala)).toBeNull();
    const enClaro = { ...base, ATOMIC_MEMORY_URL: 'http://api.atomicstrata.ai', ATOMIC_MEMORY_API_KEY: 'amc_x' } as Env;
    expect((await pedir('/api/memoria', {}, undefined, enClaro)).datos.activa).toBe(false);
  });

  it('el resto del backend sigue igual', async () => {
    const r = await worker.fetch(new Request('https://prueba.local/api/salud'), base, ctx);
    expect(r.status).toBe(200);
  });
});

describe('Notas de falsas alarmas con Atomic Memory', () => {
  it('guarda una nota y la recupera la próxima vez, con el sujeto del servidor', async () => {
    expect((await pedir('/api/memoria')).datos.activa).toBe(true);
    const llave = await nuevaLlave();
    const g = await guardar(llave, { texto: '  Pasa cuando corro   al paradero del Metropolitano ', motivo: 'Corrí' });
    expect(g.estado).toBe(200);
    expect(g.datos).toMatchObject({ ok: true, guardada: true });
    expect(typeof g.datos.id).toBe('string');

    const ingest = falso.peticiones.filter((p) => p.ruta === '/v1/memories/ingest/quick').at(-1);
    expect(ingest?.cuerpo).toMatchObject({ skip_extraction: true, content_class: 'summary', source_site: 'vigia-falsas-alarmas', metadata: { nota: 'Pasa cuando corro al paradero del Metropolitano', motivo: 'Corrí' } });
    // Solo scope de usuario: sin session_id (en Cloud reemplaza al sujeto), sin workspace ni agente.
    expect(ingest?.cuerpo).not.toHaveProperty('session_id');
    expect(ingest?.cuerpo).not.toHaveProperty('workspace_id');
    expect(ingest?.cuerpo).not.toHaveProperty('agent_id');
    const sujeto = ingest?.cuerpo?.user_id as string;
    expect(sujeto).toMatch(/^vigia-[0-9a-f-]{36}$/);
    expect(sujeto).not.toContain(llave);
    // La clave del proyecto viaja solo entre el Worker y Atomic Memory.
    expect(ingest?.autorizacion).toBe(`Bearer ${falso.clave}`);

    const b = await pedir('/api/memoria/notas?motivo=Corr%C3%AD', {}, llave);
    expect(b.estado).toBe(200);
    expect(b.datos.notas).toEqual([{ id: g.datos.id, texto: 'Pasa cuando corro al paradero del Metropolitano', motivo: 'Corrí', creada: expect.any(String) }]);
    const busqueda = falso.peticiones.filter((p) => p.ruta === '/v1/memories/search/fast').at(-1);
    expect(busqueda?.cuerpo).toMatchObject({ user_id: sujeto, limit: 3, source_site: 'vigia-falsas-alarmas' });
  });

  it('una persona nunca ve ni borra las notas de otra', async () => {
    const ana = await nuevaLlave();
    const beto = await nuevaLlave();
    const g = await guardar(ana, { texto: 'Se me cae al bajar de la combi', motivo: 'Se me cayó' });
    expect((await pedir('/api/memoria/notas?motivo=Se%20me%20cay%C3%B3', {}, beto)).datos.notas).toEqual([]);
    const borrar = await pedir(`/api/memoria/notas/${g.datos.id}`, { method: 'DELETE' }, beto);
    expect(borrar.estado).toBe(404);
    expect(falso.memorias.some((m) => m.id === g.datos.id)).toBe(true);
    expect((await pedir('/api/memoria/notas', {}, ana)).datos.notas).toHaveLength(1);
  });

  it('sin llave, o con una que el servidor no entregó, responde 401 sin llamar a Atomic Memory', async () => {
    const antes = falso.peticiones.length;
    expect((await pedir('/api/memoria/notas')).estado).toBe(401);
    expect((await pedir('/api/memoria/notas', {}, 'A'.repeat(43))).estado).toBe(401);
    expect((await guardar('inventada', { texto: 'hola' })).estado).toBe(401);
    expect(falso.peticiones.length).toBe(antes);
  });

  it('corregir guarda la nueva y recién entonces borra la anterior; olvidar la borra', async () => {
    const llave = await nuevaLlave();
    const vieja = await guardar(llave, { texto: 'Pasa en el taxi', motivo: 'Iba en auto o taxi' });
    const nueva = await guardar(llave, { texto: 'Pasa en el taxi colectivo por la Panamericana', motivo: 'Iba en auto o taxi', reemplaza: vieja.datos.id });
    expect(nueva.datos).toMatchObject({ guardada: true, anteriorBorrada: true });
    const notas = (await pedir('/api/memoria/notas', {}, llave)).datos.notas as { id: string; texto: string }[];
    expect(notas.map((n) => n.texto)).toEqual(['Pasa en el taxi colectivo por la Panamericana']);

    const olvidar = await pedir(`/api/memoria/notas/${nueva.datos.id}`, { method: 'DELETE' }, llave);
    expect(olvidar.datos).toEqual({ ok: true, borrada: true });
    expect((await pedir('/api/memoria/notas', {}, llave)).datos.notas).toEqual([]);
    expect((await pedir(`/api/memoria/notas/${nueva.datos.id}`, { method: 'DELETE' }, llave)).estado).toBe(404);
  });

  it('si Atomic Memory falla, no dice que guardó', async () => {
    const llave = await nuevaLlave();
    falso.modo = 'falla';
    const g = await guardar(llave, { texto: 'Pasa en la bici' });
    expect(g.estado).toBe(502);
    expect(g.datos).toEqual({ ok: false, detalle: 'la memoria respondió 503' });
    expect((await pedir('/api/memoria/notas', {}, llave)).estado).toBe(502);
  });

  it('si Atomic Memory no devuelve el id de lo guardado, tampoco cuenta como guardada', async () => {
    const llave = await nuevaLlave();
    falso.modo = 'sin_ids';
    const g = await guardar(llave, { texto: 'Pasa en el gimnasio' });
    expect(g.estado).toBe(502);
    expect(g.datos.guardada).toBeUndefined();
    expect(g.datos.detalle).toBe('la memoria no confirmó que la guardó');
  });

  it('si Atomic Memory tarda, corta a los 4 s y lo dice', async () => {
    const llave = await nuevaLlave();
    falso.modo = 'lento';
    const inicio = Date.now();
    const g = await guardar(llave, { texto: 'Pasa al subir escaleras' });
    expect(Date.now() - inicio).toBeLessThan(5500);
    expect(g.estado).toBe(504);
    expect(g.datos).toEqual({ ok: false, detalle: 'la memoria no respondió a tiempo' });
  }, 10_000);

  it('si Atomic Memory no confirma el borrado (success distinto de true), la nota no cuenta como borrada', async () => {
    const llave = await nuevaLlave();
    const g = await guardar(llave, { texto: 'Pasa al bajar del tren' });
    falso.modo = 'borrado_falso';
    const b = await pedir(`/api/memoria/notas/${g.datos.id}`, { method: 'DELETE' }, llave);
    expect(b.estado).toBe(502);
    expect(b.datos).toEqual({ ok: false, detalle: 'la memoria no confirmó que la borró' });
    falso.modo = 'normal';
    expect((await pedir('/api/memoria/notas', {}, llave)).datos.notas).toHaveLength(1);
    // Corregir con un borrado no confirmado: la nueva queda y se avisa que la anterior sigue.
    const otra = await guardar(llave, { texto: 'Pasa al bajar del tren eléctrico' });
    falso.modo = 'borrado_falso';
    const c = await guardar(llave, { texto: 'Pasa al bajar del tren, estación Angamos', reemplaza: otra.datos.id });
    expect(c.datos).toMatchObject({ guardada: true, anteriorBorrada: false });
  });

  it('respuestas raras de Atomic Memory (JSON null, enormes o redirecciones) no rompen el Worker ni se dan por buenas', async () => {
    const llave = await nuevaLlave();
    const notaId = (await guardar(llave, { texto: 'Pasa en la escalera mecánica' })).datos.id as string;
    for (const modo of ['json_null', 'enorme'] as const) {
      falso.modo = modo;
      const b = await pedir('/api/memoria/notas', {}, llave);
      expect(b.estado).toBe(502);
      expect(b.datos).toEqual({ ok: false, detalle: 'la memoria respondió algo que no entendimos' });
      expect((await guardar(llave, { texto: 'otra' })).estado).toBe(502);
      expect((await pedir(`/api/memoria/notas/${notaId}`, { method: 'DELETE' }, llave)).estado).toBe(502);
    }
    falso.modo = 'redireccion';
    const r = await pedir('/api/memoria/notas', {}, llave);
    expect(r.estado).toBe(502);
    expect(r.datos).toEqual({ ok: false, detalle: 'la memoria intentó redirigir' });
    // La redirección no se siguió: la clave no salió hacia el otro sitio.
    expect(falso.peticiones.at(-1)?.ruta).toBe('/v1/memories/search/fast');
    falso.modo = 'normal';
    expect((await pedir('/api/memoria/notas', {}, llave)).datos.notas).toHaveLength(1);
  });

  it('rechaza notas vacías, largas o ids raros antes de llamar a Atomic Memory', async () => {
    const llave = await nuevaLlave();
    const antes = falso.peticiones.length;
    expect((await guardar(llave, { texto: '   ' })).estado).toBe(400);
    expect((await guardar(llave, { texto: 'a'.repeat(141) })).estado).toBe(400);
    expect((await guardar(llave, { texto: 'ok', reemplaza: '../../otra' })).estado).toBe(400);
    expect((await pedir('/api/memoria/notas/no-es-un-id', { method: 'DELETE' }, llave)).estado).toBe(404);
    expect(falso.peticiones.length).toBe(antes);
  });
});

describe('Borrar todo (Herramientas): primero Atomic Memory, después la llave', () => {
  it('borra por lotes todas las notas de esa persona (y solo las suyas) y recién al final revoca la llave', async () => {
    const llave = await nuevaLlave();
    const otra = await nuevaLlave();
    await guardar(otra, { texto: 'Nota de otra persona' });
    const total = LOTE_BORRADO + 2;
    for (let i = 0; i < total; i++) expect((await guardar(llave, { texto: `Nota ${i}` })).estado).toBe(200);
    const sujeto = ultimoSujeto();

    const primera = await borrarTodo(llave);
    expect(primera.datos).toEqual({ ok: true, completa: false, borradas: LOTE_BORRADO });
    const segunda = await borrarTodo(llave);
    expect(segunda.datos).toEqual({ ok: true, completa: false, borradas: 2 });
    // Mientras no esté completa, la llave sigue sirviendo (para reintentar).
    expect((await pedir('/api/memoria/notas', {}, llave)).estado).toBe(200);
    const fin = await borrarTodo(llave);
    expect(fin.datos).toEqual({ ok: true, completa: true, borradas: 0 });

    expect(falso.memorias.filter((m) => m.user_id === sujeto)).toEqual([]);
    expect((await pedir('/api/memoria/notas', {}, otra)).datos.notas).toHaveLength(1);
    expect((await pedir('/api/memoria/notas', {}, llave)).estado).toBe(401);
    const fila = await base.DB.prepare('SELECT COUNT(*) AS n FROM memoria_llaves WHERE sujeto = ?').bind(sujeto).first<{ n: number }>();
    expect(fila?.n).toBe(0);
    // Siempre lista desde el inicio, con el sujeto y el sitio de Vigía, sin session_id.
    const lista = falso.peticiones.filter((p) => p.ruta.startsWith('/v1/memories/list')).at(-1)?.ruta ?? '';
    expect(lista).toContain(`user_id=${sujeto}`);
    expect(lista).toContain('source_site=vigia-falsas-alarmas');
    expect(lista).toContain('offset=0');
    expect(lista).not.toContain('session_id');
  });

  it('si un borrado no se confirma, lo dice y la llave sigue para reintentar', async () => {
    const llave = await nuevaLlave();
    await guardar(llave, { texto: 'Pasa en el ascensor' });
    falso.modo = 'borrado_falso';
    const r = await borrarTodo(llave);
    expect(r.estado).toBe(502);
    expect(r.datos).toEqual({ ok: false, detalle: 'no se pudieron borrar todas tus notas: la memoria no confirmó que la borró' });
    falso.modo = 'normal';
    expect((await pedir('/api/memoria/notas', {}, llave)).datos.notas).toHaveLength(1);
    // El reintento termina el trabajo.
    expect((await borrarTodo(llave)).datos).toMatchObject({ completa: false, borradas: 1 });
    expect((await borrarTodo(llave)).datos).toMatchObject({ completa: true });
  });

  it('si el listado falla o llega raro, no revoca la llave ni dice que terminó', async () => {
    const llave = await nuevaLlave();
    await guardar(llave, { texto: 'Pasa en el estadio' });
    for (const modo of ['falla', 'json_null'] as const) {
      falso.modo = modo;
      const r = await borrarTodo(llave);
      expect(r.estado).toBe(502);
      expect(r.datos.completa).toBeUndefined();
    }
    falso.modo = 'normal';
    expect((await pedir('/api/memoria/notas', {}, llave)).estado).toBe(200);
  });

  it('sin llave válida no borra nada', async () => {
    const antes = falso.peticiones.length;
    expect((await borrarTodo('B'.repeat(43))).estado).toBe(401);
    expect(falso.peticiones.length).toBe(antes);
  });
});

describe('Cuotas (Atomic Memory se paga por uso)', () => {
  const ventanaHora = () => Math.floor(Date.now() / 3600_000) * 3600_000;
  const ventanaDia = () => Math.floor(Date.now() / 86_400_000) * 86_400_000;
  const llenar = (clave: string, ventana: number, n: number) =>
    base.DB.prepare('INSERT INTO memoria_uso (clave, ventana, n) VALUES (?, ?, ?) ON CONFLICT (clave, ventana) DO UPDATE SET n = excluded.n').bind(clave, ventana, n).run();
  const llaves = async () => (await base.DB.prepare('SELECT COUNT(*) AS n FROM memoria_llaves').first<{ n: number }>())?.n ?? 0;

  it('máximo 5 llaves al día por red, sin guardar la IP', async () => {
    const pedirLlave = () => pedir('/api/memoria/llave', { method: 'POST', headers: { 'CF-Connecting-IP': '198.51.100.7' } });
    for (let i = 0; i < CUOTAS.llaveRedDia; i++) expect((await pedirLlave()).estado).toBe(200);
    const antes = await llaves();
    const r = await pedirLlave();
    expect(r.estado).toBe(429);
    expect(r.datos.llave).toBeUndefined();
    expect(await llaves()).toBe(antes);
    const claves = await base.DB.prepare('SELECT clave FROM memoria_uso').all<{ clave: string }>();
    expect(claves.results.some((c) => c.clave.includes('198.51.100.7'))).toBe(false);
    expect(claves.results.some((c) => /^llave:red:[0-9a-f]{24}$/.test(c.clave))).toBe(true);
    // Otra red sí puede.
    expect((await pedir('/api/memoria/llave', { method: 'POST', headers: { 'CF-Connecting-IP': '198.51.100.8' } })).estado).toBe(200);
  });

  it('tope de llaves por hora en todo el servicio', async () => {
    await llenar('llave:global', ventanaHora(), CUOTAS.llaveGlobalHora);
    try {
      const antes = await llaves();
      expect((await pedir('/api/memoria/llave', { method: 'POST', headers: { 'CF-Connecting-IP': '192.0.2.1' } })).estado).toBe(429);
      expect(await llaves()).toBe(antes);
    } finally {
      await base.DB.prepare(`DELETE FROM memoria_uso WHERE clave = 'llave:global'`).run();
    }
  });

  it('máximo de notas guardadas y búsquedas al día por persona, sin llamar a Atomic Memory', async () => {
    const llave = await nuevaLlave();
    await guardar(llave, { texto: 'Primera nota' });
    const sujeto = ultimoSujeto();
    await llenar(`escribir:${sujeto}`, ventanaDia(), CUOTAS.escribirSujetoDia);
    await llenar(`buscar:${sujeto}`, ventanaDia(), CUOTAS.buscarSujetoDia);
    const antes = falso.peticiones.length;
    const g = await guardar(llave, { texto: 'Una más' });
    expect(g.estado).toBe(429);
    expect(g.datos.guardada).toBeUndefined();
    expect((await pedir('/api/memoria/notas', {}, llave)).estado).toBe(429);
    expect(falso.peticiones.length).toBe(antes);
    // Borrar lo propio no tiene cuota.
    expect((await borrarTodo(llave)).estado).toBe(200);
  });

  it('tope de notas guardadas por hora en todo el servicio', async () => {
    const llave = await nuevaLlave();
    await llenar('escribir:global', ventanaHora(), CUOTAS.escribirGlobalHora);
    try {
      expect((await guardar(llave, { texto: 'No entra' })).estado).toBe(429);
    } finally {
      await base.DB.prepare(`DELETE FROM memoria_uso WHERE clave = 'escribir:global'`).run();
    }
  });

  it('la tarea de cada minuto borra las ventanas viejas y las alertas siguen igual', async () => {
    await llenar('llave:global', Date.now() - 3 * 86_400_000, 1);
    await worker.scheduled({} as ScheduledController, env);
    const vieja = await base.DB.prepare('SELECT COUNT(*) AS n FROM memoria_uso WHERE ventana < ?').bind(Date.now() - 2 * 86_400_000).first<{ n: number }>();
    expect(vieja?.n).toBe(0);
  });
});

describe('atribución explícita de las filas del proveedor', () => {
  it('la búsqueda excluye filas válidas de otro sujeto o aplicación', async () => {
    const llave = await nuevaLlave();
    await guardar(llave, { texto: 'Pasa cuando corro al paradero' });
    for (const modo of ['usuario_ajeno', 'sitio_ajeno'] as const) {
      falso.modo = modo;
      const r = await pedir('/api/memoria/notas', {}, llave);
      expect(r.estado).toBe(200);
      expect(r.datos.notas).toEqual([]);
    }
    falso.modo = 'normal';
    expect((await pedir('/api/memoria/notas', {}, llave)).datos.notas).toHaveLength(1);
  });

  it('borrar todo rechaza filas ajenas o malformadas sin borrar ids ni revocar la llave', async () => {
    const llave = await nuevaLlave();
    await guardar(llave, { texto: 'Pasa cuando subo escaleras' });
    const antes = falso.peticiones.filter(p => p.metodo === 'DELETE').length;
    for (const modo of ['usuario_ajeno', 'sitio_ajeno', 'fila_rota'] as const) {
      falso.modo = modo;
      const r = await borrarTodo(llave);
      expect(r.estado).toBe(502);
      expect(r.datos.completa).toBeUndefined();
      expect(falso.peticiones.filter(p => p.metodo === 'DELETE')).toHaveLength(antes);
    }
    falso.modo = 'normal';
    expect((await pedir('/api/memoria/notas', {}, llave)).datos.notas).toHaveLength(1);
  });
});
