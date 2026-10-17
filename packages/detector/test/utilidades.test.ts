import { describe, expect, it } from 'vitest';
import { FiltroGravedad } from '../src/filtro-gravedad';
import { desplazarLatLon, distanciaM } from '../src/geo';
import { G, VentanaTemporal, autocorrelacionMaxima, desviacion, mediana, norma } from '../src/matematica';
import type { Vec3 } from '../src/tipos';

describe('matemática', () => {
  it('mediana y desviación', () => {
    expect(mediana([])).toBeNull();
    expect(mediana([3, 1, 2])).toBe(2);
    expect(mediana([4, 1, 3, 2])).toBe(2.5);
    expect(desviacion([5, 5, 5])).toBe(0);
    expect(desviacion([1, -1, 1, -1])).toBeCloseTo(1);
  });

  it('la autocorrelación reconoce el ritmo de los pasos y no el ruido', () => {
    const pasos = Array.from({ length: 300 }, (_, i) => Math.sin((2 * Math.PI * 2 * i) / 50)); // 2 Hz a 50 Hz
    let semilla = 1;
    const ruido = Array.from({ length: 300 }, () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647) - 0.5);
    expect(autocorrelacionMaxima(pasos, 15, 38)).toBeGreaterThan(0.9);
    expect(autocorrelacionMaxima(ruido, 15, 38)).toBeLessThan(0.3);
    expect(autocorrelacionMaxima([1, 2], 15, 38)).toBe(0);
  });

  it('la ventana temporal olvida lo viejo', () => {
    const v = new VentanaTemporal<number>(1000);
    for (let t = 0; t <= 5000; t += 100) v.agregar(t, t);
    const todos = v.todos();
    expect(todos[0]!.t).toBe(4000);
    expect(v.ultimo()!.dato).toBe(5000);
    expect(v.entre(4500, 4700).map((e) => e.t)).toEqual([4500, 4600, 4700]);
  });
});

describe('geo', () => {
  it('distancia conocida: 1 grado de latitud ≈ 111 km', () => {
    expect(distanciaM(0, 0, 1, 0)).toBeGreaterThan(111_000);
    expect(distanciaM(0, 0, 1, 0)).toBeLessThan(111_400);
  });

  it('desplazar y medir vuelven al mismo número', () => {
    const p = desplazarLatLon(-12.0464, -77.0428, 30, 40);
    expect(distanciaM(-12.0464, -77.0428, p.lat, p.lon)).toBeCloseTo(50, 0);
  });
});

describe('filtro de gravedad', () => {
  it('con el celular quieto, la aceleración lineal es ~0', () => {
    const f = new FiltroGravedad();
    let lineal: Vec3 = [0, 0, 0];
    for (let t = 0; t < 3000; t += 20) lineal = f.actualizar(t, [0, 0, G], [0, 0, 0]);
    expect(norma(lineal)).toBeLessThan(0.01);
  });

  it('girar el celular NO parece un empujón si hay giroscopio', () => {
    const f = new FiltroGravedad();
    const w = 6; // rad/s alrededor del eje x
    let maximo = 0;
    for (let t = 0; t < 2000; t += 10) {
      const angulo = t < 1000 ? 0 : (w * (t - 1000)) / 1000;
      // Un celular que gira a +w rad/s alrededor de x ve la gravedad como (0, sin, cos)·G
      const a: Vec3 = [0, G * Math.sin(angulo), G * Math.cos(angulo)];
      const lineal = f.actualizar(t, a, t < 1000 ? [0, 0, 0] : [w, 0, 0]);
      if (t > 1000) maximo = Math.max(maximo, norma(lineal) / G);
    }
    expect(maximo).toBeLessThan(0.1);
  });

  it('un empujón real sí aparece', () => {
    const f = new FiltroGravedad();
    for (let t = 0; t < 2000; t += 20) f.actualizar(t, [0, 0, G], [0, 0, 0]);
    const lineal = f.actualizar(2020, [3 * G, 0, G], [0, 0, 0]);
    expect(norma(lineal) / G).toBeGreaterThan(2.5);
  });
});
