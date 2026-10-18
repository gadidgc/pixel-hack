import { afterEach, describe, expect, it, vi } from 'vitest';
import { MENSAJES, PALABRA_BLOQUEO, SMS_BLOQUEO, codigoContacto, leerCodigo, llamar, mandarMensaje, mandarSmsBloqueo, saludoLlamada, webAviso } from '../src/mensajes';

const mensaje = MENSAJES.alerta('Lucia', Date.UTC(2026, 9, 18, 0, 42), 'https://x.dev/a/abc', '28KAAK1', 'alerta.gadidgc.com/aviso');

function simularFetch(respuestas: Record<string, number>) {
  const llamadas: Array<{ url: string; cuerpo: Record<string, unknown> }> = [];
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    llamadas.push({ url, cuerpo: JSON.parse(String(init.body)) });
    // La dirección de la web, ya aprobada por Zavu (POST /v1/urls).
    if (url.endsWith('/v1/urls')) return new Response(JSON.stringify({ url: { status: 'approved' } }), { status: 200 });
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
    // Meta y Zavu van en paralelo: el orden no importa.
    expect(llamadas.filter((l) => !l.url.endsWith('/v1/urls')).map((l) => l.cuerpo.channel ?? 'meta').sort()).toEqual(['meta', 'meta', 'sms']);
    // Por SMS va la web escrita (sin https: Zavu rechaza nuestros enlaces) y el código, sin "robo".
    expect(llamadas.find((l) => l.cuerpo.channel === 'sms')?.cuerpo.text).toBe(mensaje.sms);
    expect(mensaje.sms).toContain('alerta.gadidgc.com/aviso con el codigo 28KAAK1');
    expect(mensaje.sms).not.toMatch(/https?:|robo/i);
  });

  it('si Zavu bloquea el SMS con la web, manda el respaldo con el código y sin la web', async () => {
    const textos: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      if (url.endsWith('/v1/urls')) return new Response(JSON.stringify({ url: { status: 'approved' } }), { status: 200 });
      textos.push(JSON.parse(String(init.body)).text);
      const bloqueado = textos.length === 1;
      return new Response(JSON.stringify(bloqueado ? { code: 'url_rejected', message: 'Message blocked' } : {}), { status: bloqueado ? 403 : 202 });
    });
    const r = await mandarMensaje({ ZAVU_API_KEY: 'zv_live_x' }, { telefono: '+51987654321', mensaje, idempotencia: 'a' });
    expect(r.ok).toBe(true);
    expect(textos).toEqual([mensaje.sms, mensaje.smsRespaldo]);
    expect(mensaje.smsRespaldo).toContain('28KAAK1');
    expect(mensaje.smsRespaldo).not.toContain('gadidgc');
  });

  it('si Zavu todavía no aprueba la web, manda directo el respaldo (no se queda retenido)', async () => {
    const textos: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      if (url.endsWith('/v1/urls')) return new Response(JSON.stringify({ url: { status: 'pending' } }), { status: 200 });
      textos.push(JSON.parse(String(init.body)).text);
      return new Response('{}', { status: 202 });
    });
    const r = await mandarMensaje({ ZAVU_API_KEY: 'zv_live_x' }, { telefono: '+51987654321', mensaje, idempotencia: 'a' });
    expect(r.ok).toBe(true);
    expect(textos).toEqual([mensaje.smsRespaldo]);
  });

  it('si Zavu también bloquea el respaldo como phishing, manda el mínimo sin código', async () => {
    const textos: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      if (url.endsWith('/v1/urls')) return new Response(JSON.stringify({ url: { status: 'pending' } }), { status: 200 });
      textos.push(JSON.parse(String(init.body)).text);
      const bloqueado = textos.length === 1;
      const cuerpo = bloqueado ? { error: { code: 'sms_compliance_blocked', message: 'SMS blocked: phishing' } } : {};
      return new Response(JSON.stringify(cuerpo), { status: bloqueado ? 422 : 202 });
    });
    const r = await mandarMensaje({ ZAVU_API_KEY: 'zv_live_x' }, { telefono: '+51987654321', mensaje, idempotencia: 'a' });
    expect(r.ok).toBe(true);
    expect(textos).toEqual([mensaje.smsRespaldo, mensaje.smsMinimo]);
    expect(mensaje.smsMinimo).not.toMatch(/codigo|ubicacion|llam|robo|https?:/i);
  });

  it('si Zavu falla por otra cosa (no por el texto), no gasta más intentos', async () => {
    const textos: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      if (url.endsWith('/v1/urls')) return new Response(JSON.stringify({ url: { status: 'pending' } }), { status: 200 });
      textos.push(JSON.parse(String(init.body)).text);
      return new Response(JSON.stringify({ error: { code: 'rate_limit_exceeded', message: 'wait' } }), { status: 429 });
    });
    const r = await mandarMensaje({ ZAVU_API_KEY: 'zv_live_x' }, { telefono: '+51987654321', mensaje, idempotencia: 'a' });
    expect(r.ok).toBe(false);
    expect(textos).toEqual([mensaje.smsRespaldo]);
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
    const r = await llamar({ ZAVU_API_KEY: 'zv_live_x' }, '+51987654321', 'Lucia', 'abc', '28KAAK1', 'alerta.gadidgc.com/aviso');
    expect(r).toMatchObject({ ok: false, detalle: 'llamadas apagadas' });
    expect(llamadas).toHaveLength(0);
  });
  it('encendida, llama con el saludo en español y sin "robo"', async () => {
    const llamadas = simularFetch({ zavu: 202 });
    const r = await llamar({ ZAVU_API_KEY: 'zv_live_x', ZAVU_LLAMADAS: 'si' }, '+51987654321', 'Lucia', 'abc', '28KAAK1', 'alerta.gadidgc.com/aviso');
    expect(r.ok).toBe(true);
    expect(llamadas[0].url).toBe('https://api.zavu.dev/v1/calls');
    expect(llamadas[0].cuerpo).toMatchObject({ to: '+51987654321', language: 'es', greeting: saludoLlamada('Lucia', '28KAAK1', 'alerta.gadidgc.com/aviso') });
    const saludo = saludoLlamada('Lucia', '28KAAK1', 'alerta.gadidgc.com/aviso');
    expect(saludo).toContain('2, 8, K, A, A, K, 1');
    expect(saludo).toContain('alerta punto gadidgc punto com, barra aviso');
    expect(saludo).not.toMatch(/robo/i);
  });
});

describe('código del aviso', () => {
  it('ida y vuelta: id + contacto → código → id corto + contacto', () => {
    expect(codigoContacto('28kaakxhwadjbbet', 0)).toBe('28KAAK1');
    expect(leerCodigo('28KAAK1')).toEqual({ prefijo: '28kaak', indice: 0 });
    expect(leerCodigo(' 28-kaak 3 ')).toEqual({ prefijo: '28kaak', indice: 2 });
  });
  it('la web va escrita sin https', () => {
    expect(webAviso('https://alerta.gadidgc.com')).toBe('alerta.gadidgc.com/aviso');
  });
  it('acepta EJEMPLO y rechaza lo que no tiene la forma', () => {
    expect(leerCodigo('ejemplo')).toBe('ejemplo');
    expect(leerCodigo('28KAAK9')).toBeNull();
    expect(leerCodigo('28KAA1')).toBeNull();
    expect(leerCodigo("'; DROP")).toBeNull();
  });
});
