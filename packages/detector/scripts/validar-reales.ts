/**
 * Valida el detector con DATOS REALES de terceros (no del simulador).
 *
 *   npm run validar-reales -- --spu ruta/sensor_data.csv
 *
 * Los datasets no se guardan en el repo (licencias): cada integrante los descarga
 * (ver docs/validacion-datos-reales.md). Este script solo los lee.
 *
 * Formatos soportados:
 * - --spu: Capstone-Project-SPU (github.com/collinlojane05-cloud/Capstone-Project-SPU-),
 *   columnas session_id,timestamp(s),label,device_orientation,accel_x..z (m/s²),gyro_x..z (rad/s), ~42 Hz.
 *   Sesiones de 5–20 s SIN GPS: sirve para medir la ETAPA 1 (¿el jalón se detecta?) y,
 *   en sesiones sin GPS, la confirmación solo con sensores.
 * - --shl: Sussex-Huawei Locomotion preview (shl-dataset.org), carpeta de un día de un usuario
 *   (Hand_Motion.txt a 100 Hz, Hand_Location.txt, Label.txt). Celular EN LA MANO, día completo real
 *   con caminar, correr, bici, auto, bus, tren y metro, y GPS real (sin velocidad: se calcula).
 *   Sin robos: todo lo que alerte es una FALSA ALARMA.
 */
import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { CONFIG_DEMO, CONFIG_POR_DEFECTO, type ConfigDetector } from '../src/config';
import { aCsv, type Entrada } from '../src/csv';
import { DetectorArrebato } from '../src/detector';
import { G, norma } from '../src/matematica';
import type { EventoDetector, MuestraImu } from '../src/tipos';

interface Sesion {
  id: string;
  etiqueta: string;
  muestras: MuestraImu[];
}

function leerSpu(ruta: string): Sesion[] {
  const lineas = readFileSync(ruta, 'utf8').trim().split(/\r?\n/);
  const cab = lineas[0]!.split(',');
  const i = (n: string) => cab.indexOf(n);
  const sesiones = new Map<string, Sesion>();
  for (const linea of lineas.slice(1)) {
    const c = linea.split(',');
    const ax = Number(c[i('accel_x')]);
    const ay = Number(c[i('accel_y')]);
    const az = Number(c[i('accel_z')]);
    // La app del dataset escribe una primera fila en cero mientras el sensor arranca.
    if (ax === 0 && ay === 0 && az === 0) continue;
    const id = c[i('session_id')]!;
    let s = sesiones.get(id);
    if (!s) sesiones.set(id, (s = { id, etiqueta: c[i('label')]!, muestras: [] }));
    s.muestras.push({
      t: Number(c[i('timestamp')]) * 1000,
      ax,
      ay,
      az,
      gx: Number(c[i('gyro_x')]),
      gy: Number(c[i('gyro_y')]),
      gz: Number(c[i('gyro_z')]),
    });
  }
  return [...sesiones.values()];
}

/**
 * Las sesiones empiezan justo antes del evento. Agregamos 2 s del celular quieto en la mano
 * (repitiendo la primera lectura) para que el filtro de gravedad se acomode, como pasaría en la app.
 */
function conPreambulo(muestras: MuestraImu[]): MuestraImu[] {
  const p = muestras[0]!;
  const previas: MuestraImu[] = [];
  for (let k = 100; k >= 1; k--) previas.push({ ...p, t: p.t - k * 20 });
  return [...previas, ...muestras];
}

function correr(s: Sesion, config: ConfigDetector) {
  const d = new DetectorArrebato(config);
  const eventos: EventoDetector[] = [];
  let picoLineal = 0;
  let picoGiro = 0;
  for (const m of conPreambulo(s.muestras)) {
    eventos.push(...d.procesarImu(m));
    const tel = d.obtenerTelemetria();
    picoLineal = Math.max(picoLineal, tel.aceleracionLinealG);
    picoGiro = Math.max(picoGiro, tel.giroRadS ?? 0);
  }
  const ultima = s.muestras[s.muestras.length - 1]!;
  // Sin GPS: dejamos correr el reloj 10 s más para ver qué decide solo con sensores.
  eventos.push(...d.avanzarTiempo(ultima.t + config.ventanaConfirmacionMs + 100));
  const picoTotal = Math.max(...s.muestras.map((m) => norma([m.ax, m.ay, m.az]) / G));
  return { eventos, picoLineal, picoGiro, picoTotal };
}

const ACTIVIDADES_SHL = ['nula', 'quieto', 'caminar', 'correr', 'bici', 'auto', 'bus', 'tren', 'metro'];

