import { afterEach, describe, expect, it, vi } from 'vitest';
import { MENSAJES, PALABRA_BLOQUEO, SMS_BLOQUEO, llamar, mandarMensaje, mandarSmsBloqueo, saludoLlamada } from '../src/mensajes';

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
    // Por SMS va el texto neutro CON el enlace a la ruta (sin "robo": el filtro de Zavu lo bloquea).
    expect(llamadas.find((l) => l.cuerpo.channel === 'sms')?.cuerpo.text).toBe(mensaje.sms);
    expect(mensaje.sms).toContain('https://x.dev/a/abc');
    expect(mensaje.sms).not.toMatch(/robo|alerta:/i);
  });

  it('si Zavu bloquea el SMS con enlace, manda el mismo aviso sin enlace', async () => {
    const textos: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      const cuerpo = JSON.parse(String(init.body));
      if (!url.endsWith('/v1/messages')) return new Response('{}', { status: 200 });
      textos.push(cuerpo.text);
      const bloqueado = textos.length === 1;
      return new Response(JSON.stringify(bloqueado ? { error: { code: 'sms_compliance_blocked' } } : {}), { status: bloqueado ? 422 : 202 });
    });
    const r = await mandarMensaje({ ZAVU_API_KEY: 'zv_live_x' }, { telefono: '+51987654321', mensaje, idempotencia: 'a' });
    expect(r.ok).toBe(true);
    expect(textos).toEqual([mensaje.sms, mensaje.smsSinEnlace]);
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

describe('SMS de bloqueo de iPhone (Atajos)', () => {
  it('manda solo SMS por Zavu, con la palabra y sin enlace ni "robo"', async () => {
    const llamadas = simularFetch({ zavu: 202 });
    const r = await mandarSmsBloqueo({ ZAVU_API_KEY: 'zv_live_x' }, '+51987654321', 'b');
    expect(r.ok).toBe(true);
    expect(llamadas).toHaveLength(1);
    expect(llamadas[0].cuerpo).toMatchObject({ to: '+51987654321', channel: 'sms' });
    expect(String(llamadas[0].cuerpo.text)).toContain(PALABRA_BLOQUEO);
    expect(SMS_BLOQUEO).not.toMatch(/https?:|robo/i);
  });
  it('con la clave de prueba de Zavu no puede mandar SMS y lo dice', async () => {
    const llamadas = simularFetch({ zavu: 202 });
    const r = await mandarSmsBloqueo({ ZAVU_API_KEY: 'zv_test_x', META_WA_TOKEN: 't', META_WA_NUMERO_ID: '1' }, '+51987654321', 'b');
    expect(r.ok).toBe(false);
    expect(llamadas).toHaveLength(0);
  });
});

describe('llamada al contacto (Zavu voz)', () => {
  it('apagada si no está ZAVU_LLAMADAS = "si"', async () => {
    const llamadas = simularFetch({ zavu: 202 });
    const r = await llamar({ ZAVU_API_KEY: 'zv_live_x' }, '+51987654321', 'Lucia', 'abc');
    expect(r).toMatchObject({ ok: false, detalle: 'llamadas apagadas' });
    expect(llamadas).toHaveLength(0);
  });
  it('encendida, llama con el saludo en español y sin "robo"', async () => {
    const llamadas = simularFetch({ zavu: 202 });
    const r = await llamar({ ZAVU_API_KEY: 'zv_live_x', ZAVU_LLAMADAS: 'si' }, '+51987654321', 'Lucia', 'abc');
    expect(r.ok).toBe(true);
    expect(llamadas[0].url).toBe('https://api.zavu.dev/v1/calls');
    expect(llamadas[0].cuerpo).toMatchObject({ to: '+51987654321', language: 'es', greeting: saludoLlamada('Lucia') });
    expect(saludoLlamada('Lucia')).not.toMatch(/robo/i);
  });
});
