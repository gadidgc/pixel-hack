import { DetectorArrebato } from './detector';
import type { ConfigDetector } from './config';
import type { EventoDetector, LecturaGps, MuestraImu } from './tipos';

/**
 * Formato de las grabaciones (el mismo que exporta el modo "grabar" de la app).
 *
 *   # etiqueta=arrebato-simulado
 *   # celular=Samsung A14
 *   tipo,t,ax,ay,az,gx,gy,gz,lat,lon,velocidad,precision
 *   imu,1729200000000,0.12,9.79,0.30,0.01,0.00,-0.02,,,,
 *   gps,1729200000950,,,,,,,-12.0464,-77.0428,1.3,8
 *
 * Las filas van en el orden en que llegaron al celular, que es el orden en que se reproducen.
 * Las líneas que empiezan con `#` son metadatos (`clave=valor`).
 */
export type Entrada = { tipo: 'imu'; muestra: MuestraImu } | { tipo: 'gps'; lectura: LecturaGps };

export interface Grabacion {
  metadatos: Record<string, string>;
  entradas: Entrada[];
}

export const CABECERA_CSV = 'tipo,t,ax,ay,az,gx,gy,gz,lat,lon,velocidad,precision';

function numero(texto: string | undefined): number | null {
  if (texto === undefined || texto.trim() === '') return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

function texto(n: number | null, decimales: number): string {
  return n === null ? '' : String(Number(n.toFixed(decimales)));
}

export function filaCsv(entrada: Entrada): string {
  if (entrada.tipo === 'imu') {
    const m = entrada.muestra;
    return [
      'imu',
      Math.round(m.t),
      texto(m.ax, 4),
      texto(m.ay, 4),
      texto(m.az, 4),
      texto(m.gx, 4),
      texto(m.gy, 4),
      texto(m.gz, 4),
      '',
      '',
      '',
      '',
    ].join(',');
  }
  const l = entrada.lectura;
  return ['gps', Math.round(l.t), '', '', '', '', '', '', texto(l.lat, 7), texto(l.lon, 7), texto(l.velocidad, 2), texto(l.precision, 1)].join(',');
}

export function aCsv(grabacion: Grabacion): string {
  const lineas: string[] = [];
  for (const [clave, valor] of Object.entries(grabacion.metadatos)) lineas.push(`# ${clave}=${valor}`);
  lineas.push(CABECERA_CSV);
  for (const e of grabacion.entradas) lineas.push(filaCsv(e));
  return lineas.join('\n') + '\n';
}

/** Lee un CSV. Las filas mal formadas se saltan y se cuentan en `errores`. */
export function leerCsv(contenido: string): Grabacion & { errores: number } {
  const metadatos: Record<string, string> = {};
  const entradas: Entrada[] = [];
  let errores = 0;
  for (const cruda of contenido.split(/\r?\n/)) {
    const linea = cruda.trim();
    if (linea === '') continue;
    if (linea.startsWith('#')) {
      const [clave, ...resto] = linea.slice(1).split('=');
      if (clave && resto.length > 0) metadatos[clave.trim()] = resto.join('=').trim();
      continue;
    }
    if (linea.startsWith('tipo,')) continue;
    const c = linea.split(',');
    const t = numero(c[1]);
    if (t === null) {
      errores++;
      continue;
    }
    if (c[0] === 'imu') {
      const ax = numero(c[2]);
      const ay = numero(c[3]);
      const az = numero(c[4]);
      if (ax === null || ay === null || az === null) {
        errores++;
        continue;
      }
      entradas.push({ tipo: 'imu', muestra: { t, ax, ay, az, gx: numero(c[5]), gy: numero(c[6]), gz: numero(c[7]) } });
    } else if (c[0] === 'gps') {
      const lat = numero(c[8]);
      const lon = numero(c[9]);
      if (lat === null || lon === null) {
        errores++;
        continue;
      }
      entradas.push({ tipo: 'gps', lectura: { t, lat, lon, velocidad: numero(c[10]), precision: numero(c[11]) } });
    } else {
      errores++;
    }
  }
  return { metadatos, entradas, errores };
}

export interface ResultadoReproduccion {
  eventos: EventoDetector[];
  alerta: Extract<EventoDetector, { tipo: 'alerta' }> | null;
}

/** Pasa una grabación completa por un detector nuevo. */
export function reproducir(entradas: readonly Entrada[], config: Partial<ConfigDetector> = {}): ResultadoReproduccion {
  const detector = new DetectorArrebato(config);
  const eventos: EventoDetector[] = [];
  for (const e of entradas) {
    eventos.push(...(e.tipo === 'imu' ? detector.procesarImu(e.muestra) : detector.procesarGps(e.lectura)));
  }
  const ultima = entradas[entradas.length - 1];
  if (ultima) eventos.push(...detector.avanzarTiempo(ultima.tipo === 'imu' ? ultima.muestra.t : ultima.lectura.t));
  const alerta = eventos.find((e): e is Extract<EventoDetector, { tipo: 'alerta' }> => e.tipo === 'alerta') ?? null;
  return { eventos, alerta };
}