async function* lineas(ruta: string): AsyncGenerator<string[]> {
  const rl = createInterface({ input: createReadStream(ruta), crlfDelay: Infinity });
  for await (const l of rl) yield l.trim().split(/\s+/);
}

/** Recorre un día de SHL en orden de tiempo y lo pasa por el detector como si fuera en vivo. */
/**
 * Guarda un recorte de un día de SHL en nuestro formato CSV (para pruebas con datos reales en el repo).
 * SHL es de dominio público con pedido de cita: la cita va en los metadatos del archivo.
 */
async function recortarShl(carpeta: string, desde: number, hasta: number, etiqueta: string, salida: string) {
  const entradas: Entrada[] = [];
  const ubic = readFileSync(join(carpeta, 'Hand_Location.txt'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s+/).map(Number))
    .filter((c) => Number.isFinite(c[4]) && c[4] !== 0 && c[0]! >= desde && c[0]! <= hasta);
  let iu = 0;
  let n = 0;
  for await (const c of lineas(join(carpeta, 'Hand_Motion.txt'))) {
    if (n++ % 2 === 1) continue;
    const t = Number(c[0]);
    if (t < desde) continue;
    if (t > hasta) break;
    if (!Number.isFinite(Number(c[1]))) continue;
    while (iu < ubic.length && ubic[iu]![0]! <= t) {
      const u = ubic[iu++]!;
      entradas.push({ tipo: 'gps', lectura: { t: u[0]!, lat: u[4]!, lon: u[5]!, velocidad: null, precision: u[3]! } });
    }
    entradas.push({ tipo: 'imu', muestra: { t, ax: Number(c[1]), ay: Number(c[2]), az: Number(c[3]), gx: Number(c[4]), gy: Number(c[5]), gz: Number(c[6]) } });
  }
  writeFileSync(
    salida,
    aCsv({
      metadatos: {
        etiqueta,
        fuente: `SHL Dataset preview, ${carpeta.split('/').slice(-2).join('/')}, celular en la mano, 100 Hz reducido a 50 Hz`,
        cita: 'H. Gjoreski et al., "A versatile annotated dataset for multimodal locomotion analytics with mobile devices", ACM SenSys 2017. The University of Sussex-Huawei Locomotion (SHL) Dataset, shl-dataset.org',
        licencia: 'dominio público con pedido de cita (archivo LICENSE del dataset)',
      },
      entradas,
    }),
  );
  console.log(`Guardado ${salida}: ${entradas.length} filas`);
}

