import type { ConfigDetector } from '../config';
import { DetectorArrebato } from '../detector';
import type { EventoDetector } from '../tipos';
import { Azar } from './azar';
import {
  bache,
  caida,
  caminar,
  correr,
  frenazo,
  lanzarAMochila,
  quieto,
  sacarDelBolsillo,
  sacudir,
  sentarse,
  vehiculo,
} from './comportamientos';
import { Mundo } from './mundo';

export interface ResultadoDia {
  horas: number;
  alertas: Array<Extract<EventoDetector, { tipo: 'alerta' }> & { actividad: string }>;
  posiblesJalones: number;
  descartes: Record<string, number>;
}

/**
 * Un "día normal" de alguien en Lima, sin ningún robo: caminar, esperar, combis, mototaxis,
 * sacar el celular, alguna caída, correr al bus, ratos sin GPS. Sirve para contar falsas alarmas por hora.
 * El detector recibe los datos en vivo (no se guardan), así que se pueden simular cientos de horas.
 */
export function simularDia(semilla: number, horas: number, config: Partial<ConfigDetector> = {}): ResultadoDia {
  const azar = new Azar(semilla * 31337 + 17);
  const detector = new DetectorArrebato(config);
  const resultado: ResultadoDia = { horas, alertas: [], posiblesJalones: 0, descartes: {} };
  let actividad = 'inicio';

  const anotar = (eventos: EventoDetector[]) => {
    for (const e of eventos) {
      if (e.tipo === 'alerta') {
        resultado.alertas.push({ ...e, actividad });
        // En la vida real el dueño cancela la falsa alarma.
        detector.cancelar(e.t);
      } else if (e.tipo === 'posible_jalon') resultado.posiblesJalones++;
      else if (e.tipo === 'descartado') resultado.descartes[e.motivo] = (resultado.descartes[e.motivo] ?? 0) + 1;
    }
  };
  const m = new Mundo(
    azar,
    (muestra) => anotar(detector.procesarImu(muestra)),
    (lectura) => anotar(detector.procesarGps(lectura)),
  );
  const fin = m.t + horas * 3600_000;

  while (m.t < fin) {
    // Entre actividades nos detenemos (bajarnos del carro, pararnos en la esquina).
    if (m.rapidez > 0.5) quieto(m, azar.uniforme(2, 8), true);
    m.gps.activo = azar.probabilidad(0.85); // a veces estamos bajo techo
    const r = azar.siguiente();
    if (r < 0.3) {
      actividad = 'caminar';
      caminar(m, azar.uniforme(60, 480));
      if (azar.probabilidad(0.5)) {
        actividad = 'sacar_del_bolsillo';
        sacarDelBolsillo(m, azar.uniforme(10, 60), azar.probabilidad(0.6));
      }
    } else if (r < 0.5) {
      actividad = 'parado';
      quieto(m, azar.uniforme(30, 300), azar.probabilidad(0.6));
    } else if (r < 0.62) {
      actividad = 'combi';
      sentarse(m);
      const v = azar.uniforme(6, 14);
      for (let tramo = 0; tramo < azar.uniforme(3, 10); tramo++) {
        vehiculo(m, azar.uniforme(30, 120), { velocidad: v, vibracionG: azar.uniforme(0.04, 0.1), giroRuido: 0.2 });
        if (azar.probabilidad(0.3)) {
          actividad = 'frenazo';
          frenazo(m);
        } else {
          vehiculo(m, azar.uniforme(5, 20), { velocidad: 0, vibracionG: 0.03, giroRuido: 0.1, aMax: 3 });
        }
        actividad = 'combi';
      }
    } else if (r < 0.72) {
      actividad = 'mototaxi';
      quieto(m, 2, true);
      sentarse(m);
      vehiculo(m, azar.uniforme(3, 20), { velocidad: 0, vibracionG: 0.02, giroRuido: 0.05, baches: 0 });
      vehiculo(m, azar.uniforme(60, 400), { velocidad: azar.uniforme(5, 8.5), vibracionG: azar.uniforme(0.1, 0.2), giroRuido: 0.4, zigzag: true, baches: 0.8 });
    } else if (r < 0.78) {
      actividad = 'moto_propia';
      const o = { velocidad: azar.uniforme(7, 14), vibracionG: azar.uniforme(0.08, 0.2), giroRuido: 0.5, zigzag: true, baches: 0.8 };
      vehiculo(m, azar.uniforme(60, 300), o);
      actividad = 'bache';
      bache(m);
      vehiculo(m, azar.uniforme(30, 120), o);
    } else if (r < 0.84) {
      actividad = 'correr_al_bus';
      correr(m, azar.uniforme(5, 20));
      quieto(m, azar.uniforme(2, 10), true);
    } else if (r < 0.9) {
      actividad = 'lanzar_a_mochila';
      lanzarAMochila(m, azar.probabilidad(0.5), azar.uniforme(20, 120));
    } else if (r < 0.94) {
      actividad = 'sacudir';
      sacudir(m, azar.uniforme(1, 4));
      quieto(m, azar.uniforme(5, 30), true);
    } else if (r < 0.97) {
      actividad = 'caida';
      caida(m, azar.uniforme(2, 10));
    } else {
      actividad = 'mesa';
      quieto(m, azar.uniforme(300, 1200), false);
    }
  }
  return resultado;
}
