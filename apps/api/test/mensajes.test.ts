import { afterEach, describe, expect, it, vi } from 'vitest';
import { MENSAJES, mandarMensaje } from '../src/mensajes';

const mensaje = MENSAJES.alerta('Lucia', Date.UTC(2026, 9, 18, 0, 42), 'https://x.dev/a/abc');

function simularFetch(respuestas: Record<string, number>) {
  const llamadas: Array<{ url: string; cuerpo: Record<string, unknown> }> = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    llamadas.push({ url, cuerpo: JSON.parse(String(init.body)) });
    const estado = url.includes('graph.facebook.com') ? respuestas.meta : respuestas.zavu;
    return new Response('{}', { status: estado });
  });
  return llamadas;
}

afterEach(() => vi.unstubAllGlobals());

describe('mandarMensaje', () => {
  it('con Meta manda la plantilla con las variables en orden', async () => {
    const llamadas = simularFetch({ meta: 200 });
    const r = await mandarMensaje({ META_WA_TOKEN: 't', META_WA_NUMERO_ID: '123' }, { telefono: '+51987654321', mensaje, idempotencia: 'a' });
    expect(r.ok).toBe(true);
    expect(llamadas[0].url).toContain('/123/messages');
    expect(llamadas[0].cuerpo).toMatchObject({ to: '51987654321', template: { name: 'alerta_arrebato', language: { code: 'es' } } });
  });

  it('si la plantilla falla, Meta prueba con texto libre (ventana de 24 h)', async () => {
    let n = 0;
    const llamadas: Array<Record<string, unknown>> = [];
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      llamadas.push(JSON.parse(String(init.body)));
      return new Response('{}', { status: n++ === 0 ? 404 : 200 });
    });
    const r = await mandarMensaje({ META_WA_TOKEN: 't', META_WA_NUMERO_ID: '1' }, { telefono: '+51987654321', mensaje, idempotencia: 'a' });
    expect(r.ok).toBe(true);
    expect(llamadas.map((l) => l.type)).toEqual(['template', 'text']);
  });

  it('con Zavu "live" manda también SMS; basta que llegue uno', async () => {
    const llamadas = simularFetch({ meta: 400, zavu: 202 });
    const r = await mandarMensaje({ META_WA_TOKEN: 't', META_WA_NUMERO_ID: '1', ZAVU_API_KEY: 'zv_live_x' }, { telefono: '+51987654321', mensaje, idempotencia: 'a' });
    expect(r.ok).toBe(true);
    expect(llamadas.filter((l) => !l.url.endsWith('/v1/urls')).map((l) => l.cuerpo.channel ?? 'meta')).toEqual(['meta', 'sms', 'meta']);
    // Por SMS va el texto propio (sin enlace: el filtro antifraude de Zavu bloquea "celular robado + enlace").
    expect(llamadas.find((l) => l.cuerpo.channel === 'sms')?.cuerpo.text).toBe(mensaje.sms);
    expect(mensaje.sms).not.toContain('http');
  });

  it('con la clave de prueba de Zavu solo la usa de respaldo si Meta falla', async () => {
    const llamadas = simularFetch({ meta: 400, zavu: 202 });
    const r = await mandarMensaje({ META_WA_TOKEN: 't', META_WA_NUMERO_ID: '1', ZAVU_API_KEY: 'zv_test_x' }, { telefono: '+51987654321', mensaje, idempotencia: 'a' });
    expect(r.ok).toBe(true);
    expect(llamadas.map((l) => l.cuerpo.channel ?? 'meta')).toEqual(['meta', 'meta', 'whatsapp']);
  });

  it('sin proveedores lo dice', async () => {
    const r = await mandarMensaje({}, { telefono: '+51987654321', mensaje, idempotencia: 'a' });
    expect(r).toMatchObject({ ok: false, detalle: 'falta configurar WhatsApp (Meta o Zavu)' });
  });
});
