import { describe, expect, it } from 'vitest';
import {
  CONFIG_LLAVE_DEMO,
  CONFIG_LLAVE_NORMAL,
  VigilanteLlave,
  calibrarRssiA1m,
  distanciaDesdeRssi,
  type EventoLlave,
} from '../src/llave';

const A1M = -60;
const N = CONFIG_LLAVE_DEMO.exponente;

/** El RSSI que llegaría a `d` metros según el modelo (lo inverso de distanciaDesdeRssi). */
function rssiA(d: number): number {
  return A1M - 10 * N * Math.log10(d);
}

/** Lecturas cada `pasoMs` desde `desde` hasta `hasta` (sin incluirlo), con la distancia que diga `d(t)`. */
function correr(v: VigilanteLlave, desde: number, hasta: number, d: (t: number) => number | null, pasoMs = 100, ruido?: (t: number) => number): EventoLlave[] {
  const eventos: EventoLlave[] = [];
  for (let t = desde; t < hasta; t += pasoMs) {
    const m = d(t);
    eventos.push(...(m === null ? v.revisar(t) : v.procesar({ t, rssi: rssiA(m) + (ruido?.(t) ?? 0) })));
  }
  return eventos;
}

function primera(eventos: EventoLlave[], tipo: EventoLlave['tipo']): EventoLlave | undefined {
  return eventos.find((e) => e.tipo === tipo);
}

describe('distancia por RSSI', () => {
  it('el modelo da 1 m con el RSSI de calibración y más metros con menos señal', () => {
    expect(distanciaDesdeRssi(A1M, A1M, N)).toBeCloseTo(1);
    expect(distanciaDesdeRssi(rssiA(5), A1M, N)).toBeCloseTo(5);
    expect(distanciaDesdeRssi(-90, A1M, N)).toBeGreaterThan(distanciaDesdeRssi(-80, A1M, N));
  });

  it('la calibración es la mediana (un pico raro no la mueve)', () => {
    expect(calibrarRssiA1m([])).toBeNull();
    expect(calibrarRssiA1m([-58, -61, -59, -60, -20])).toBe(-59);
  });
});

