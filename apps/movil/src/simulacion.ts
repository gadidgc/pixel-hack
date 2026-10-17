import { CONFIG_DEMO, CONFIG_POR_DEFECTO, reproducir, simular, type EventoDetector } from '@pixel-hack/detector';

/** Escenarios que se pueden probar desde la app sin moverse (útil en la laptop del jurado). */
export const ESCENARIOS_APP = [
  { nombre: 'arrebato_moto', titulo: 'Arrebato desde moto' },
  { nombre: 'arrebato_moto_sin_gps', titulo: 'Arrebato sin GPS' },
  { nombre: 'caida_al_piso', titulo: 'Se cae al piso' },
  { nombre: 'subir_a_mototaxi', titulo: 'Subir a un mototaxi' },
  { nombre: 'bache_en_moto_propia', titulo: 'Bache en tu moto' },
  { nombre: 'demo_en_el_local', titulo: 'Demo a pie bajo techo' },
] as const;

export interface ResultadoSimulacion {
  titulo: string;
  duracionS: number;
  eventos: Array<{ segundo: number; evento: EventoDetector }>;
  hayAlerta: boolean;
}

/** Genera la señal con el simulador y la pasa por el mismo detector que usa la protección real. */
export function correrSimulacion(nombre: string, titulo: string, modoDemo: boolean): ResultadoSimulacion {
  const semilla = 1 + Math.floor(Math.random() * 1000);
  const sim = simular(nombre, semilla);
  const r = reproducir(sim.entradas, modoDemo ? CONFIG_DEMO : CONFIG_POR_DEFECTO);
  const primera = sim.entradas[0];
  const ultima = sim.entradas[sim.entradas.length - 1];
  const tiempo = (e: typeof primera) => (!e ? 0 : e.tipo === 'imu' ? e.muestra.t : e.lectura.t);
  const t0 = tiempo(primera);
  return {
    titulo,
    duracionS: (tiempo(ultima) - t0) / 1000,
    eventos: r.eventos.map((evento) => ({ segundo: (evento.t - t0) / 1000, evento })),
    hayAlerta: r.alerta !== null,
  };
}
