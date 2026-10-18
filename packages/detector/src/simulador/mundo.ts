import { desplazarLatLon } from '../geo';
import { G } from '../matematica';
import type { LecturaGps, MuestraImu, Vec3 } from '../tipos';
import { Azar } from './azar';

/** Centro de Lima: punto de partida de todas las simulaciones. */
export const ORIGEN_LIMA = { lat: -12.0464, lon: -77.0428 };

export interface OpcionesGps {
  activo: boolean;
  /** Precisión típica que reporta el celular (m). La posición tiene un error de ese orden. */
  precisionM: number;
  /** Probabilidad de que una lectura venga sin velocidad (pasa en algunos celulares). */
  probVelocidadNula: number;
  /** Retraso del GPS: la lectura describe dónde estábamos hace este tiempo (ms). */
  retrasoMs: number;
  intervaloMs: number;
}

export interface OpcionesMundo {
  t0?: number;
  /** Ruido del acelerómetro por eje (m/s²). */
  ruidoAcelerometro?: number;
  /** Ruido del giroscopio por eje (rad/s). */
  ruidoGiroscopio?: number;
  /** El celular no tiene giroscopio (gama baja). */
  sinGiroscopio?: boolean;
  /** Límite del acelerómetro (m/s²); los celulares suelen medir hasta ±8 g o ±16 g. */
  saturacion?: number;
  gps?: Partial<OpcionesGps>;
}

interface EstadoPasado {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Física simplificada de un celular: posición y velocidad horizontales, orientación 3D,
 * y los sensores que leería (acelerómetro con gravedad, giroscopio y GPS con error y retraso).
 */
export class Mundo {
  readonly dtMs = 20; // 50 Hz, como en la app
  t: number;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  /** Orientación: matriz 3×3 (fila por fila) que pasa del marco del celular al del mundo. */
  private R: number[];
  private readonly ruidoAcc: number;
  private readonly ruidoGiro: number;
  private readonly sinGiro: boolean;
  private readonly saturacion: number;
  gps: OpcionesGps;
  private errorGps: [number, number] = [0, 0];
  private proximoGps: number;
  private historial: EstadoPasado[] = [];
  private pasos = 0;

  constructor(
    readonly azar: Azar,
    private readonly alImu: (m: MuestraImu) => void,
    private readonly alGps: (l: LecturaGps) => void,
    opciones: OpcionesMundo = {},
  ) {
    this.t = opciones.t0 ?? 1_760_000_000_000;
    this.ruidoAcc = opciones.ruidoAcelerometro ?? 0.012 * G;
    this.ruidoGiro = opciones.ruidoGiroscopio ?? 0.02;
    this.sinGiro = opciones.sinGiroscopio ?? false;
    this.saturacion = opciones.saturacion ?? 16 * G;
    this.gps = {
      activo: true,
      precisionM: azar.uniforme(4, 15),
      probVelocidadNula: 0.05,
      retrasoMs: azar.uniforme(500, 1500),
      intervaloMs: 1000,
      ...opciones.gps,
    };
    this.proximoGps = this.t + azar.uniforme(0, this.gps.intervaloMs);
    this.R = Mundo.rotacion(azar.direccion(), azar.uniforme(0, Math.PI));
  }

  get rapidez(): number {
    return Math.hypot(this.vx, this.vy);
  }

  /**
   * Avanza 20 ms.
   * @param a aceleración real del celular en el mundo (m/s²; x este, y norte, z arriba).
   * @param omega velocidad de giro en el marco del celular (rad/s).
   * @param ruidoExtra vibración adicional del acelerómetro (m/s² por eje), p. ej. el motor de la moto.
   * @param giroExtra ruido adicional del giroscopio (rad/s por eje).
   */
  paso(a: Vec3, omega: Vec3, ruidoExtra = 0, giroExtra = 0): void {
    const dt = this.dtMs / 1000;
    const az = this.azar;

    this.vx += a[0] * dt;
    this.vy += a[1] * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Lo que mide el acelerómetro: aceleración + gravedad (fuerza específica), en el marco del celular.
    const f: Vec3 = [a[0], a[1], a[2] + G];
    const R = this.R;
    const sigma = this.ruidoAcc + ruidoExtra;
    const lectura: Vec3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      const valor = R[i]! * f[0] + R[3 + i]! * f[1] + R[6 + i]! * f[2] + az.gauss(0, sigma);
      lectura[i] = Math.max(-this.saturacion, Math.min(this.saturacion, valor));
    }
    const sg = this.ruidoGiro + giroExtra;
    const giro: Vec3 = [omega[0] + az.gauss(0, sg), omega[1] + az.gauss(0, sg), omega[2] + az.gauss(0, sg)];

