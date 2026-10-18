import { afterEach, describe, expect, it, vi } from 'vitest';
import { MENSAJES, PALABRA_BLOQUEO, SMS_BLOQUEO, codigoContacto, leerCodigo, llamar, mandarMensaje, mandarSmsBloqueo, saludoLlamada } from '../src/mensajes';

const mensaje = MENSAJES.alerta('Lucia', Date.UTC(2026, 9, 18, 0, 42), 'https://x.dev/a/abc', '28KAAK1');

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
    // Por SMS va el código, sin enlace (Zavu rechaza nuestros enlaces) y sin "robo".
    expect(llamadas.find((l) => l.cuerpo.channel === 'sms')?.cuerpo.text).toBe(mensaje.sms);
    expect(mensaje.sms).toContain('28KAAK1');
    expect(mensaje.sms).not.toMatch(/https?:|robo/i);
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
    const r = await llamar({ ZAVU_API_KEY: 'zv_live_x' }, '+51987654321', 'Lucia', 'abc', '28KAAK1');
    expect(r).toMatchObject({ ok: false, detalle: 'llamadas apagadas' });
    expect(llamadas).toHaveLength(0);
  });
  it('encendida, llama con el saludo en español y sin "robo"', async () => {
    const llamadas = simularFetch({ zavu: 202 });
    const r = await llamar({ ZAVU_API_KEY: 'zv_live_x', ZAVU_LLAMADAS: 'si' }, '+51987654321', 'Lucia', 'abc', '28KAAK1');
    expect(r.ok).toBe(true);
    expect(llamadas[0].url).toBe('https://api.zavu.dev/v1/calls');
    expect(llamadas[0].cuerpo).toMatchObject({ to: '+51987654321', language: 'es', greeting: saludoLlamada('Lucia', '28KAAK1') });
    expect(saludoLlamada('Lucia', '28KAAK1')).toContain('2, 8, K, A, A, K, 1');
    expect(saludoLlamada('Lucia', '28KAAK1')).not.toMatch(/robo/i);
  });
});

describe('código del aviso', () => {
  it('ida y vuelta: id + contacto → código → id corto + contacto', () => {
    expect(codigoContacto('28kaakxhwadjbbet', 0)).toBe('28KAAK1');
    expect(leerCodigo('28KAAK1')).toEqual({ prefijo: '28kaak', indice: 0 });
    expect(leerCodigo(' 28-kaak 3 ')).toEqual({ prefijo: '28kaak', indice: 2 });
  });
  it('acepta EJEMPLO y rechaza lo que no tiene la forma', () => {
    expect(leerCodigo('ejemplo')).toBe('ejemplo');
    expect(leerCodigo('28KAAK9')).toBeNull();
    expect(leerCodigo('28KAA1')).toBeNull();
    expect(leerCodigo("'; DROP")).toBeNull();
  });
});
