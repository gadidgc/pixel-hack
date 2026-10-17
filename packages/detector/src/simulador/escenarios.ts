import type { Entrada } from '../csv';
import { Azar } from './azar';
import {
  bache,
  caida,
  caminar,
  correr,
  frenazo,
  jalon,
  lanzarAMochila,
  quieto,
  sacarDelBolsillo,
  sacudir,
  sentarse,
  vehiculo,
} from './comportamientos';
import { Mundo, type OpcionesMundo } from './mundo';

/** Qué debería pasar en cada escenario. */
export type Esperado = 'alerta' | 'sin_alerta' | 'fuera_de_alcance';

export interface Escenario {
  nombre: string;
  descripcion: string;
  /** En modo normal. */
  esperado: Esperado;
  /** En modo demo (umbral de velocidad de una persona corriendo). */
  esperadoDemo: Esperado;
  generar: (m: Mundo) => void;
  opciones?: (azar: Azar) => OpcionesMundo;
}

export interface Simulacion {
  escenario: string;
  semilla: number;
  entradas: Entrada[];
  /** Momento real del jalón (para medir cuánto tarda la alerta). `null` si no hay jalón. */
  tJalon: number | null;
}

/** Antes del evento: el celular en la mano, caminando o parado mirando la pantalla. */
function previa(m: Mundo, segundos = 15): void {
  if (m.azar.probabilidad(0.5)) caminar(m, segundos);
  else quieto(m, segundos, true);
}

let marcaJalon: number | null = null;
function marcarJalon(m: Mundo): void {
  marcaJalon = m.t;
}

function arrebatoEnMoto(m: Mundo, bolsillo = false): void {
  const az = m.azar;
  previa(m);
  marcarJalon(m);
  jalon(m, { velocidad: az.uniforme(5, 9), duracion: az.uniforme(0.15, 0.45), giro: az.uniforme(5, 15) });
  const opciones = {
    velocidad: az.uniforme(8, 14),
    aMax: az.uniforme(2, 3.5),
    vibracionG: az.uniforme(0.08, 0.25),
    giroRuido: az.uniforme(0.3, 1),
    zigzag: true,
    baches: 0.8,
  };
  if (bolsillo) {
    vehiculo(m, 1.5, opciones);
    sacarDelBolsillo(m, 0, false); // el ladrón lo guarda: otro giro fuerte
    vehiculo(m, 20, { ...opciones, vibracionG: az.uniforme(0.05, 0.12) });
  } else {
    vehiculo(m, 20, opciones);
  }
}

