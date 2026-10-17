/**
 * Prueba SEMI-REAL de detección: no existe un dataset público de arrebatos desde moto con GPS,
 * así que armamos cada caso empalmando tres grabaciones REALES:
 *
 *   1. 20 s caminando con el celular en la mano (SHL: sensores + GPS reales)
 *   2. el jalón de un robo escenificado (SPU: Theft_Hand_Snatch / Theft_Bag_Grab)
 *   3. 20 s de un vehículo ya en marcha (SHL: auto o bus, sensores + GPS reales),
 *      con el GPS trasladado para que empiece donde terminó la caminata
 *
 *   npm run empalme-real -- --spu ruta/sensor_data.csv --shl carpeta/dia [--shl otra/carpeta]
 *
 * Limitaciones (decirlas siempre): el vehículo es un auto o bus, no una moto; los empalmes tienen
 * saltos de orientación; el jalón es de un robo a pie. Es una prueba de la lógica con señales reales,
 * no un robo real.
 */
import { createReadStream, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { CONFIG_POR_DEFECTO } from '../src/config';
import { reproducir, type Entrada } from '../src/csv';
import { desplazarLatLon, distanciaM } from '../src/geo';
import type { LecturaGps, MuestraImu } from '../src/tipos';

interface Tramo {
  imu: MuestraImu[];
  gps: LecturaGps[];
}

const args = process.argv.slice(2);
const valor = (n: string) => args[args.indexOf(n) + 1];
/**
 * SHL no guarda la velocidad del GPS (los celulares sí la dan). Con --con-velocidad la estimamos
 * como distancia entre lecturas reales / tiempo, para acercarnos a lo que verá la app.
 */
const conVelocidad = args.includes('--con-velocidad');
const iConfig = args.indexOf('--config');
const cambios = iConfig >= 0 ? JSON.parse(args[iConfig + 1] ?? '{}') : {};
const carpetasShl = args.flatMap((a, i) => (a === '--shl' ? [args[i + 1]!] : []));
if (!valor('--spu') || carpetasShl.length === 0) {
  console.error('Uso: npm run empalme-real -- --spu sensor_data.csv --shl carpeta/dia [--shl ...]');
  process.exit(1);
}

/** Jalones reales de SPU: desde 1 s antes del pico hasta 1 s después. */
function jalonesSpu(ruta: string): Array<{ etiqueta: string; muestras: MuestraImu[] }> {
  const lineas = readFileSync(ruta, 'utf8').trim().split(/\r?\n/);
  const cab = lineas[0]!.split(',');
  const i = (n: string) => cab.indexOf(n);
  const sesiones = new Map<string, { etiqueta: string; muestras: MuestraImu[] }>();
  for (const l of lineas.slice(1)) {
    const c = l.split(',');
    const etiqueta = c[i('label')]!;
    if (etiqueta !== 'Theft_Hand_Snatch' && etiqueta !== 'Theft_Bag_Grab') continue;
    const m: MuestraImu = {
      t: Number(c[i('timestamp')]) * 1000,
      ax: Number(c[i('accel_x')]),
      ay: Number(c[i('accel_y')]),
      az: Number(c[i('accel_z')]),
      gx: Number(c[i('gyro_x')]),
      gy: Number(c[i('gyro_y')]),
      gz: Number(c[i('gyro_z')]),
    };
    if (m.ax === 0 && m.ay === 0 && m.az === 0) continue;
    const id = c[i('session_id')]!;
    if (!sesiones.has(id)) sesiones.set(id, { etiqueta, muestras: [] });
    sesiones.get(id)!.muestras.push(m);
  }
  return [...sesiones.values()].map((s) => {
    let pico = s.muestras[0]!;
    for (const m of s.muestras) if (Math.hypot(m.ax, m.ay, m.az) > Math.hypot(pico.ax, pico.ay, pico.az)) pico = m;
    return { etiqueta: s.etiqueta, muestras: s.muestras.filter((m) => Math.abs(m.t - pico.t) <= 1000) };
  });
}

/** Lee un día de SHL y guarda tramos de 20 s: caminando (etiqueta 2) y en vehículo a > 20 km/h (5 auto, 6 bus). */
async function tramosShl(carpeta: string): Promise<{ caminar: Tramo[]; vehiculo: Tramo[] }> {
  const ubic = readFileSync(join(carpeta, 'Hand_Location.txt'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim().split(/\s+/).map(Number))
    .filter((c) => Number.isFinite(c[4]) && c[4] !== 0)
    .map((c) => ({ t: c[0]!, lat: c[4]!, lon: c[5]!, velocidad: null, precision: c[3]! }) as LecturaGps);
  const etiquetas = createInterface({ input: createReadStream(join(carpeta, 'Label.txt')) })[Symbol.asyncIterator]();
  const caminar: Tramo[] = [];
  const vehiculo: Tramo[] = [];
  let actual: { tipo: 'caminar' | 'vehiculo'; imu: MuestraImu[] } | null = null;
  let n = 0;
  const cerrar = () => {
    if (!actual || actual.imu.length < 1000) return;
    const t0 = actual.imu[0]!.t;
    const t1 = actual.imu[999]!.t; // 20 s a 50 Hz
    const gps = ubic.filter((u) => u.t >= t0 - 10_000 && u.t <= t1);
    if (gps.length < 20) return;
    const tramo = { imu: actual.imu.slice(0, 1000), gps };
    if (actual.tipo === 'vehiculo') {
      // Solo tramos ya en marcha: > 20 km/h en promedio.
      const dentro = gps.filter((u) => u.t >= t0);
      const d = distanciaM(dentro[0]!.lat, dentro[0]!.lon, dentro[dentro.length - 1]!.lat, dentro[dentro.length - 1]!.lon);
      if (d / ((dentro[dentro.length - 1]!.t - dentro[0]!.t) / 1000) < 5.5) return;
    }
    (actual.tipo === 'caminar' ? caminar : vehiculo).push(tramo);
  };
  for await (const linea of createInterface({ input: createReadStream(join(carpeta, 'Hand_Motion.txt')) })) {
    const e = (await etiquetas.next()).value as string | undefined;
    const clase = Number(e?.trim().split(/\s+/)[1] ?? 0);
    if (n++ % 2 === 1) continue;
    const c = linea.trim().split(/\s+/).map(Number);
    if (!Number.isFinite(c[1])) continue;
    const tipo = clase === 2 ? 'caminar' : clase === 5 || clase === 6 ? 'vehiculo' : null;
    if (!tipo) {
      cerrar();
      actual = null;
    } else if (!actual || actual.tipo !== tipo || actual.imu.length >= 1000) {
      cerrar();
      actual = { tipo, imu: [] };
    }
    actual?.imu.push({ t: c[0]!, ax: c[1]!, ay: c[2]!, az: c[3]!, gx: c[4]!, gy: c[5]!, gz: c[6]! });
  }
  cerrar();
  return { caminar, vehiculo };
}

/** Une caminata + jalón + vehículo en una sola grabación continua, con el GPS del vehículo trasladado. */
function empalmar(caminar: Tramo, jalon: MuestraImu[], vehiculo: Tramo): { entradas: Entrada[]; tJalon: number } {
  const datos: Array<{ t: number; e: Entrada }> = [];
  for (const u of caminar.gps) datos.push({ t: u.t, e: { tipo: 'gps', lectura: { ...u } } });
  for (const m of caminar.imu) datos.push({ t: m.t, e: { tipo: 'imu', muestra: m } });
  let fin = caminar.imu[caminar.imu.length - 1]!.t;
  const ultimaPos = caminar.gps[caminar.gps.length - 1]!;

  const dJalon = fin + 20 - jalon[0]!.t;
  const tJalon = fin + 20 + 1000; // el pico está ~1 s después del inicio del recorte
  for (const m of jalon) datos.push({ t: m.t + dJalon, e: { tipo: 'imu', muestra: { ...m, t: m.t + dJalon } } });
  fin = jalon[jalon.length - 1]!.t + dJalon;

  const dVeh = fin + 20 - vehiculo.imu[0]!.t;
  for (const m of vehiculo.imu) datos.push({ t: m.t + dVeh, e: { tipo: 'imu', muestra: { ...m, t: m.t + dVeh } } });
  // GPS del vehículo: se traslada para que la primera lectura quede donde estaba el peatón.
  const enMarcha = vehiculo.gps.filter((g) => g.t >= vehiculo.imu[0]!.t);
  const p0 = enMarcha[0]!;
  for (const g of enMarcha) {
    const este = distanciaM(p0.lat, p0.lon, p0.lat, g.lon) * Math.sign(g.lon - p0.lon);
    const norte = distanciaM(p0.lat, p0.lon, g.lat, p0.lon) * Math.sign(g.lat - p0.lat);
    const pos = desplazarLatLon(ultimaPos.lat, ultimaPos.lon, este, norte);
    // El GPS real del vehículo empieza recién 1 s después del jalón (como pasaría con el retraso del GPS).
    datos.push({ t: g.t + dVeh + 1000, e: { tipo: 'gps', lectura: { ...g, ...pos, t: g.t + dVeh + 1000 } } });
  }
  datos.sort((a, b) => a.t - b.t);
  if (conVelocidad) {
    let previa: LecturaGps | null = null;
    for (const d of datos) {
      if (d.e.tipo !== 'gps') continue;
      const l = d.e.lectura;
      if (previa && l.t > previa.t) l.velocidad = distanciaM(previa.lat, previa.lon, l.lat, l.lon) / ((l.t - previa.t) / 1000);
      previa = { ...l };
    }
  }
  return { entradas: datos.map((d) => d.e), tJalon };
}

async function principal() {
  const jalones = jalonesSpu(valor('--spu')!);
  const caminatas: Tramo[] = [];
  const vehiculos: Tramo[] = [];
  for (const c of carpetasShl) {
    const t = await tramosShl(c);
    caminatas.push(...t.caminar.slice(0, 15));
    vehiculos.push(...t.vehiculo.slice(0, 15));
  }
  console.log(`Jalones reales (SPU): ${jalones.length} · caminatas reales (SHL): ${caminatas.length} · tramos de vehículo en marcha (SHL): ${vehiculos.length}`);
  let total = 0;
  let alertas = 0;
  const motivos: Record<string, number> = {};
  const latencias: number[] = [];
  for (let k = 0; k < jalones.length; k++) {
    for (let r = 0; r < 10; r++) {
      const caminata = caminatas[(k * 7 + r * 3) % caminatas.length]!;
      const veh = vehiculos[(k * 5 + r) % vehiculos.length]!;
      const { entradas, tJalon } = empalmar(caminata, jalones[k]!.muestras, veh);
      const res = reproducir(entradas, { ...CONFIG_POR_DEFECTO, ...cambios });
      total++;
      const jalon = res.eventos.find((e) => e.tipo === 'posible_jalon');
      if (res.alerta) {
        alertas++;
        latencias.push((res.alerta.t - tJalon) / 1000);
      } else {
        const d = res.eventos.filter((e) => e.tipo === 'descartado').pop();
        const m = !jalon ? 'sin_posible_jalon' : d && d.tipo === 'descartado' ? d.motivo : 'otro';
        motivos[m] = (motivos[m] ?? 0) + 1;
      }
    }
  }
  latencias.sort((a, b) => a - b);
  console.log(`Detectados: ${alertas}/${total} (${((alertas / total) * 100).toFixed(1)}%)`);
  if (latencias.length) console.log(`Tiempo desde el jalón hasta la alerta: mediana ${latencias[Math.floor(latencias.length / 2)]!.toFixed(1)} s, p90 ${latencias[Math.floor(latencias.length * 0.9)]!.toFixed(1)} s`);
  console.log(`No detectados por: ${Object.entries(motivos).map(([k, v]) => `${k} ${v}`).join(', ') || '—'}`);
}

principal().catch((e) => {
  console.error(e);
  process.exit(1);
});
