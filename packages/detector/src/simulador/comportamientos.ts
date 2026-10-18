import { G } from '../matematica';
import type { Vec3 } from '../tipos';
import type { Mundo } from './mundo';

/**
 * Comportamientos que mueven el celular dentro del `Mundo`.
 * Cada uno avanza el tiempo hasta terminar. Los números (frecuencia del paso, picos, vibración)
 * son ESTIMACIONES razonables, no mediciones: hay que reemplazarlos con grabaciones reales.
 */

type Vec2 = [number, number];

const PASOS_POR_SEGUNDO = 50;

function pasos(segundos: number): number {
  return Math.max(1, Math.round(segundos * PASOS_POR_SEGUNDO));
}

/** Aceleración horizontal para acercarse a la velocidad objetivo sin pasar de `aMax`. */
function seguirVelocidad(m: Mundo, objetivo: Vec2, aMax: number, tau = 0.5): Vec2 {
  let ax = (objetivo[0] - m.vx) / tau;
  let ay = (objetivo[1] - m.vy) / tau;
  const n = Math.hypot(ax, ay);
  if (n > aMax) {
    ax = (ax / n) * aMax;
    ay = (ay / n) * aMax;
  }
  return [ax, ay];
}

function rumboActual(m: Mundo): number {
  return m.rapidez > 0.3 ? Math.atan2(m.vy, m.vx) : m.azar.uniforme(0, 2 * Math.PI);
}

export interface OpcionesCaminar {
  velocidad?: number;
  rumbo?: number;
  /** Frecuencia del paso (Hz). Caminar ≈ 1,8–2,1; correr ≈ 2,6–3,0. */
  frecuencia?: number;
  /** Rebote vertical de cada paso (en g). */
  rebote?: number;
  /** Balanceo de la mano (rad/s). */
  balanceo?: number;
}

/** Caminar (o correr, con otros parámetros) con el celular en la mano o el bolsillo. */
export function caminar(m: Mundo, segundos: number, o: OpcionesCaminar = {}): void {
  const az = m.azar;
  const v = o.velocidad ?? az.uniforme(1.0, 1.6);
  let rumbo = o.rumbo ?? rumboActual(m);
  const f = o.frecuencia ?? az.uniforme(1.7, 2.1);
  const rebote = (o.rebote ?? az.uniforme(0.15, 0.3)) * G;
  const balanceo = o.balanceo ?? az.uniforme(0.3, 0.9);
  const fase = az.uniforme(0, 2 * Math.PI);
  for (let i = 0; i < pasos(segundos); i++) {
    const s = (i / PASOS_POR_SEGUNDO) * 2 * Math.PI * f + fase;
    rumbo += az.gauss(0, 0.004);
    const dir: Vec2 = [Math.cos(rumbo), Math.sin(rumbo)];
    const [ax, ay] = seguirVelocidad(m, [dir[0] * v, dir[1] * v], 2);
    const adelante = 0.35 * rebote * Math.sin(s + 0.8);
    const a: Vec3 = [ax + dir[0] * adelante, ay + dir[1] * adelante, rebote * (Math.sin(s) + 0.3 * Math.sin(2 * s + 1.1))];
    const omega: Vec3 = [
      balanceo * Math.sin(s / 2),
      0.6 * balanceo * Math.sin(s / 2 + 1),
      0.4 * balanceo * Math.sin(s),
    ];
    m.paso(a, omega, 0.02 * G, 0.05);
  }
}

/** Correr: pasos más rápidos y fuertes. */
export function correr(m: Mundo, segundos: number, o: OpcionesCaminar = {}): void {
  const az = m.azar;
  caminar(m, segundos, {
    velocidad: o.velocidad ?? az.uniforme(2.8, 4.0),
    rumbo: o.rumbo,
    frecuencia: o.frecuencia ?? az.uniforme(2.6, 3.0),
    rebote: o.rebote ?? az.uniforme(0.7, 1.1),
    balanceo: o.balanceo ?? az.uniforme(1.5, 3.5),
  });
}