async function validarShl(carpeta: string, config: ConfigDetector) {
  // Etiquetas (una por fila de Motion, 100 Hz) y ubicaciones (≈1 Hz) se leen enteras: son chicas.
  const ubicaciones = readFileSync(join(carpeta, 'Hand_Location.txt'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s+/).map(Number))
    .map((c) => ({ t: c[0]!, precision: c[3]!, lat: c[4]!, lon: c[5]! }))
    .filter((u) => Number.isFinite(u.lat) && u.lat !== 0);
  const etiquetas = lineas(join(carpeta, 'Label.txt'));
  const detector = new DetectorArrebato(config);
  const horas: Record<string, number> = {};
  const jalones: Record<string, number> = {};
  const alertas: Array<{ actividad: string; t: number; via: string }> = [];
  const descartes: Record<string, number> = {};
  let iu = 0;
  let n = 0;
  let actividad = 'nula';
  let sinGps = 0;
  for await (const c of lineas(join(carpeta, 'Hand_Motion.txt'))) {
    const e = (await etiquetas.next()).value as string[] | undefined;
    actividad = ACTIVIDADES_SHL[Number(e?.[1] ?? 0)] ?? 'nula';
    if (n++ % 2 === 1) continue; // 100 Hz → 50 Hz, como la app
    const t = Number(c[0]);
    const ax = Number(c[1]);
    if (!Number.isFinite(ax)) continue;
    horas[actividad] = (horas[actividad] ?? 0) + 0.02 / 3600;
    const eventos: EventoDetector[] = [];
    while (iu < ubicaciones.length && ubicaciones[iu]!.t <= t) {
      const u = ubicaciones[iu++]!;
      eventos.push(...detector.procesarGps({ t: u.t, lat: u.lat, lon: u.lon, velocidad: null, precision: u.precision }));
    }
    if (iu === 0 || t - ubicaciones[iu - 1]!.t > 10_000) sinGps += 0.02 / 3600;
    eventos.push(
      ...detector.procesarImu({ t, ax, ay: Number(c[2]), az: Number(c[3]), gx: Number(c[4]), gy: Number(c[5]), gz: Number(c[6]) }),
    );
    for (const ev of eventos) {
      if (ev.tipo === 'posible_jalon') jalones[actividad] = (jalones[actividad] ?? 0) + 1;
      if (ev.tipo === 'descartado') descartes[ev.motivo] = (descartes[ev.motivo] ?? 0) + 1;
      if (ev.tipo === 'alerta') {
        alertas.push({ actividad, t: ev.t, via: ev.via });
        detector.cancelar(ev.t); // el dueño la cancelaría
      }
    }
  }
  console.log(`SHL ${carpeta.split('/').slice(-2).join('/')} · celular en la mano · ${Object.values(horas).reduce((a, b) => a + b, 0).toFixed(1)} h (${sinGps.toFixed(1)} h sin GPS reciente)\n`);
  console.log('| Actividad | Horas | Posibles jalones | Por hora | Falsas alarmas |');
  console.log('|---|---|---|---|---|');
  for (const a of ACTIVIDADES_SHL) {
    if (!horas[a]) continue;
    const fa = alertas.filter((x) => x.actividad === a).length;
    console.log(`| ${a} | ${horas[a]!.toFixed(2)} | ${jalones[a] ?? 0} | ${((jalones[a] ?? 0) / horas[a]!).toFixed(1)} | ${fa} |`);
  }
  console.log(`\nDescartes: ${Object.entries(descartes).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const a of alertas) console.log(`  falsa alarma: ${a.actividad} (${a.via}) a las ${new Date(a.t).toISOString()}`);
}

const args = process.argv.slice(2);
const iShl = args.indexOf('--shl');
// --config '{"huidaInmediataMs":7000}' cambia umbrales para probar sin tocar src/config.ts.
const iConfig = args.indexOf('--config');
const cambios = iConfig >= 0 ? (JSON.parse(args[iConfig + 1] ?? '{}') as Partial<ConfigDetector>) : {};
const iRecorte = args.indexOf('--recorte');
if (iShl >= 0 && iRecorte >= 0) {
  // --recorte <desde ISO> <hasta ISO> <etiqueta> <salida.csv>
  const [desde, hasta, etiqueta, salida] = args.slice(iRecorte + 1, iRecorte + 5);
  recortarShl(args[iShl + 1]!, Date.parse(desde!), Date.parse(hasta!), etiqueta!, salida!).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else if (iShl >= 0) {
  const demo = args.includes('--demo');
  validarShl(args[iShl + 1]!, { ...(demo ? CONFIG_DEMO : CONFIG_POR_DEFECTO), ...cambios }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  validarSpu();
}

function validarSpu() {
const iSpu = args.indexOf('--spu');
if (iSpu < 0 || !args[iSpu + 1]) {
  console.error('Uso: npm run validar-reales -- --spu ruta/sensor_data.csv | --shl carpeta/del/dia [--demo]');
  process.exit(1);
}

const sesiones = leerSpu(args[iSpu + 1]!);
const porEtiqueta = new Map<string, Array<ReturnType<typeof correr>>>();
for (const s of sesiones) {
  const r = correr(s, { ...CONFIG_POR_DEFECTO, ...cambios });
  porEtiqueta.set(s.etiqueta, [...(porEtiqueta.get(s.etiqueta) ?? []), r]);
}

console.log(`Dataset SPU: ${sesiones.length} sesiones reales (~42 Hz, sin GPS)\n`);
console.log('| Etiqueta | Sesiones | Pico total (g) | Pico lineal (g) | Pico giro (rad/s) | Etapa 1: posible jalón | Alerta solo sensores | Descartes |');
console.log('|---|---|---|---|---|---|---|---|');
const rango = (v: number[]) => `${Math.min(...v).toFixed(1)}–${Math.max(...v).toFixed(1)}`;
for (const [etiqueta, rs] of [...porEtiqueta.entries()].sort()) {
  const jalones = rs.filter((r) => r.eventos.some((e) => e.tipo === 'posible_jalon')).length;
  const alertas = rs.filter((r) => r.eventos.some((e) => e.tipo === 'alerta')).length;
  const motivos: Record<string, number> = {};
  for (const r of rs) for (const e of r.eventos) if (e.tipo === 'descartado') motivos[e.motivo] = (motivos[e.motivo] ?? 0) + 1;
  console.log(
    `| ${etiqueta} | ${rs.length} | ${rango(rs.map((r) => r.picoTotal))} | ${rango(rs.map((r) => r.picoLineal))} | ${rango(rs.map((r) => r.picoGiro))} | ${jalones}/${rs.length} | ${alertas}/${rs.length} | ${Object.entries(motivos).map(([k, v]) => `${k} ${v}`).join(', ') || '—'} |`,
  );
}
}
