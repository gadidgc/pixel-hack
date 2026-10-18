import { readdirSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import worker, { type Env } from '../src/index';

/**
 * Pruebas del Worker completo contra una D1 y un R2 locales (los de `wrangler dev`, en memoria).
 * Sin claves de Meta ni de Zavu: ningún mensaje sale de verdad, pero cada intento queda en `envios`.
 */

let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
let env: Env;
// La cuenta del servidor (`waitUntil`) espera decenas de segundos: aquí no la esperamos.
const ctx = { waitUntil: (p: Promise<unknown>) => void p.catch(() => undefined), passThroughOnException() {} } as unknown as ExecutionContext;
const BASE = 'https://prueba.local';

async function pedir(ruta: string, init?: RequestInit, conEnv: Env = env): Promise<Response> {
  return worker.fetch(new Request(`${BASE}${ruta}`, init), conEnv, ctx);
}

async function evento(cuerpo: unknown, conEnv: Env = env): Promise<Record<string, unknown>> {
  const r = await pedir('/api/eventos', { method: 'POST', body: JSON.stringify(cuerpo) }, conEnv);
  return (await r.json()) as Record<string, unknown>;
}

async function envios(alertaId: string, tipo: string): Promise<number> {
  const fila = await env.DB.prepare('SELECT COUNT(*) AS n FROM envios WHERE alerta_id = ? AND tipo = ?').bind(alertaId, tipo).first<{ n: number }>();
  return fila?.n ?? 0;
}

const contactos = [
  { nombre: 'Mamá', telefono: '987654321' },
  { nombre: 'Papá', telefono: '987654322' },
];
const jalon = (tJalon: number) => ({ tJalon, via: 'velocidad_gps', confianza: 'alta', velocidadMs: 9, posicionJalon: { t: tJalon, lat: -12.1, lon: -77.03 } });

beforeAll(async () => {
  proxy = await getPlatformProxy<Env>({ configPath: 'wrangler.jsonc', persist: false });
  // Sin proveedores: que ninguna prueba mande un WhatsApp o un SMS real.
  env = { ...proxy.env, META_WA_TOKEN: undefined, ZAVU_API_KEY: undefined } as Env;
  for (const archivo of readdirSync('migrations').sort()) {
    const sql = readFileSync(`migrations/${archivo}`, 'utf8')
      .split('\n')
      .filter((l) => !l.trim().startsWith('--'))
      .join('\n');
    for (const sentencia of sql.split(';').map((s) => s.trim()).filter(Boolean)) await env.DB.prepare(sentencia).run();
  }
}, 30_000);

afterAll(async () => {
  await proxy?.dispose();
});

let n = 0;
let dispositivo = '';
beforeEach(() => {
  dispositivo = `prueba-${++n}`;
});

describe('Worker: carreras y casos borde', () => {
  it('si la dueña cancela mientras el servidor avisa, la red recibe también el "está bien"', async () => {
    const a = await evento({ tipo: 'alerta', dispositivo, evento: jalon(1000), ruta: [], nombre: 'Lucía', contactos, esperaS: 60 });
    const id = a.id as string;
    // Simula la carrera: el servidor marca la alerta como avisada justo antes de que llegue la cancelación.
    let carrera = false;
    const db = {
      prepare(sql: string) {
        if (!carrera && sql.includes(`SET estado = 'cancelada'`)) {
          carrera = true;
          return {
            bind: (...v: unknown[]) => ({
              run: async () => {
                await env.DB.prepare(`UPDATE alertas SET estado = 'avisada' WHERE id = ?`).bind(id).run();
                return env.DB.prepare(sql).bind(...v).run();
              },
            }),
          };
        }
        return env.DB.prepare(sql);
      },
      batch: (s: D1PreparedStatement[]) => env.DB.batch(s),
    } as unknown as D1Database;
    await evento({ tipo: 'cancelada', dispositivo }, { ...env, DB: db });
    expect(carrera).toBe(true);
    expect(await envios(id, 'esta_bien')).toBe(2);
    const fila = await env.DB.prepare('SELECT estado, contactos_json FROM alertas WHERE id = ?').bind(id).first<{ estado: string; contactos_json: string | null }>();
    expect(fila).toEqual({ estado: 'cancelada', contactos_json: null });
  });

  it('cancelar en espera no avisa a nadie', async () => {
    const a = await evento({ tipo: 'alerta', dispositivo, evento: jalon(2000), ruta: [], nombre: 'Lucía', contactos, esperaS: 60 });
    await evento({ tipo: 'cancelada', dispositivo });
    expect(await envios(a.id as string, 'esta_bien')).toBe(0);
  });

  it('dos "Yo me encargo" a la vez avisan al resto una sola vez', async () => {
    const a = await evento({ tipo: 'notificar_familia', dispositivo, evento: jalon(3000), nombre: 'Lucía', contactos: [...contactos, { nombre: 'Tía', telefono: '987654323' }] });
    const id = a.id as string;
    const tocar = (contacto: number) => pedir(`/api/alertas/${id}/encargado`, { method: 'POST', body: JSON.stringify({ contacto }) });
    await Promise.all([tocar(0), tocar(1)]);
    // Avisa a los otros dos (no a quien tocó), una sola vez.
    expect(await envios(id, 'encargado')).toBe(2);
  });

  it('un segundo jalón con la alerta anterior ya avisada crea una alerta nueva', async () => {
    const primera = await evento({ tipo: 'notificar_familia', dispositivo, evento: jalon(4000), nombre: 'Lucía', contactos });
    const segunda = await evento({ tipo: 'notificar_familia', dispositivo, evento: jalon(9000), nombre: 'Lucía', contactos });
    expect(segunda.id).not.toBe(primera.id);
    expect(await envios(segunda.id as string, 'alerta')).toBe(2);
  });

  it('un contacto con teléfono null no tumba la alerta', async () => {
    const a = await evento({ tipo: 'notificar_familia', dispositivo, evento: jalon(5000), nombre: 'Lucía', contactos: [{ nombre: 'Mamá', telefono: null }, contactos[1]] });
    expect(a.ok).toBe(true);
    expect(a.total).toBe(1);
  });

  it('los botones de la página rechazan cuerpos enormes sin leerlos', async () => {
    const a = await evento({ tipo: 'notificar_familia', dispositivo, evento: jalon(6000), nombre: 'Lucía', contactos });
    const r = await pedir(`/api/alertas/${a.id}/robo`, { method: 'POST', headers: { 'Content-Length': '999999' }, body: JSON.stringify({ contacto: 0, relleno: 'x'.repeat(999_970) }) });
    expect(r.status).toBe(403);
  });

  it('el código del SMS abre la alerta y dice qué contacto es', async () => {
    const a = await evento({ tipo: 'notificar_familia', dispositivo, evento: jalon(7000), nombre: 'Lucía', contactos });
    const codigo = `${String(a.id).slice(0, 6).toUpperCase()}2`;
    const r = (await (await pedir(`/api/codigo/${codigo}`)).json()) as Record<string, unknown>;
    expect(r).toMatchObject({ ok: true, id: a.id, contacto: 1 });
    expect((await pedir('/api/codigo/EJEMPLO')).status).toBe(200);
    expect((await pedir('/api/codigo/ZZZZZZ1')).status).toBe(404);
    expect((await pedir('/api/codigo/hola')).status).toBe(400);
  });

  it('la descarga del APK responde a HEAD sin mandar el archivo', async () => {
    await env.EVIDENCIAS.put('app/AlertaArrebato.apk', new Uint8Array(1234));
    const r = await pedir('/api/descargar/android', { method: 'HEAD' });
    expect(r.status).toBe(200);
    expect(r.headers.get('Content-Length')).toBe('1234');
    expect(r.body).toBeNull();
  });
});
