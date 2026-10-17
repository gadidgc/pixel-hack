import type { ConfigDetector } from '../config';
import { reproducir } from '../csv';
import { ESCENARIOS, simular, type Esperado } from './escenarios';
import type { OpcionesMundo } from './mundo';

export interface FilaEvaluacion {
  escenario: string;
  descripcion: string;
  esperado: Esperado;
  corridas: number;
  alertas: number;
  /** % de corridas con alerta. */
  tasaAlerta: number;
  /** Mediana y p90 del tiempo entre el jalón real y la alerta (s). */
  latenciaMedianaS: number | null;
  latenciaP90S: number | null;
  vias: Record<string, number>;
  motivosDescarte: Record<string, number>;
}

function percentil(valores: number[], p: number): number | null {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.floor(p * orden.length))]!;
}

/** Corre cada escenario `corridas` veces con semillas distintas. */
export function evaluarEscenarios(
  config: Partial<ConfigDetector>,
  corridas: number,
  modoDemo = false,
  mundo: OpcionesMundo = {},
): FilaEvaluacion[] {
  return ESCENARIOS.map((e) => {
    let alertas = 0;
    const latencias: number[] = [];
    const vias: Record<string, number> = {};
    const motivos: Record<string, number> = {};
    for (let s = 1; s <= corridas; s++) {
      const sim = simular(e, s, mundo);
      const r = reproducir(sim.entradas, config);
      for (const ev of r.eventos) if (ev.tipo === 'descartado') motivos[ev.motivo] = (motivos[ev.motivo] ?? 0) + 1;
      if (r.alerta) {
        alertas++;
        vias[r.alerta.via] = (vias[r.alerta.via] ?? 0) + 1;
        if (sim.tJalon !== null) latencias.push((r.alerta.t - sim.tJalon) / 1000);
      }
    }
    const lat = percentil(latencias, 0.5);
    const p90 = percentil(latencias, 0.9);
    return {
      escenario: e.nombre,
      descripcion: e.descripcion,
      esperado: modoDemo ? e.esperadoDemo : e.esperado,
      corridas,
      alertas,
      tasaAlerta: alertas / corridas,
      latenciaMedianaS: lat,
      latenciaP90S: p90,
      vias,
      motivosDescarte: motivos,
    };
  });
}

export interface Resumen {
  /** De los escenarios que deben alertar, % que alertó. */
  deteccion: number;
  /** De los escenarios que NO deben alertar, % que alertó (falsas alarmas). */
  falsasAlarmas: number;
}

export function resumir(filas: FilaEvaluacion[]): Resumen {
  let pos = 0;
  let posAlerta = 0;
  let neg = 0;
  let negAlerta = 0;
  for (const f of filas) {
    if (f.esperado === 'alerta') {
      pos += f.corridas;
      posAlerta += f.alertas;
    } else if (f.esperado === 'sin_alerta') {
      neg += f.corridas;
      negAlerta += f.alertas;
    }
  }
  return { deteccion: pos ? posAlerta / pos : 0, falsasAlarmas: neg ? negAlerta / neg : 0 };
}
