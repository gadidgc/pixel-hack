import { cruz, norma } from './matematica';
import type { Vec3 } from './tipos';

/**
 * Separa la gravedad de la aceleración "de verdad" del celular.
 *
 * Es un filtro complementario:
 * 1. Si hay giroscopio, primero giramos nuestra estimación de la gravedad con el giro medido
 *    (dg/dt = -ω × g). Así, cuando el celular da vueltas en la mano del ladrón, no confundimos
 *    el giro con un empujón.
 * 2. Luego la acercamos un poco a la lectura del acelerómetro (filtro de paso bajo con constante `tau`).
 *
 * Lo que queda (lectura − gravedad) es la aceleración lineal.
 */
export class FiltroGravedad {
  private gravedad: Vec3 | null = null;
  private tAnterior: number | null = null;

  constructor(
    private readonly tauConGiroS = 1.0,
    private readonly tauSinGiroS = 0.4,
  ) {}

  /** Devuelve la aceleración lineal (m/s², sin gravedad) en el marco del celular. */
  actualizar(t: number, aceleracion: Vec3, giro: Vec3 | null): Vec3 {
    if (this.gravedad === null || this.tAnterior === null) {
      this.gravedad = [aceleracion[0], aceleracion[1], aceleracion[2]];
      this.tAnterior = t;
      return [0, 0, 0];
    }
    // Si llegan muestras con huecos grandes (la app estuvo pausada), no extrapolamos más de 100 ms.
    const dt = Math.min(Math.max((t - this.tAnterior) / 1000, 0), 0.1);
    this.tAnterior = t;
    const g = this.gravedad;

    if (giro) {
      // Rotación exacta (fórmula de Rodrigues) de -|ω|·dt alrededor del eje ω.
      // Con Euler simple el error crece mucho cuando el celular gira a 10+ rad/s.
      const velocidad = norma(giro);
      const angulo = -velocidad * dt;
      if (velocidad > 1e-9) {
        const k: Vec3 = [giro[0] / velocidad, giro[1] / velocidad, giro[2] / velocidad];
        const kxg = cruz(k, g);
        const kg = k[0] * g[0] + k[1] * g[1] + k[2] * g[2];
        const cos = Math.cos(angulo);
        const sin = Math.sin(angulo);
        for (let i = 0; i < 3; i++) g[i] = g[i]! * cos + kxg[i]! * sin + k[i]! * kg * (1 - cos);
      }
    }

    const tau = giro ? this.tauConGiroS : this.tauSinGiroS;
    const alfa = dt / (tau + dt);
    g[0] += alfa * (aceleracion[0] - g[0]);
    g[1] += alfa * (aceleracion[1] - g[1]);
    g[2] += alfa * (aceleracion[2] - g[2]);

    return [aceleracion[0] - g[0], aceleracion[1] - g[1], aceleracion[2] - g[2]];
  }

  reiniciar(): void {
    this.gravedad = null;
    this.tAnterior = null;
  }
}
