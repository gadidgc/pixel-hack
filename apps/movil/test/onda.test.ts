import { describe, expect, it } from 'vitest';
import { ondaDesdeDecibeles, textoDuracion } from '../src/onda';

describe('ondaDesdeDecibeles', () => {
  it('lleva el volumen a niveles del 0 (silencio) al 9 (lo más fuerte)', () => {
    expect(ondaDesdeDecibeles([-160, -60, -30, 0, 5, -45, -15, -160], 8)).toBe('00599270');
  });

  it('resume muchas lecturas en 48 barras, con el pico de cada tramo', () => {
    const lecturas = Array.from({ length: 480 }, (_, i) => (i % 10 === 0 ? 0 : -60));
    const onda = ondaDesdeDecibeles(lecturas);
    expect(onda).toHaveLength(48);
    expect(onda).toBe('9'.repeat(48));
  });

  it('con muy pocas lecturas no hay onda (la tarjeta usa el mapa)', () => {
    expect(ondaDesdeDecibeles([-20, -10, Number.NaN])).toBeNull();
  });
});

describe('textoDuracion', () => {
  it('escribe minutos y segundos', () => {
    expect(textoDuracion(42_000)).toBe('0:42');
    expect(textoDuracion(725_400)).toBe('12:05');
  });
});
