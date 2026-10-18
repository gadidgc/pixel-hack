import type { Vec3 } from './tipos';

/** Gravedad estándar (m/s²). */
export const G = 9.80665;

export function norma(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function cruz(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function media(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  let s = 0;
  for (const v of valores) s += v;
  return s / valores.length;
}

export function desviacion(valores: readonly number[]): number {
  if (valores.length < 2) return 0;
  const m = media(valores);
  let s = 0;
  for (const v of valores) s += (v - m) * (v - m);
  return Math.sqrt(s / valores.length);
}

export function mediana(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(orden.length / 2);
  return orden.length % 2 === 1 ? orden[mitad]! : (orden[mitad - 1]! + orden[mitad]!) / 2;
}

/**
 * Máxima autocorrelación normalizada para desfases entre `desfaseMin` y `desfaseMax` (en muestras).
 * Caminar o correr da un valor alto (el paso se repite); la vibración de una moto, bajo.
 */
export function autocorrelacionMaxima(valores: readonly number[], desfaseMin: number, desfaseMax: number): number {
  const n = valores.length;
  if (n < desfaseMax * 2) return 0;
  const m = media(valores);
  const c = valores.map((v) => v - m);
  let energia = 0;
  for (const v of c) energia += v * v;
  if (energia === 0) return 0;
  let mejor = 0;
  for (let k = Math.max(1, desfaseMin); k <= desfaseMax; k++) {
    let s = 0;
    for (let i = 0; i + k < n; i++) s += c[i]! * c[i + k]!;
    // Normalizamos por el número de pares para no castigar desfases largos.
    const r = (s / (n - k)) / (energia / n);
    if (r > mejor) mejor = r;
  }
  return mejor;
}

/** Ventana deslizante por tiempo: guarda solo lo de los últimos `duracionMs`. */
export class VentanaTemporal<T> {
  private tiempos: number[] = [];
  private datos: T[] = [];
  private inicio = 0;

  constructor(private readonly duracionMs: number) {}

  agregar(t: number, dato: T): void {
    this.tiempos.push(t);
    this.datos.push(dato);
    const limite = t - this.duracionMs;
    while (this.inicio < this.tiempos.length && this.tiempos[this.inicio]! < limite) this.inicio++;
    // Compactamos de vez en cuando para no crecer sin fin.
    if (this.inicio > 512) {
      this.tiempos = this.tiempos.slice(this.inicio);
      this.datos = this.datos.slice(this.inicio);
      this.inicio = 0;
    }
  }

  /** Elementos con `desde <= t <= hasta`. */
  entre(desde: number, hasta: number = Infinity): Array<{ t: number; dato: T }> {
    const salida: Array<{ t: number; dato: T }> = [];
    for (let i = this.inicio; i < this.tiempos.length; i++) {
      const t = this.tiempos[i]!;
      if (t >= desde && t <= hasta) salida.push({ t, dato: this.datos[i]! });
    }
    return salida;
  }

  todos(): Array<{ t: number; dato: T }> {
    return this.entre(-Infinity);
  }

  ultimo(): { t: number; dato: T } | null {
    const i = this.tiempos.length - 1;
    return i >= this.inicio ? { t: this.tiempos[i]!, dato: this.datos[i]! } : null;
  }

  vaciar(): void {
    this.tiempos = [];
    this.datos = [];
    this.inicio = 0;
  }
}
