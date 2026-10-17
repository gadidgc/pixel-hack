import { describe, expect, it } from 'vitest';
import { CABECERA_CSV, aCsv, leerCsv, reproducir } from '../src/csv';
import { simular } from '../src/simulador/escenarios';

describe('grabaciones CSV', () => {
  it('ida y vuelta sin perder datos', () => {
    const sim = simular('arrebato_moto', 3);
    const csv = aCsv({ metadatos: { etiqueta: 'arrebato-simulado', celular: 'simulador' }, entradas: sim.entradas });
    expect(csv.split('\n')[2]).toBe(CABECERA_CSV);
    const leido = leerCsv(csv);
    expect(leido.errores).toBe(0);
    expect(leido.metadatos).toEqual({ etiqueta: 'arrebato-simulado', celular: 'simulador' });
    expect(leido.entradas.length).toBe(sim.entradas.length);
    // El detector da el mismo resultado con la grabación original y con la leída del CSV.
    expect(reproducir(leido.entradas).alerta?.via).toBe(reproducir(sim.entradas).alerta?.via);
  });

  it('salta filas rotas y las cuenta', () => {
    const csv = [
      CABECERA_CSV,
      'imu,1000,0,0,9.8,0,0,0,,,,',
      'imu,abc,0,0,9.8,0,0,0,,,,',
      'imu,1020,0,,9.8,0,0,0,,,,',
      'gps,1030,,,,,,,-12.04,-77.04,,',
      'gps,1040,,,,,,,,,1,5',
      'otra,1050',
    ].join('\n');
    const r = leerCsv(csv);
    expect(r.entradas.length).toBe(2);
    expect(r.errores).toBe(4);
    const gps = r.entradas[1]!;
    expect(gps.tipo === 'gps' && gps.lectura.velocidad).toBeNull();
  });

  it('acepta celulares sin giroscopio (columnas vacías)', () => {
    const r = leerCsv(`${CABECERA_CSV}\nimu,1000,0.1,0.2,9.8,,,,,,,\n`);
    const m = r.entradas[0]!;
    expect(m.tipo === 'imu' && m.muestra.gx).toBeNull();
  });
});