describe('vigilante de la llave (modo demo: 5 m durante 5 s)', () => {
  it('se llevan el celular: alerta 5 s después de pasar los 5 m', () => {
    const v = new VigilanteLlave(CONFIG_LLAVE_DEMO, A1M);
    // 10 s juntos y después el celular se aleja a 1 m/s (alguien camina con él).
    const eventos = correr(v, 0, 30_000, (t) => (t < 10_000 ? 0.5 : 0.5 + (t - 10_000) / 1000));
    const lejos = primera(eventos, 'llave_lejos');
    const alerta = primera(eventos, 'separacion');
    expect(lejos).toBeDefined();
    expect(alerta).toBeDefined();
    expect(alerta!.tipo === 'separacion' && alerta!.t - alerta!.tLejos).toBeGreaterThanOrEqual(5_000);
    // Pasa los 5 m hacia t = 14,5 s; con la mediana de 2 s lo vemos ~1 s después.
    expect(lejos!.t).toBeGreaterThan(14_000);
    expect(lejos!.t).toBeLessThan(16_500);
    expect(v.estado).toBe('separada');
  });

  it('la llave vuelve antes de 5 s: no hay alerta', () => {
    const v = new VigilanteLlave(CONFIG_LLAVE_DEMO, A1M);
    const eventos = correr(v, 0, 30_000, (t) => (t >= 10_000 && t < 13_000 ? 7 : 1));
    expect(primera(eventos, 'llave_lejos')).toBeDefined();
    expect(primera(eventos, 'llave_cerca')).toBeDefined();
    expect(primera(eventos, 'separacion')).toBeUndefined();
    expect(v.estado).toBe('cerca');
  });

  it('el ruido de la señal a 2 m no dispara la alerta', () => {
    const v = new VigilanteLlave(CONFIG_LLAVE_DEMO, A1M);
    let semilla = 7;
    // ±8 dBm: lecturas sueltas que "parecen" de 5 a 10 m.
    const ruido = () => (((semilla = (semilla * 16807) % 2147483647) / 2147483647) - 0.5) * 16;
    const eventos = correr(v, 0, 120_000, () => 2, 100, ruido);
    expect(primera(eventos, 'separacion')).toBeUndefined();
  });

  it('se pierde la señal (la llave salió del alcance): cuenta como lejos', () => {
    const v = new VigilanteLlave(CONFIG_LLAVE_DEMO, A1M);
    const eventos = correr(v, 0, 30_000, (t) => (t < 10_000 ? 1 : null));
    const lejos = primera(eventos, 'llave_lejos');
    const alerta = primera(eventos, 'separacion');
    expect(lejos?.tipo === 'llave_lejos' && lejos.distanciaM).toBeNull();
    // Última lectura ~9,9 s + 3 s sin señal + 5 s lejos.
    expect(alerta?.tipo === 'separacion' && alerta.tLejos).toBeCloseTo(12_900, -2);
    expect(alerta!.t).toBeGreaterThanOrEqual(17_900);
    expect(alerta!.t).toBeLessThan(18_100);
  });

  it('sin haber visto la llave cerca no alerta, pero avisa que no la encuentra', () => {
    const v = new VigilanteLlave(CONFIG_LLAVE_DEMO, A1M);
    const eventos = correr(v, 0, 60_000, () => null);
    expect(primera(eventos, 'separacion')).toBeUndefined();
    expect(eventos.filter((e) => e.tipo === 'llave_no_encontrada')).toHaveLength(1);
    // La llave aparece a 10 m (por ejemplo, en otro cuarto): todavía no la vimos cerca, tampoco alerta.
    expect(primera(correr(v, 60_000, 90_000, () => 10), 'separacion')).toBeUndefined();
    expect(v.estado).toBe('buscando');
  });

  it('después de una alerta, reiniciar espera ver la llave cerca otra vez', () => {
    const v = new VigilanteLlave(CONFIG_LLAVE_DEMO, A1M);
    correr(v, 0, 30_000, (t) => (t < 10_000 ? 1 : 12));
    expect(v.estado).toBe('separada');
    v.reiniciar();
    expect(primera(correr(v, 30_000, 60_000, () => 12), 'separacion')).toBeUndefined();
    expect(primera(correr(v, 60_000, 90_000, (t) => (t < 70_000 ? 1 : 12)), 'separacion')).toBeDefined();
  });

  it('la telemetría muestra la distancia y el tiempo sin señal', () => {
    const v = new VigilanteLlave(CONFIG_LLAVE_DEMO, A1M);
    correr(v, 0, 5_000, () => 3);
    const tel = v.obtenerTelemetria();
    expect(tel.estado).toBe('cerca');
    expect(tel.distanciaM).toBeCloseTo(3, 0);
    expect(tel.msSinSenal).toBe(0);
    v.revisar(7_000);
    expect(v.obtenerTelemetria().msSinSenal).toBe(2_100);
    expect(v.obtenerTelemetria().distanciaM).toBeNull();
  });
});

describe('vigilante de la llave (modo normal, estimación)', () => {
  it('6 m durante 30 s no alerta (está dentro de los 8 m), 12 m sí', () => {
    const v = new VigilanteLlave(CONFIG_LLAVE_NORMAL, A1M);
    expect(primera(correr(v, 0, 60_000, (t) => (t < 10_000 ? 1 : 6)), 'separacion')).toBeUndefined();
    const eventos = correr(v, 60_000, 120_000, () => 12);
    const alerta = primera(eventos, 'separacion');
    expect(alerta).toBeDefined();
    expect(alerta!.tipo === 'separacion' && alerta!.t - alerta!.tLejos).toBeGreaterThanOrEqual(20_000);
  });
});