export const ESCENARIOS: Escenario[] = [
  // --- Lo que SÍ queremos detectar --------------------------------------------------------------
  {
    nombre: 'arrebato_moto',
    descripcion: 'Le arranchan el celular desde una moto que pasa a 18–32 km/h y huye a 30–50 km/h.',
    esperado: 'alerta',
    esperadoDemo: 'alerta',
    generar: (m) => arrebatoEnMoto(m),
  },
  {
    nombre: 'arrebato_moto_al_bolsillo',
    descripcion: 'Igual, pero el ladrón guarda el celular en el bolsillo a los 1,5 s.',
    esperado: 'alerta',
    esperadoDemo: 'alerta',
    generar: (m) => arrebatoEnMoto(m, true),
  },
  {
    nombre: 'arrebato_moto_gps_sin_velocidad',
    descripcion: 'El celular no reporta velocidad: hay que calcularla con las posiciones.',
    esperado: 'alerta',
    esperadoDemo: 'alerta',
    generar: (m) => arrebatoEnMoto(m),
    opciones: () => ({ gps: { probVelocidadNula: 1 } }),
  },
  {
    nombre: 'arrebato_moto_gps_impreciso',
    descripcion: 'GPS de ciudad con edificios: error de 20–30 m.',
    esperado: 'alerta',
    esperadoDemo: 'alerta',
    generar: (m) => arrebatoEnMoto(m),
    opciones: (az) => ({ gps: { precisionM: az.uniforme(20, 30) } }),
  },
  {
    nombre: 'arrebato_moto_sin_gps',
    descripcion:
      'No hay GPS: solo sensores. En modo normal NO alerta a propósito (con datos reales daba decenas de falsas alarmas por día); avisa "posible jalón".',
    esperado: 'fuera_de_alcance',
    esperadoDemo: 'alerta',
    generar: (m) => arrebatoEnMoto(m),
    opciones: () => ({ gps: { activo: false } }),
  },
  {
    nombre: 'arrebato_moto_sin_giroscopio',
    descripcion: 'Celular de gama baja sin giroscopio.',
    esperado: 'alerta',
    esperadoDemo: 'alerta',
    generar: (m) => arrebatoEnMoto(m),
    opciones: () => ({ sinGiroscopio: true }),
  },
  {
    nombre: 'arrebato_bici',
    descripcion: 'Ladrón en bicicleta: 16–23 km/h.',
    esperado: 'alerta',
    esperadoDemo: 'alerta',
    generar: (m) => {
      const az = m.azar;
      previa(m);
      marcarJalon(m);
      jalon(m, { velocidad: az.uniforme(4.5, 6.5), duracion: az.uniforme(0.2, 0.45), giro: az.uniforme(5, 12) });
      vehiculo(m, 20, { velocidad: az.uniforme(5, 7), vibracionG: az.uniforme(0.04, 0.1), giroRuido: 0.4, zigzag: true });
    },
  },
  // --- Fuera de alcance (solo en modo demo) ------------------------------------------------------
  {
    nombre: 'arrebato_a_pie',
    descripcion: 'El ladrón arrancha y se va corriendo. Fuera de alcance en modo normal; es la demo en vivo.',
    esperado: 'fuera_de_alcance',
    esperadoDemo: 'alerta',
    generar: (m) => {
      const az = m.azar;
      quieto(m, 15, true);
      marcarJalon(m);
      jalon(m, { velocidad: az.uniforme(2.5, 3.5), duracion: az.uniforme(0.2, 0.4), giro: az.uniforme(5, 12) });
      correr(m, 15, { velocidad: az.uniforme(3, 4) });
    },
  },
  {
    nombre: 'demo_en_el_local',
    descripcion: 'La demo frente al jurado: bajo techo y sin GPS, arranchan el celular y corren 4–8 s.',
    esperado: 'fuera_de_alcance',
    esperadoDemo: 'alerta',
    generar: (m) => {
      const az = m.azar;
      quieto(m, 15, true);
      marcarJalon(m);
      jalon(m, { velocidad: az.uniforme(2.5, 3.5), duracion: az.uniforme(0.2, 0.4), giro: az.uniforme(5, 12) });
      correr(m, az.uniforme(4, 8), { velocidad: az.uniforme(3, 4) });
      quieto(m, 10, true);
    },
    opciones: () => ({ gps: { activo: false } }),
  },
  // --- Lo que NO debe dar alerta -----------------------------------------------------------------
  {
    nombre: 'caminar',
    descripcion: 'Caminar 60 s con el celular en la mano.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => caminar(m, 60),
  },
  {
    nombre: 'caida_al_piso',
    descripcion: 'Se cae el celular al piso y se queda ahí unos segundos.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      previa(m);
      caida(m, m.azar.uniforme(3, 8));
      caminar(m, 15);
    },
  },
  {
    nombre: 'caida_sin_gps',
    descripcion: 'Caída al piso sin GPS.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      previa(m);
      caida(m, m.azar.uniforme(3, 8));
      caminar(m, 15);
    },
    opciones: () => ({ gps: { activo: false } }),
  },
  {
    nombre: 'lanzar_a_mochila',
    descripcion: 'Tirar el celular a la mochila y seguir caminando, o dejarlo en el asiento.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      previa(m);
      lanzarAMochila(m, m.azar.probabilidad(0.5), 20);
    },
  },
  {
    nombre: 'lanzar_a_mochila_sin_gps',
    descripcion: 'Igual, sin GPS: el ritmo de los pasos debe evitar la alerta.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      previa(m);
      lanzarAMochila(m, true, 20);
    },
    opciones: () => ({ gps: { activo: false } }),
  },
  {
    nombre: 'sacar_del_bolsillo',
    descripcion: 'Sacar el celular rápido para contestar y seguir caminando.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      caminar(m, 15);
      sacarDelBolsillo(m, 20, m.azar.probabilidad(0.7));
    },
  },
  {
    nombre: 'sacar_del_bolsillo_sin_gps',
    descripcion: 'Igual, sin GPS, caminando después.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      caminar(m, 15);
      sacarDelBolsillo(m, 20, true);
    },
    opciones: () => ({ gps: { activo: false } }),
  },
  {
    nombre: 'sacar_del_bolsillo_sin_giroscopio',
    descripcion: 'Celular de gama baja sin giroscopio: sacarlo rápido del bolsillo.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      caminar(m, 15);
      sacarDelBolsillo(m, 20, m.azar.probabilidad(0.7));
    },
    opciones: () => ({ sinGiroscopio: true }),
  },
  {
    nombre: 'lanzar_a_mochila_sin_giroscopio',
    descripcion: 'Celular sin giroscopio tirado a la mochila.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      previa(m);
      lanzarAMochila(m, m.azar.probabilidad(0.5), 20);
    },
    opciones: () => ({ sinGiroscopio: true }),
  },
  {
    nombre: 'combi_sin_gps',
    descripcion: 'Viaje en combi bajo techo (sin GPS), con frenazo y celular que se resbala.',
    esperado: 'sin_alerta',
    esperadoDemo: 'fuera_de_alcance', // el modo demo alerta sin GPS: solo para el escenario
    generar: (m) => {
      const az = m.azar;
      vehiculo(m, 25, { velocidad: az.uniforme(8, 14), vibracionG: az.uniforme(0.05, 0.1), giroRuido: 0.2 });
      frenazo(m);
      vehiculo(m, 20, { velocidad: az.uniforme(8, 14), vibracionG: az.uniforme(0.05, 0.1), giroRuido: 0.2 });
    },
    opciones: () => ({ gps: { activo: false } }),
  },
  {
    nombre: 'bache_en_moto_sin_gps',
    descripcion: 'Bache fuerte en tu propia moto, sin GPS.',
    esperado: 'sin_alerta',
    esperadoDemo: 'fuera_de_alcance', // el modo demo alerta sin GPS: solo para el escenario
    generar: (m) => {
      const az = m.azar;
      const o = { velocidad: az.uniforme(7, 12), vibracionG: az.uniforme(0.08, 0.2), giroRuido: 0.5, zigzag: true };
      vehiculo(m, 25, o);
      bache(m);
      vehiculo(m, 20, o);
    },
    opciones: () => ({ gps: { activo: false } }),
  },
  {
    nombre: 'sacudir_celular',
    descripcion: 'Sacudir el celular 2–4 s y luego mirarlo.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      previa(m);
      sacudir(m, m.azar.uniforme(2, 4));
      quieto(m, 15, true);
    },
  },
  {
    nombre: 'subir_a_mototaxi',
    descripcion: 'Caminar, subir a un mototaxi, esperar 8–30 s y arrancar a 20–30 km/h.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      const az = m.azar;
      caminar(m, 15);
      quieto(m, 2, true);
      sentarse(m);
      vehiculo(m, az.uniforme(8, 30), { velocidad: 0, vibracionG: 0.02, giroRuido: 0.05, baches: 0 });
      vehiculo(m, 30, { velocidad: az.uniforme(5.5, 8.5), vibracionG: az.uniforme(0.1, 0.2), giroRuido: 0.4, zigzag: true });
    },
  },
  {
    nombre: 'subir_rapido_a_mototaxi',
    descripcion: 'Subir y arrancar casi al toque (3–6 s): el caso más difícil de separar.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      const az = m.azar;
      caminar(m, 15);
      sentarse(m);
      vehiculo(m, az.uniforme(3, 6), { velocidad: 0, vibracionG: 0.02, giroRuido: 0.05, baches: 0 });
      vehiculo(m, 30, { velocidad: az.uniforme(5.5, 8.5), vibracionG: az.uniforme(0.1, 0.2), giroRuido: 0.4, zigzag: true });
    },
  },
  {
    nombre: 'bache_en_moto_propia',
    descripcion: 'Ir en tu propia moto y pasar un bache fuerte.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      const az = m.azar;
      const o = { velocidad: az.uniforme(7, 12), vibracionG: az.uniforme(0.08, 0.2), giroRuido: 0.5, zigzag: true };
      vehiculo(m, 25, o);
      bache(m);
      vehiculo(m, 20, o);
    },
  },
  {
    nombre: 'frenazo_en_combi',
    descripcion: 'Frenazo de la combi y el celular se resbala de la mano.',
    esperado: 'sin_alerta',
    esperadoDemo: 'sin_alerta',
    generar: (m) => {
      const az = m.azar;
      vehiculo(m, 25, { velocidad: az.uniforme(8, 14), vibracionG: 0.06, giroRuido: 0.2 });
      frenazo(m);
      quieto(m, 3, true);
      vehiculo(m, 20, { velocidad: az.uniforme(8, 14), vibracionG: 0.06, giroRuido: 0.2 });
    },
  },
  {
    nombre: 'correr_al_bus',
    descripcion: 'Salir corriendo a tomar el bus (2,8–4 m/s) y subir.',
    esperado: 'sin_alerta',
    esperadoDemo: 'fuera_de_alcance',
    generar: (m) => {
      const az = m.azar;
      caminar(m, 15);
      correr(m, az.uniforme(5, 15));
      quieto(m, 3, true);
      sentarse(m);
      vehiculo(m, 20, { velocidad: az.uniforme(6, 12), vibracionG: 0.06, giroRuido: 0.2 });
    },
  },
];

export function buscarEscenario(nombre: string): Escenario {
  const e = ESCENARIOS.find((x) => x.nombre === nombre);
  if (!e) throw new Error(`No existe el escenario "${nombre}". Opciones: ${ESCENARIOS.map((x) => x.nombre).join(', ')}`);
  return e;
}

/** Genera una simulación completa (mismo resultado para la misma semilla). */
export function simular(escenario: Escenario | string, semilla: number, extra: OpcionesMundo = {}): Simulacion {
  const e = typeof escenario === 'string' ? buscarEscenario(escenario) : escenario;
  const azar = new Azar(semilla * 7919 + e.nombre.length * 104729);
  const entradas: Entrada[] = [];
  const propias = e.opciones?.(azar) ?? {};
  const mundo = new Mundo(
    azar,
    (muestra) => entradas.push({ tipo: 'imu', muestra }),
    (lectura) => entradas.push({ tipo: 'gps', lectura }),
    { ...extra, ...propias, gps: { ...extra.gps, ...propias.gps } },
  );
  marcaJalon = null;
  e.generar(mundo);
  return { escenario: e.nombre, semilla, entradas, tJalon: marcaJalon };
}
