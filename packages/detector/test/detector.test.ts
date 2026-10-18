import { describe, expect, it } from 'vitest';
import { DetectorArrebato } from '../src/detector';
import { desplazarLatLon } from '../src/geo';
import { G } from '../src/matematica';
import type { EventoDetector } from '../src/tipos';

/**
 * Pruebas de la máquina de estados con señales hechas a mano (sin simulador),
 * para que cada regla se pueda leer y entender sola.
 */
const ORIGEN = { lat: -12.0464, lon: -77.0428 };

class Guion {
  readonly detector: DetectorArrebato;
  readonly eventos: EventoDetector[] = [];
  t = 1_000_000;
  private norte = 0;
  private semilla = 7;

  constructor(config: ConstructorParameters<typeof DetectorArrebato>[0] = {}) {
    this.detector = new DetectorArrebato(config);
  }

  private ruido(): number {
    this.semilla = (this.semilla * 16807) % 2147483647;
    return this.semilla / 2147483647 - 0.5;
  }

  /** `segundos` de muestras a 50 Hz. `vibracion` en g; `velocidad` mueve el GPS hacia el norte. */
  durante(segundos: number, o: { vibracion?: number; velocidad?: number | null; gps?: boolean; pasos?: boolean; sinGiro?: boolean } = {}) {
    const { vibracion = 0.005, velocidad = 0, gps = true, pasos = false, sinGiro = false } = o;
    for (let i = 0; i < segundos * 50; i++) {
      this.t += 20;
      const paso = pasos ? 0.25 * G * Math.sin((2 * Math.PI * 2 * this.t) / 1000) : 0;
      const z = G + paso + vibracion * G * this.ruido() * 3.4;
      const giro = sinGiro ? null : 0.02 * this.ruido();
      this.eventos.push(
        ...this.detector.procesarImu({ t: this.t, ax: vibracion * G * this.ruido(), ay: vibracion * G * this.ruido(), az: z, gx: giro, gy: giro, gz: giro }),
      );
      if (velocidad !== null) this.norte += (velocidad * 20) / 1000;
      if (gps && this.t % 1000 === 0) {
        const p = desplazarLatLon(ORIGEN.lat, ORIGEN.lon, 0, this.norte);
        this.eventos.push(...this.detector.procesarGps({ t: this.t, lat: p.lat, lon: p.lon, velocidad, precision: 8 }));
      }
    }
    return this;
  }

  /** Un jalón: 3 muestras con un pico de `g` y giro fuerte. */
  jalon(g = 3, giro = 10, sinGiro = false) {
    for (let i = 0; i < 3; i++) {
      this.t += 20;
      this.eventos.push(
        ...this.detector.procesarImu({ t: this.t, ax: g * G, ay: 0, az: G, gx: sinGiro ? null : giro, gy: sinGiro ? null : 0, gz: sinGiro ? null : 0 }),
      );
    }
    return this;
  }

  tipos(): string[] {
    return this.eventos.map((e) => (e.tipo === 'descartado' ? `descartado:${e.motivo}` : e.tipo));
  }
}

