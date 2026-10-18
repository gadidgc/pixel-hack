import { describe, expect, it, vi } from 'vitest';
import worker, { type Env } from '../src/index';

/** Un limitador que deja pasar `cupo` peticiones por IP y anota cada consulta. */
function limitador(cupo: number) {
  const usados = new Map<string, number>();
  return {
    limit: vi.fn(async ({ key }: { key: string }) => {
      usados.set(key, (usados.get(key) ?? 0) + 1);
      return { success: (usados.get(key) ?? 0) <= cupo };
    }),
  };
}

/** Una base vacía: alcanza para las rutas que solo buscan una alerta que no existe. */
const DB = { prepare: () => ({ bind: () => ({ first: async () => null }) }) } as unknown as D1Database;
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;

function entorno() {
  const mensajes = limitador(2);
  const general = limitador(2);
  const env = { DB, LIMITE_MENSAJES: mensajes, LIMITE_GENERAL: general } as unknown as Env;
  return { env, mensajes, general };
}

function evento(env: Env, cuerpo: unknown, ip = '203.0.113.7') {
  return worker.fetch(
    new Request('https://prueba.local/api/eventos', { method: 'POST', headers: { 'CF-Connecting-IP': ip }, body: JSON.stringify(cuerpo) }),
    env,
    ctx,
  );
}

const prueba = { tipo: 'probar_bloqueo', dispositivo: 'x', numeroPropio: '987654321' };

describe('límite por IP', () => {
  it('los eventos que mandan SMS o WhatsApp se cortan con 429 al pasar el cupo', async () => {
    const { env, mensajes } = entorno();
    // Las dos primeras pasan el límite (y fallan después por no haber proveedor: no importa aquí).
    expect((await evento(env, prueba)).status).not.toBe(429);
    expect((await evento(env, prueba)).status).not.toBe(429);
    const r = await evento(env, prueba);
    expect(r.status).toBe(429);
    expect(((await r.json()) as { detalle: string }).detalle).toContain('espera un minuto');
    expect(mensajes.limit).toHaveBeenCalledTimes(3);
  });

  it('cada IP tiene su propio cupo', async () => {
    const { env } = entorno();
    for (let i = 0; i < 3; i++) await evento(env, prueba, '203.0.113.7');
    expect((await evento(env, prueba, '198.51.100.9')).status).not.toBe(429);
  });

  it('nunca limita la cancelación ni la ruta en vivo de una alerta real', async () => {
    const { env, mensajes, general } = entorno();
    for (let i = 0; i < 5; i++) {
      expect((await evento(env, { tipo: 'cancelada', dispositivo: 'x' })).status).toBe(200);
      expect((await evento(env, { tipo: 'ubicacion', dispositivo: 'x', lectura: { t: 1, lat: -12, lon: -77 } })).status).toBe(404);
    }
    expect(mensajes.limit).not.toHaveBeenCalled();
    expect(general.limit).not.toHaveBeenCalled();
  });

  it('los demás POST usan el límite general', async () => {
    const { env, general } = entorno();
    const reporte = () =>
      worker.fetch(new Request('https://prueba.local/api/reportes', { method: 'POST', headers: { 'CF-Connecting-IP': '203.0.113.7' }, body: '{}' }), env, ctx);
    await reporte();
    await reporte();
    expect((await reporte()).status).toBe(429);
    expect(general.limit).toHaveBeenCalledTimes(3);
  });

  it('sin el binding (desarrollo local) no limita', async () => {
    const env = { DB } as unknown as Env;
    for (let i = 0; i < 5; i++) expect((await evento(env, prueba)).status).not.toBe(429);
  });
});
