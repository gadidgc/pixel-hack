import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Cliente de "Tus notas de falsas alarmas": nunca dice "guardada" ni "borrada" sin la confirmación del backend. */

const prefs = vi.hoisted(() => ({ llaveMemoria: 'llave-de-prueba' }));
vi.mock('../src/alertas', () => ({ hayBackend: () => true, urlBackend: () => 'https://prueba.local' }));
vi.mock('../src/preferencias', () => ({
  preferencias: () => prefs,
  guardarPreferencias: vi.fn(async (cambios: Partial<typeof prefs>) => Object.assign(prefs, cambios)),
}));

const ID = '0b8f5a8e-3c1d-4b7e-9a2f-1d2e3f4a5b6c';

function responder(estado: number, cuerpo: unknown) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(cuerpo), { status: estado }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

beforeEach(() => {
  prefs.llaveMemoria = 'llave-de-prueba';
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('olvidarNota', () => {
  it('solo cuenta como borrada si el backend dice borrada: true', async () => {
    const { olvidarNota } = await import('../src/memoria');
    const fetch = responder(200, { ok: true, borrada: true });
    expect(await olvidarNota(ID)).toEqual({ ok: true, datos: null });
    expect(fetch).toHaveBeenCalledWith(`https://prueba.local/api/memoria/notas/${ID}`, expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer llave-de-prueba' } }));

    responder(200, { ok: true });
    expect(await olvidarNota(ID)).toEqual({ ok: false, motivo: 'el servidor no confirmó que se borró' });
    responder(502, { ok: false, detalle: 'la memoria no confirmó que la borró' });
    expect(await olvidarNota(ID)).toEqual({ ok: false, motivo: 'la memoria no confirmó que la borró' });
  });
});

describe('respuestas raras del backend', () => {
  it('JSON null o listas mal formadas no rompen la app ni se dan por buenas', async () => {
    const { buscarNotas, guardarNota } = await import('../src/memoria');
    responder(200, null);
    expect(await buscarNotas('Corrí')).toEqual({ ok: false, motivo: 'el servidor respondió algo que no entendimos' });
    expect(await guardarNota('Pasa al correr', 'Corrí')).toEqual({ ok: false, motivo: 'el servidor no confirmó que se guardó' });
    responder(500, null);
    expect(await buscarNotas(null)).toEqual({ ok: false, motivo: 'el servidor respondió 500' });
    responder(200, { ok: true, notas: [null, 3, { id: ID, texto: 'Pasa en la combi', motivo: 7 }, { id: 1, texto: 'x' }] });
    expect(await buscarNotas(null)).toEqual({ ok: true, datos: [{ id: ID, texto: 'Pasa en la combi', motivo: null }] });
  });

  it('si el backend ya no reconoce la llave (401), la olvida para pedir otra al guardar', async () => {
    const { buscarNotas } = await import('../src/memoria');
    responder(401, { ok: false, detalle: 'llave de memoria inválida' });
    expect(await buscarNotas(null)).toEqual({ ok: false, motivo: 'llave de memoria inválida' });
    expect(prefs.llaveMemoria).toBe('');
  });

  it('sin llave todavía no llama al backend para buscar', async () => {
    const { buscarNotas } = await import('../src/memoria');
    prefs.llaveMemoria = '';
    const fetch = responder(200, { ok: true, notas: [] });
    expect(await buscarNotas('Corrí')).toEqual({ ok: true, datos: [] });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('borrarTodasLasNotas', () => {
  function secuencia(...respuestas: [number, unknown][]) {
    const fetch = vi.fn();
    for (const [estado, cuerpo] of respuestas) fetch.mockResolvedValueOnce(new Response(JSON.stringify(cuerpo), { status: estado }));
    vi.stubGlobal('fetch', fetch);
    return fetch;
  }

  it('repite hasta que el servidor dice completa y recién entonces olvida la llave', async () => {
    const { borrarTodasLasNotas } = await import('../src/memoria');
    const fetch = secuencia([200, { ok: true, completa: false, borradas: 10 }], [200, { ok: true, completa: false, borradas: 2 }], [200, { ok: true, completa: true, borradas: 0 }]);
    expect(await borrarTodasLasNotas()).toEqual({ ok: true, datos: null });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenCalledWith('https://prueba.local/api/memoria', expect.objectContaining({ method: 'DELETE', headers: { Authorization: 'Bearer llave-de-prueba' } }));
    expect(prefs.llaveMemoria).toBe('');
  });

  it('si un lote falla, devuelve el motivo y la llave se queda para reintentar', async () => {
    const { borrarTodasLasNotas } = await import('../src/memoria');
    secuencia([200, { ok: true, completa: false, borradas: 10 }], [502, { ok: false, detalle: 'no se pudieron borrar todas tus notas: la memoria respondió 503' }]);
    expect(await borrarTodasLasNotas()).toEqual({ ok: false, motivo: 'no se pudieron borrar todas tus notas: la memoria respondió 503' });
    expect(prefs.llaveMemoria).toBe('llave-de-prueba');
  });

  it('una respuesta sin avance ni "completa" no cuenta como borrado', async () => {
    const { borrarTodasLasNotas } = await import('../src/memoria');
    secuencia([200, { ok: true }]);
    expect(await borrarTodasLasNotas()).toEqual({ ok: false, motivo: 'el servidor no confirmó que se borraron' });
    secuencia([200, null]);
    expect(await borrarTodasLasNotas()).toEqual({ ok: false, motivo: 'el servidor no confirmó que se borraron' });
    secuencia([503, { ok: false, activa: false, detalle: 'la memoria no está configurada' }]);
    expect(await borrarTodasLasNotas()).toEqual({ ok: false, motivo: 'la memoria no está configurada' });
    expect(prefs.llaveMemoria).toBe('llave-de-prueba');
  });

  it('401: no dice que borró, pero olvida la llave inútil para que el reintento pueda seguir', async () => {
    const { borrarTodasLasNotas } = await import('../src/memoria');
    secuencia([401, { ok: false, detalle: 'llave de memoria inválida' }]);
    const r = await borrarTodasLasNotas();
    expect(r.ok).toBe(false);
    expect(prefs.llaveMemoria).toBe('');
    expect(await borrarTodasLasNotas()).toEqual({ ok: true, datos: null });
  });

  it('sin llave no hay nada que borrar', async () => {
    const { borrarTodasLasNotas } = await import('../src/memoria');
    prefs.llaveMemoria = '';
    const fetch = secuencia();
    expect(await borrarTodasLasNotas()).toEqual({ ok: true, datos: null });
    expect(fetch).not.toHaveBeenCalled();
  });
});
