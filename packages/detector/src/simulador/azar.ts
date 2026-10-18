/** Generador de números al azar con semilla (mulberry32): la misma semilla da la misma simulación. */
export class Azar {
  private estado: number;
  private gaussGuardado: number | null = null;

  constructor(semilla: number) {
    this.estado = semilla >>> 0;
  }

  /** Número en [0, 1). */
  siguiente(): number {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniforme(min: number, max: number): number {
    return min + (max - min) * this.siguiente();
  }

  /** Distribución normal (Box-Muller). */
  gauss(media = 0, desviacion = 1): number {
    if (this.gaussGuardado !== null) {
      const g = this.gaussGuardado;
      this.gaussGuardado = null;
      return media + desviacion * g;
    }
    let u = 0;
    while (u === 0) u = this.siguiente();
    const v = this.siguiente();
    const r = Math.sqrt(-2 * Math.log(u));
    this.gaussGuardado = r * Math.sin(2 * Math.PI * v);
    return media + desviacion * r * Math.cos(2 * Math.PI * v);
  }

  probabilidad(p: number): boolean {
    return this.siguiente() < p;
  }

  elegir<T>(opciones: readonly T[]): T {
    return opciones[Math.floor(this.siguiente() * opciones.length)]!;
  }

  /** Vector unitario en una dirección cualquiera del espacio. */
  direccion(): [number, number, number] {
    const z = this.uniforme(-1, 1);
    const fi = this.uniforme(0, 2 * Math.PI);
    const r = Math.sqrt(1 - z * z);
    return [r * Math.cos(fi), r * Math.sin(fi), z];
  }
}