/**
 * Parado. `enMano`: la mano se mueve mientras miras o escribes; si no, el celular está apoyado.
 * Calibrado con datos reales (dataset SPU, "Normal_Standing"): la magnitud varía 0,06–0,2 g
 * y el giro llega a 2–5 rad/s. Antes usábamos 0,008 g, que era irreal.
 */
export function quieto(m: Mundo, segundos: number, enMano = true): void {
  const az = m.azar;
  const f1 = az.uniforme(0.4, 1.2);
  const f2 = az.uniforme(1.5, 3);
  const a1 = az.uniforme(0.04, 0.1) * G;
  const a2 = az.uniforme(0.02, 0.06) * G;
  const g1 = az.uniforme(0.3, 1.2);
  const fase = az.uniforme(0, 2 * Math.PI);
  const eje = az.direccion();
  for (let i = 0; i < pasos(segundos); i++) {
    const [ax, ay] = seguirVelocidad(m, [0, 0], 2);
    if (!enMano) {
      m.paso([ax, ay, 0], [0, 0, 0], 0, 0);
      continue;
    }
    const s = (i / PASOS_POR_SEGUNDO) * 2 * Math.PI;
    // Coseno: la mano va y viene sin desplazarse.
    const vertical = a1 * Math.cos(f1 * s + fase) + a2 * Math.cos(f2 * s);
    const giro = g1 * Math.sin(f1 * s + fase) + 0.5 * g1 * Math.sin(f2 * s);
    m.paso([ax, ay, vertical], [eje[0] * giro, eje[1] * giro, eje[2] * giro], 0.01 * G, 0.05);
  }
}

export interface OpcionesVehiculo {
  velocidad: number;
  aMax?: number;
  /** Vibración del motor y la pista (en g, desviación por eje). */
  vibracionG?: number;
  giroRuido?: number;
  /** Cambios bruscos de dirección (zigzag entre carros). */
  zigzag?: boolean;
  rumbo?: number;
  /** Baches por segundo. */
  baches?: number;
}

/** Ir en un vehículo (moto, bici, mototaxi, combi). */
export function vehiculo(m: Mundo, segundos: number, o: OpcionesVehiculo): void {
  const az = m.azar;
  let rumbo = o.rumbo ?? rumboActual(m);
  const aMax = o.aMax ?? 2.5;
  const vibracion = (o.vibracionG ?? 0.1) * G;
  const giroRuido = o.giroRuido ?? 0.3;
  const baches = o.baches ?? 0.3;
  let bache = 0;
  for (let i = 0; i < pasos(segundos); i++) {
    if (o.zigzag && az.probabilidad(0.02)) rumbo += az.gauss(0, 0.35);
    else rumbo += az.gauss(0, 0.003);
    const [ax, ay] = seguirVelocidad(m, [Math.cos(rumbo) * o.velocidad, Math.sin(rumbo) * o.velocidad], aMax, 1.0);
    if (bache <= 0 && az.probabilidad(baches / PASOS_POR_SEGUNDO)) bache = 3;
    const golpe = bache > 0 ? az.uniforme(0.2, 0.6) * G * (bache === 2 ? -1 : 1) : 0;
    bache--;
    m.paso([ax, ay, golpe], [az.gauss(0, giroRuido), az.gauss(0, giroRuido), az.gauss(0, giroRuido)], vibracion, giroRuido * 0.5);
  }
}

export interface OpcionesJalon {
  /** Velocidad del ladrón (m/s) en el momento del jalón. */
  velocidad: number;
  rumbo?: number;
  /** Cuánto dura el jalón (s): 0,1 a 0,5. */
  duracion: number;
  /** Giro máximo del celular (rad/s). */
  giro: number;
  /** Golpe de la mano al agarrarlo (g). */
  golpeG?: number;
  vibracionG?: number;
}

/**
 * El jalón: el celular pasa de la velocidad del peatón a la del ladrón en `duracion` segundos.
 * Perfil de coseno: la aceleración máxima es (π/2)·Δv/Δt.
 */
