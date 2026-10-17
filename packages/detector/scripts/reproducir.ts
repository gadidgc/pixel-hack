/**
 * Pasa grabaciones reales (CSV del modo "grabar" de la app) por el detector.
 *
 *   npm run reproducir -- datos/grabaciones/*.csv
 *   npm run reproducir -- --demo archivo.csv
 *   npm run reproducir -- --simular arrebato_moto --guardar datos/ejemplos/arrebato_moto.csv
 *
 * Si el archivo tiene `# etiqueta=...`, compara el resultado con lo esperado:
 * las etiquetas que empiezan con "arrebato" deben dar alerta; el resto, no.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { CONFIG_DEMO, CONFIG_POR_DEFECTO } from '../src/config';
import { aCsv, leerCsv, reproducir } from '../src/csv';
import { simular } from '../src/simulador/escenarios';
import type { EventoDetector } from '../src/tipos';

const args = process.argv.slice(2);
const demo = args.includes('--demo');
const config = demo ? CONFIG_DEMO : CONFIG_POR_DEFECTO;

function describir(e: EventoDetector, t0: number): string {
  const s = ((e.t - t0) / 1000).toFixed(1).padStart(6);
  switch (e.tipo) {
    case 'posible_jalon':
      return `${s} s  posible jalón: ${e.picoAceleracionG.toFixed(1)} g, giro ${e.picoGiroRadS?.toFixed(1) ?? '—'} rad/s, velocidad previa ${e.velocidadPreviaMs?.toFixed(1) ?? '—'} m/s`;
    case 'descartado':
      return `${s} s  descartado: ${e.motivo}`;
    case 'alerta':
      return `${s} s  🚨 ALERTA (${e.via}, confianza ${e.confianza}) ${((e.t - e.tJalon) / 1000).toFixed(1)} s después del jalón, velocidad ${e.velocidadMs?.toFixed(1) ?? '—'} m/s`;
  }
}

const iSimular = args.indexOf('--simular');
if (iSimular >= 0) {
  const nombre = args[iSimular + 1] ?? 'arrebato_moto';
  const iGuardar = args.indexOf('--guardar');
  const sim = simular(nombre, 1);
  const csv = aCsv({ metadatos: { etiqueta: nombre.replace(/_/g, '-'), origen: 'simulador (no es una grabación real)', semilla: '1' }, entradas: sim.entradas });
  if (iGuardar >= 0 && args[iGuardar + 1]) {
    writeFileSync(args[iGuardar + 1]!, csv);
    console.log(`Guardado en ${args[iGuardar + 1]} (${sim.entradas.length} filas)`);
  } else {
    process.stdout.write(csv);
  }
  process.exit(0);
}

const archivos = args.filter((a) => !a.startsWith('--'));
if (archivos.length === 0) {
  console.error('Uso: npm run reproducir -- [--demo] archivo.csv [más.csv]');
  process.exit(1);
}

let aciertos = 0;
let conEtiqueta = 0;
for (const archivo of archivos) {
  const g = leerCsv(readFileSync(archivo, 'utf8'));
  const primera = g.entradas[0];
  const t0 = primera ? (primera.tipo === 'imu' ? primera.muestra.t : primera.lectura.t) : 0;
  const imu = g.entradas.filter((e) => e.tipo === 'imu').length;
  const gps = g.entradas.length - imu;
  const r = reproducir(g.entradas, config);
  console.log(`\n${basename(archivo)} · ${imu} muestras de sensores, ${gps} de GPS${g.errores ? `, ${g.errores} filas con error` : ''}`);
  for (const [k, v] of Object.entries(g.metadatos)) console.log(`  ${k}: ${v}`);
  for (const e of r.eventos) console.log('  ' + describir(e, t0));
  if (r.eventos.length === 0) console.log('  (sin eventos)');
  const etiqueta = g.metadatos['etiqueta'];
  if (etiqueta) {
    conEtiqueta++;
    const esperaAlerta = etiqueta.startsWith('arrebato') || (demo && etiqueta.startsWith('demo'));
    const ok = esperaAlerta === (r.alerta !== null);
    if (ok) aciertos++;
    console.log(`  ${ok ? '✅' : '❌'} esperado: ${esperaAlerta ? 'alerta' : 'sin alerta'}`);
  }
}
if (conEtiqueta > 0) console.log(`\n${aciertos}/${conEtiqueta} grabaciones con el resultado esperado (modo ${demo ? 'demo' : 'normal'}).`);
