import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { leerCsv, reproducir } from '../src/csv';

/**
 * Regresión con DATOS REALES (no simulados): recortes del SHL Dataset (dominio público con cita,
 * ver los metadatos de cada CSV). Celular en la mano de personas reales, con GPS real.
 * Más datos y cómo se obtuvieron: docs/validacion-datos-reales.md.
 */
const carpeta = join(__dirname, '..', 'datos', 'reales');

function cargar(nombre: string) {
  const g = leerCsv(readFileSync(join(carpeta, nombre), 'utf8'));
  expect(g.errores).toBe(0);
  return g;
}

describe('datos reales (SHL)', () => {
  it('auto parado en un semáforo, celular en la mano y el auto arranca: NO alerta', () => {
    // Este caso real daba falsa alarma antes de agregar el "historial de vehículo" (ver el documento).
    const g = cargar('shl-auto-semaforo.csv');
    const r = reproducir(g.entradas);
    expect(r.alerta).toBeNull();
    expect(r.eventos.some((e) => e.tipo === 'descartado' && e.motivo === 'ya_en_vehiculo')).toBe(true);
  });

  it('2,5 minutos caminando con el celular en la mano: NO alerta', () => {
    const g = cargar('shl-caminar.csv');
    expect(reproducir(g.entradas).alerta).toBeNull();
  });

  it('los recortes traen la cita y la licencia del dataset', () => {
    for (const nombre of ['shl-auto-semaforo.csv', 'shl-caminar.csv']) {
      const { metadatos } = cargar(nombre);
      expect(metadatos['cita']).toContain('Gjoreski');
      expect(metadatos['licencia']).toContain('dominio público');
    }
  });
});