    this.alImu({
      t: this.t,
      ax: lectura[0],
      ay: lectura[1],
      az: lectura[2],
      gx: this.sinGiro ? null : giro[0],
      gy: this.sinGiro ? null : giro[1],
      gz: this.sinGiro ? null : giro[2],
    });

    // Girar el celular: R ← R · exp(ω dt).
    const angulo = Math.hypot(omega[0], omega[1], omega[2]) * dt;
    if (angulo > 1e-9) {
      const eje: Vec3 = [(omega[0] * dt) / angulo, (omega[1] * dt) / angulo, (omega[2] * dt) / angulo];
      this.R = Mundo.multiplicar(this.R, Mundo.rotacion(eje, angulo));
    }
    if (++this.pasos % 500 === 0) this.R = Mundo.ortonormalizar(this.R);

    this.historial.push({ t: this.t, x: this.x, y: this.y, vx: this.vx, vy: this.vy });
    if (this.historial.length > 200) this.historial.splice(0, this.historial.length - 150);

    this.t += this.dtMs;
    if (this.t >= this.proximoGps) {
      this.proximoGps += this.gps.intervaloMs + az.uniforme(-100, 100);
      if (this.gps.activo) this.emitirGps();
    }
  }

  /** Detiene el celular en seco (por ejemplo, al chocar contra el piso). */
  detener(): void {
    this.vx = 0;
    this.vy = 0;
  }

  /** Fija la velocidad (por ejemplo, el celular cae dentro de la mochila y vuelve a ir con la persona). */
  fijarVelocidad(vx: number, vy: number): void {
    this.vx = vx;
    this.vy = vy;
  }

  /** Cambia la orientación del celular de golpe (después de rebotar). */
  orientarAlAzar(): void {
    this.R = Mundo.rotacion(this.azar.direccion(), this.azar.uniforme(0, Math.PI));
  }

  private emitirGps(): void {
    const az = this.azar;
    const objetivo = this.t - this.gps.retrasoMs;
    let pasado = this.historial[0];
    for (const h of this.historial) {
      if (h.t <= objetivo) pasado = h;
      else break;
    }
    if (!pasado) return;
    // Error que cambia despacio (así se comporta el GPS en la ciudad).
    const sigma = this.gps.precisionM / 2;
    this.errorGps = [
      this.errorGps[0] * 0.9 + az.gauss(0, sigma * 0.44),
      this.errorGps[1] * 0.9 + az.gauss(0, sigma * 0.44),
    ];
    const { lat, lon } = desplazarLatLon(ORIGEN_LIMA.lat, ORIGEN_LIMA.lon, pasado.x + this.errorGps[0], pasado.y + this.errorGps[1]);
    const velocidad = az.probabilidad(this.gps.probVelocidadNula)
      ? null
      : Math.max(0, Math.hypot(pasado.vx, pasado.vy) + az.gauss(0, 0.25));
    this.alGps({
      t: this.t,
      lat,
      lon,
      velocidad,
      precision: Math.round(this.gps.precisionM * az.uniforme(0.8, 1.2) * 10) / 10,
    });
  }

  private static rotacion(eje: Vec3, angulo: number): number[] {
    const [x, y, z] = eje;
    const c = Math.cos(angulo);
    const s = Math.sin(angulo);
    const C = 1 - c;
    return [
      c + x * x * C, x * y * C - z * s, x * z * C + y * s,
      y * x * C + z * s, c + y * y * C, y * z * C - x * s,
      z * x * C - y * s, z * y * C + x * s, c + z * z * C,
    ];
  }

  private static multiplicar(A: number[], B: number[]): number[] {
    const C = new Array<number>(9).fill(0);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += A[i * 3 + k]! * B[k * 3 + j]!;
        C[i * 3 + j] = s;
      }
    return C;
  }

  private static ortonormalizar(R: number[]): number[] {
    // Gram-Schmidt sobre las columnas.
    const col = (j: number): Vec3 => [R[j]!, R[3 + j]!, R[6 + j]!];
    const normalizar = (v: Vec3): Vec3 => {
      const n = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / n, v[1] / n, v[2] / n];
    };
    const punto = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const a = normalizar(col(0));
    let b = col(1);
    const pb = punto(a, b);
    b = normalizar([b[0] - pb * a[0], b[1] - pb * a[1], b[2] - pb * a[2]]);
    const c: Vec3 = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    return [a[0], b[0], c[0], a[1], b[1], c[1], a[2], b[2], c[2]];
  }
}
