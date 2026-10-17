import { describe, expect, it } from 'vitest';
import { CONFIG_DEMO, CONFIG_POR_DEFECTO } from '../src/config';
import { reproducir } from '../src/csv';
import { simularDia } from '../src/simulador/dia';
import { ESCENARIOS, simular } from '../src/simulador/escenarios';
import { evaluarEscenarios, resumir } from '../src/simulador/evaluacion';

/**
 * Pruebas de regresión con el simulador: si alguien cambia un umbral y empeora la detección
 * o aparecen falsas alarmas, esta prueba falla. La evaluación completa está en `npm run evaluar`.
 */
const CORRIDAS = 20;

describe('simulador', () => {
  it('es determinista: la misma semilla da exactamente lo mismo', () => {
    const a = simular('arrebato_moto', 42);
    const b = simular('arrebato_moto', 42);
    expect(a.entradas).toEqual(b.entradas);
    expect(simular('arrebato_moto', 43).entradas).not.toEqual(a.entradas);
  });

  it('marca el momento real del jalón solo en los escenarios con jalón', () => {
    expect(simular('arrebato_moto', 1).tJalon).not.toBeNull();
    expect(simular('caminar', 1).tJalon).toBeNull();
  });
});

describe('modo normal', () => {
  const filas = evaluarEscenarios(CONFIG_POR_DEFECTO, CORRIDAS);

  for (const f of filas.filter((x) => x.esperado === 'alerta')) {
    it(`detecta ${f.escenario} (≥ 85%)`, () => expect(f.tasaAlerta).toBeGreaterThanOrEqual(0.85));
  }
  for (const f of filas.filter((x) => x.esperado === 'sin_alerta')) {
    it(`no alerta en ${f.escenario} (≤ 5%)`, () => expect(f.tasaAlerta).toBeLessThanOrEqual(0.05));
  }

  it('en total: ≥ 95% de detección y ≤ 1% de falsas alarmas', () => {
    const r = resumir(filas);
    expect(r.deteccion).toBeGreaterThanOrEqual(0.95);
    expect(r.falsasAlarmas).toBeLessThanOrEqual(0.01);
  });

  it('la alerta sale en menos de 5 s cuando hay GPS', () => {
    const f = filas.find((x) => x.escenario === 'arrebato_moto')!;
    expect(f.latenciaP90S).not.toBeNull();
    expect(f.latenciaP90S!).toBeLessThan(5);
  });

  it('8 horas de un día normal sin robos: 0 falsas alarmas', () => {
    expect(simularDia(1, 8, CONFIG_POR_DEFECTO).alertas).toEqual([]);
  });
});

describe('modo demo', () => {
  it('detecta el arrebato a pie y la demo bajo techo (≥ 85%)', () => {
    for (const nombre of ['arrebato_a_pie', 'demo_en_el_local']) {
      let alertas = 0;
      for (let s = 1; s <= CORRIDAS; s++) if (reproducir(simular(nombre, s).entradas, CONFIG_DEMO).alerta) alertas++;
      expect(alertas / CORRIDAS, nombre).toBeGreaterThanOrEqual(0.85);
    }
  });

  it('el modo normal NO alerta con un ladrón a pie (fuera de alcance)', () => {
    let alertas = 0;
    for (let s = 1; s <= CORRIDAS; s++) if (reproducir(simular('arrebato_a_pie', s).entradas).alerta) alertas++;
    expect(alertas / CORRIDAS).toBeLessThanOrEqual(0.1);
  });

  it('todos los escenarios tienen nombre único y descripción', () => {
    const nombres = new Set(ESCENARIOS.map((e) => e.nombre));
    expect(nombres.size).toBe(ESCENARIOS.length);
    for (const e of ESCENARIOS) expect(e.descripcion.length).toBeGreaterThan(10);
  });
});