export function jalon(m: Mundo, o: OpcionesJalon): void {
  const az = m.azar;
  const rumbo = o.rumbo ?? az.uniforme(0, 2 * Math.PI);
  const final: Vec2 = [Math.cos(rumbo) * o.velocidad, Math.sin(rumbo) * o.velocidad];
  const dv: Vec2 = [final[0] - m.vx, final[1] - m.vy];
  const golpe = (o.golpeG ?? az.uniforme(0.8, 2)) * G;
  const dirGolpe = az.direccion();
  const eje = az.direccion();
  const n = pasos(o.duracion);
  const cola = pasos(0.6);
  const vibracion = (o.vibracionG ?? 0.1) * G;
  for (let i = 0; i < n + cola; i++) {
    const tiempo = i / PASOS_POR_SEGUNDO;
    let a: Vec3 = [0, 0, 0];
    if (i < n) {
      const k = (Math.PI / (2 * o.duracion)) * Math.sin((Math.PI * tiempo) / o.duracion);
      a = [dv[0] * k, dv[1] * k, 0];
    } else {
      const [ax, ay] = seguirVelocidad(m, final, 3);
      a = [ax, ay, 0];
    }
    if (i < 2) a = [a[0] + dirGolpe[0] * golpe, a[1] + dirGolpe[1] * golpe, a[2] + dirGolpe[2] * golpe];
    const giro = o.giro * Math.exp(-tiempo / 0.35);
    m.paso(a, [eje[0] * giro, eje[1] * giro, eje[2] * giro], i < n ? 0.05 * G : vibracion, 0.2);
  }
}

/** Se cae el celular desde la mano: caída libre, golpe, rebote y queda en el piso. */
export function caida(m: Mundo, segundosEnElPiso: number): void {
  const az = m.azar;
  const altura = az.uniforme(0.7, 1.5);
  const tCaida = Math.sqrt((2 * altura) / G);
  const eje = az.direccion();
  const giro = az.uniforme(3, 10);
  for (let i = 0; i < pasos(tCaida); i++) {
    m.paso([0, 0, -G], [eje[0] * giro, eje[1] * giro, eje[2] * giro], 0, 0);
  }
  const vImpacto = G * tCaida;
  m.detener();
  // Golpe contra el piso (dura ~20 ms, el acelerómetro se satura).
  m.paso([0, 0, vImpacto / 0.02], [0, 0, 0], 0.5 * G, 1);
  m.orientarAlAzar();
  for (let i = 0; i < pasos(0.3); i++) {
    const rebote = i % 5 === 0 ? az.uniforme(1, 3) * G : 0;
    m.paso([0, 0, rebote], [az.gauss(0, 3), az.gauss(0, 3), az.gauss(0, 3)], 0.1 * G, 0.5);
  }
  m.detener();
  quieto(m, segundosEnElPiso, false);
}

/** Lanzar el celular a la mochila o al asiento: un empujón con giro y luego reposo o caminata. */
export function lanzarAMochila(m: Mundo, despuesCamina: boolean, segundosDespues: number): void {
  const az = m.azar;
  const eje = az.direccion();
  const dir = az.direccion();
  const fuerza = az.uniforme(1.5, 3) * G;
  const giro = az.uniforme(4, 9);
  const [vx, vy] = [m.vx, m.vy];
  for (let i = 0; i < pasos(0.2); i++) {
    const k = Math.sin((Math.PI * i) / pasos(0.2));
    m.paso([dir[0] * fuerza * k, dir[1] * fuerza * k, dir[2] * fuerza * k], [eje[0] * giro, eje[1] * giro, eje[2] * giro], 0.05 * G, 0.2);
  }
  // Cae dentro de la mochila: vuelve a moverse con la persona.
  m.fijarVelocidad(vx, vy);
  m.paso([0, 0, az.uniforme(1, 2.5) * G], [0, 0, 0], 0.1 * G, 0.5);
  m.orientarAlAzar();
  if (despuesCamina) caminar(m, segundosDespues, { rebote: az.uniforme(0.1, 0.2), balanceo: 0.2 });
  else quieto(m, segundosDespues, false);
}

