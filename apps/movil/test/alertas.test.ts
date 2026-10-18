import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('../src/preferencias', () => ({ idDispositivo: () => 'prueba' }));
process.env.EXPO_PUBLIC_URL_ALERTAS = 'https://prueba.local/api/eventos';

/** Un `fetch` que nunca responde, pero que respeta la señal de cancelar (como el de verdad). */
function fetchColgado() {
  return vi.fn(
    (_url: string, init: { signal: AbortSignal }) =>
      new Promise((_, rechazar) => init.signal.addEventListener('abort', () => rechazar(Object.assign(new Error('Aborted'), { name: 'AbortError' })))),
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('enviar', () => {
  it('avisar a la familia espera más de 5 s (WhatsApp y SMS tardan) y explica el corte en español', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchColgado());
    const { enviar } = await import('../src/alertas');
    let resultado: Awaited<ReturnType<typeof enviar>> | null = null;
    void enviar({ tipo: 'prueba', nombre: 'A', contactos: [] }).then((r) => (resultado = r));
    await vi.advanceTimersByTimeAsync(6000);
    expect(resultado).toBeNull();
    await vi.advanceTimersByTimeAsync(15_000);
    expect(resultado).toEqual({ enviado: false, detalle: 'el servidor tardó en responder (puede que sí haya salido)' });
  });

  it('sin conexión: mensaje en español, no el texto técnico', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Network request failed'))));
    const { enviar } = await import('../src/alertas');
    expect(await enviar({ tipo: 'motivo_falsa_alarma', motivo: 'caida' })).toEqual({ enviado: false, detalle: 'sin conexión con el servidor' });
  });
});