describe('máquina de estados del detector', () => {
  it('jalón + velocidad de moto → alerta (por GPS, confianza alta)', () => {
    const g = new Guion().durante(12).jalon().durante(8, { vibracion: 0.15, velocidad: 9 });
    expect(g.tipos()).toEqual(['posible_jalon', 'alerta']);
    const alerta = g.eventos[1]!;
    expect(alerta.tipo === 'alerta' && alerta.via).toBe('velocidad_gps');
    expect(alerta.tipo === 'alerta' && alerta.confianza).toBe('alta');
    expect(g.detector.estado).toBe('alerta');
  });

  it('el celular no da velocidad: se calcula con las posiciones', () => {
    const g = new Guion().durante(12, { velocidad: null }).jalon();
    // Ahora se mueve a 9 m/s pero el sistema reporta velocidad vacía.
    for (let i = 0; i < 8; i++) {
      g.durante(1, { vibracion: 0.15, velocidad: null, gps: false });
      // GPS manual: avanza 9 m por segundo
      const p = desplazarLatLon(ORIGEN.lat, ORIGEN.lon, 0, 9 * (i + 1));
      g.eventos.push(...g.detector.procesarGps({ t: g.t, lat: p.lat, lon: p.lon, velocidad: null, precision: 5 }));
    }
    expect(g.tipos()).toContain('alerta');
  });

  it('se cae y queda quieto → descartado (quieto_despues)', () => {
    const g = new Guion().durante(12).jalon(6, 8).durante(8, { vibracion: 0.001 });
    expect(g.tipos()).toEqual(['posible_jalon', 'descartado:quieto_despues']);
    expect(g.detector.estado).toBe('reposo');
  });

  it('bache yendo ya en moto → descartado (ya_en_vehiculo)', () => {
    const g = new Guion().durante(12, { vibracion: 0.15, velocidad: 10 }).jalon().durante(5, { vibracion: 0.15, velocidad: 10 });
    expect(g.tipos()).toEqual(['descartado:ya_en_vehiculo']);
  });

  it('jalón y luego sigue caminando → descartado (no hubo huida rápida)', () => {
    const g = new Guion().durante(12, { pasos: true, velocidad: 1.3 }).jalon().durante(12, { pasos: true, velocidad: 1.3 });
    expect(g.tipos()).toEqual(['posible_jalon', 'descartado:arranque_gradual']);
  });

  it('auto parado en un semáforo: hubo velocidad de vehículo hace poco → descartado (ya_en_vehiculo)', () => {
    // Caso real del dataset SHL: el auto iba a 30 km/h, para 40 s, la persona mueve el celular y el auto arranca.
    const g = new Guion().durante(20, { velocidad: 8, vibracion: 0.05 }).durante(40, { velocidad: 0 }).jalon().durante(8, { velocidad: 8 });
    expect(g.tipos()).toEqual(['descartado:ya_en_vehiculo']);
  });

  it('la velocidad sube de a poco (auto que arranca) → descartado (arranque_gradual)', () => {
    const g = new Guion().durante(12).jalon().durante(8, { velocidad: 2, vibracion: 0.1 }).durante(8, { velocidad: 6, vibracion: 0.1 });
    expect(g.tipos()).toEqual(['posible_jalon', 'descartado:arranque_gradual']);
  });

  it('sin GPS, en modo normal NO alerta: solo avisa el posible jalón (decisión por datos reales)', () => {
    const g = new Guion().durante(12, { gps: false }).jalon().durante(12, { vibracion: 0.15, gps: false });
    expect(g.tipos()).toEqual(['posible_jalon', 'descartado:sin_huida']);
  });

  it('sin GPS (modo con alerta solo con sensores): vibración sin ritmo de pasos → alerta (confianza media)', () => {
    const g = new Guion({ alertaSoloSensores: true }).durante(12, { gps: false }).jalon().durante(12, { vibracion: 0.15, gps: false });
    expect(g.tipos()).toEqual(['posible_jalon', 'alerta']);
    const alerta = g.eventos[1]!;
    expect(alerta.tipo === 'alerta' && alerta.via).toBe('solo_sensores');
    expect(alerta.tipo === 'alerta' && alerta.confianza).toBe('media');
  });

  it('sin GPS (modo con alerta solo con sensores): jalón y luego ritmo de pasos → descartado (ritmo_de_pasos)', () => {
    const g = new Guion({ alertaSoloSensores: true }).durante(12, { gps: false }).jalon().durante(12, { gps: false, pasos: true });
    expect(g.tipos()).toEqual(['posible_jalon', 'descartado:ritmo_de_pasos']);
  });

  it('sin giroscopio: pide un pico mayor', () => {
    const debil = new Guion().durante(12, { sinGiro: true }).jalon(1.6, 0, true);
    expect(debil.tipos()).toEqual([]);
    const fuerte = new Guion().durante(12, { sinGiro: true }).jalon(2.5, 0, true);
    expect(fuerte.tipos()).toEqual(['posible_jalon']);
    const e = fuerte.eventos[0]!;
    expect(e.tipo === 'posible_jalon' && e.picoGiroRadS).toBeNull();
  });

  it('un pico sin giro (con giroscopio) no basta: un golpe en la mesa no es un arrebato', () => {
    const g = new Guion().durante(12).jalon(3, 1);
    expect(g.tipos()).toEqual([]);
  });

  it('ignora el primer segundo mientras el filtro se acomoda', () => {
    const g = new Guion().jalon().durante(1);
    expect(g.tipos()).toEqual([]);
  });

  it('cancelar vuelve a reposo y avisa', () => {
    const g = new Guion().durante(12).jalon().durante(8, { vibracion: 0.15, velocidad: 9 });
    expect(g.detector.estado).toBe('alerta');
    const eventos = g.detector.cancelar();
    expect(eventos).toEqual([expect.objectContaining({ tipo: 'descartado', motivo: 'cancelado' })]);
    expect(g.detector.estado).toBe('reposo');
  });

  it('reiniciar borra todo', () => {
    const g = new Guion().durante(12).jalon();
    expect(g.detector.estado).toBe('posible_jalon');
    g.detector.reiniciar();
    expect(g.detector.estado).toBe('reposo');
  });

  it('ignora lecturas GPS con mala precisión', () => {
    const g = new Guion({ alertaSoloSensores: true }).durante(12).jalon();
    for (let i = 1; i <= 8; i++) {
      g.durante(1, { vibracion: 0.15, gps: false });
      const p = desplazarLatLon(ORIGEN.lat, ORIGEN.lon, 0, 9 * i);
      g.eventos.push(...g.detector.procesarGps({ t: g.t, lat: p.lat, lon: p.lon, velocidad: 9, precision: 200 }));
    }
    // Sin GPS válido decide con sensores (vibración sin pasos), con confianza media.
    g.durante(4, { vibracion: 0.15, gps: false });
    const alerta = g.eventos.find((e) => e.tipo === 'alerta');
    expect(alerta && alerta.tipo === 'alerta' && alerta.via).toBe('solo_sensores');
  });
});