/** Sacar el celular del bolsillo rápido (para contestar) y seguir caminando. */
export function sacarDelBolsillo(m: Mundo, segundosDespues: number, caminando = true): void {
  const az = m.azar;
  const eje = az.direccion();
  const dir = az.direccion();
  const fuerza = az.uniforme(0.8, 2.2) * G;
  const giro = az.uniforme(3, 7);
  const n = pasos(0.3);
  for (let i = 0; i < n; i++) {
    const k = Math.sin((2 * Math.PI * i) / n);
    const g = giro * Math.sin((Math.PI * i) / n);
    m.paso([dir[0] * fuerza * k, dir[1] * fuerza * k, dir[2] * fuerza * k], [eje[0] * g, eje[1] * g, eje[2] * g], 0.03 * G, 0.1);
  }
  if (caminando) caminar(m, segundosDespues);
  else quieto(m, segundosDespues, true);
}

/** Sacudir el celular unos segundos (enojo, juego, mostrarle algo a alguien). */
export function sacudir(m: Mundo, segundos: number): void {
  const az = m.azar;
  const f = az.uniforme(3, 5);
  const dir = az.direccion();
  const eje = az.direccion();
  const fuerza = az.uniforme(1.5, 3) * G;
  const giro = az.uniforme(3, 8);
  const [vx, vy] = [m.vx, m.vy];
  for (let i = 0; i < pasos(segundos); i++) {
    // Coseno: la mano va y viene sin desplazarse en promedio.
    const c = Math.cos((2 * Math.PI * f * i) / PASOS_POR_SEGUNDO);
    const s = Math.sin((2 * Math.PI * f * i) / PASOS_POR_SEGUNDO);
    m.paso([dir[0] * fuerza * c, dir[1] * fuerza * c, dir[2] * fuerza * c], [eje[0] * giro * s, eje[1] * giro * s, eje[2] * giro * s], 0.05 * G, 0.2);
  }
  m.fijarVelocidad(vx, vy);
}

/** Sentarse en un mototaxi, taxi o combi (pequeño golpe y quieto). */
export function sentarse(m: Mundo): void {
  const az = m.azar;
  const eje = az.direccion();
  const giro = az.uniforme(1, 3.5);
  const n = pasos(0.5);
  for (let i = 0; i < n; i++) {
    const s = Math.sin((2 * Math.PI * i) / n);
    m.paso([0, 0, -s * az.uniforme(0.6, 1.2) * G], [eje[0] * giro * s, eje[1] * giro * s, eje[2] * giro * s], 0.03 * G, 0.1);
  }
}

/** Frenazo fuerte con el celular que se resbala de la mano. */
export function frenazo(m: Mundo): void {
  const az = m.azar;
  const rumbo = Math.atan2(m.vy, m.vx);
  const desaceleracion = az.uniforme(4, 7);
  const eje = az.direccion();
  const giro = az.uniforme(4, 8);
  const golpe = az.uniforme(1.5, 3) * G;
  const dir = az.direccion();
  let i = 0;
  while (m.rapidez > 0.2 && i < pasos(6)) {
    const extra = i < 3 ? golpe : 0;
    const g = giro * Math.exp(-i / 15);
    m.paso(
      [-Math.cos(rumbo) * desaceleracion + dir[0] * extra, -Math.sin(rumbo) * desaceleracion + dir[1] * extra, dir[2] * extra],
      [eje[0] * g, eje[1] * g, eje[2] * g],
      0.08 * G,
      0.2,
    );
    i++;
  }
  m.detener();
}

/** Un bache fuerte yendo en tu propia moto o bici. */
export function bache(m: Mundo): void {
  const az = m.azar;
  const eje = az.direccion();
  const giro = az.uniforme(4, 8);
  const fuerza = az.uniforme(2.5, 5) * G;
  for (let i = 0; i < pasos(0.3); i++) {
    const vertical = i < 3 ? fuerza * (i === 1 ? -0.6 : 1) : 0;
    const g = giro * Math.exp(-i / 6);
    m.paso([0, 0, vertical], [eje[0] * g, eje[1] * g, eje[2] * g], 0.15 * G, 0.3);
  }
}
