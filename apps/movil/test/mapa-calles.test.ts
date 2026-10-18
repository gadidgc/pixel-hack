import { describe, expect, it, vi } from 'vitest';

// Solo probamos las cuentas: lo que dibuja (React Native) no carga en Node.
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('../src/ui/componentes', () => ({}));
vi.mock('../src/ui/tema', () => ({}));
import { VISTA_INICIAL, aPantalla, encuadrar, moverEncuadre, zoomVista } from '../src/ui/mapa-calles';

const ruta = [
  { lat: -12.1219, lon: -77.0297 },
  { lat: -12.119, lon: -77.0277 },
];
const zona = { x: 16, y: 200, ancho: 343, alto: 300 };
const centro = { x: zona.x + zona.ancho / 2, y: zona.y + zona.alto / 2 };

describe('mover el mapa', () => {
  it('sin mover, es el encuadre automático', () => {
    const e = encuadrar(ruta, zona);
    expect(moverEncuadre(e, VISTA_INICIAL, centro)).toEqual(e);
  });

  it('arrastrar corre la ruta lo mismo que el dedo', () => {
    const e = encuadrar(ruta, zona);
    const antes = aPantalla(ruta[0], e);
    const despues = aPantalla(ruta[0], moverEncuadre(e, { dz: 0, dx: 30, dy: -20 }, centro));
    expect(despues.x - antes.x).toBeCloseTo(30);
    expect(despues.y - antes.y).toBeCloseTo(-20);
  });

  it('acercar deja quieto lo que está al centro', () => {
    const e = encuadrar(ruta, zona);
    const v = zoomVista({ dz: 0, dx: 10, dy: 5 }, 1, e.zoom);
    expect(v).toEqual({ dz: 1, dx: 20, dy: 10 });
    const e2 = moverEncuadre(e, v, centro);
    expect(e2.zoom).toBe(e.zoom + 1);
    // El punto del mundo que estaba al centro (con el arrastre) sigue al centro.
    const mundoAntes = { x: (moverEncuadre(e, { dz: 0, dx: 10, dy: 5 }, centro).origenX + centro.x) * 2, y: 0 };
    expect(e2.origenX + centro.x).toBeCloseTo(mundoAntes.x);
  });

  it('no pasa del zoom de las teselas', () => {
    let v = VISTA_INICIAL;
    for (let i = 0; i < 10; i++) v = zoomVista(v, 1, 17);
    expect(v.dz).toBe(2);
  });
});
