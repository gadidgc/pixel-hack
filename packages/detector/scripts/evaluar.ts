/**
 * Banco de pruebas del detector: corre todos los escenarios simulados (modo normal y modo demo)
 * y un "día normal" largo para contar falsas alarmas por hora. Escribe reportes/evaluacion.md.
 *
 *   npm run evaluar                       # 100 corridas por escenario, 200 h de día normal
 *   npm run evaluar -- --corridas 30 --horas 20   # versión rápida
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG_DEMO, CONFIG_POR_DEFECTO, type ConfigDetector } from '../src/config';
import { G } from '../src/matematica';
import type { OpcionesMundo } from '../src/simulador/mundo';
import { evaluarEscenarios, resumir, type FilaEvaluacion } from '../src/simulador/evaluacion';
import { simularDia, type ResultadoDia } from '../src/simulador/dia';

function argumento(nombre: string, porDefecto: number): number {
  const i = process.argv.indexOf(`--${nombre}`);
  const valor = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(valor) ? valor : porDefecto;
}

const corridas = argumento('corridas', 100);
const horas = argumento('horas', 200);
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const seg = (x: number | null) => (x === null ? '—' : `${x.toFixed(1)} s`);
const lista = (r: Record<string, number>) =>
  Object.entries(r)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${v}`)
    .join(', ') || '—';

function tabla(filas: FilaEvaluacion[]): string {
  const lineas = [
    '| Escenario | Esperado | Alertas | Tiempo hasta la alerta (mediana / p90) | Cómo se confirmó | Por qué se descartó |',
    '|---|---|---|---|---|---|',
  ];
  for (const f of filas) {
    const ok =
      f.esperado === 'alerta' ? (f.tasaAlerta >= 0.9 ? '✅' : '⚠️') : f.esperado === 'sin_alerta' ? (f.tasaAlerta <= 0.05 ? '✅' : '⚠️') : '·';
    lineas.push(
      `| \`${f.escenario}\` | ${f.esperado} | ${ok} ${pct(f.tasaAlerta)} (${f.alertas}/${f.corridas}) | ${seg(f.latenciaMedianaS)} / ${seg(f.latenciaP90S)} | ${lista(f.vias)} | ${lista(f.motivosDescarte)} |`,
    );
  }
  return lineas.join('\n');
}

function dias(config: Partial<ConfigDetector>): ResultadoDia {
  // Varios días cortos con semillas distintas suman `horas`.
  const total: ResultadoDia = { horas: 0, alertas: [], posiblesJalones: 0, descartes: {} };
  const porDia = 4;
  for (let s = 1; total.horas < horas; s++) {
    const r = simularDia(s, Math.min(porDia, horas - total.horas), config);
    total.horas += r.horas;
    total.alertas.push(...r.alertas);
    total.posiblesJalones += r.posiblesJalones;
    for (const [k, v] of Object.entries(r.descartes)) total.descartes[k] = (total.descartes[k] ?? 0) + v;
  }
  return total;
}

const inicio = Date.now();
console.log(`Evaluando ${corridas} corridas por escenario y ${horas} h de día normal…`);
const normal = evaluarEscenarios(CONFIG_POR_DEFECTO, corridas);
const demo = evaluarEscenarios(CONFIG_DEMO, corridas, true);
const dia = dias(CONFIG_POR_DEFECTO);

// Robustez: ¿qué pasa si el mundo real es peor que nuestro simulador?
const variantes: Array<{ nombre: string; mundo: OpcionesMundo }> = [
  { nombre: 'Sensores con el triple de ruido (gama baja)', mundo: { ruidoAcelerometro: 0.036 * G, ruidoGiroscopio: 0.06 } },
  { nombre: 'GPS cada 2 s y con 2–3 s de retraso', mundo: { gps: { intervaloMs: 2000, retrasoMs: 2500 } } },
  { nombre: 'Acelerómetro que satura en ±4 g', mundo: { saturacion: 4 * G } },
  { nombre: 'GPS malo: 30 m de error y 30% sin velocidad', mundo: { gps: { precisionM: 30, probVelocidadNula: 0.3 } } },
];
const robustez = variantes.map((v) => ({ ...v, r: resumir(evaluarEscenarios(CONFIG_POR_DEFECTO, Math.max(10, Math.round(corridas / 3)), false, v.mundo)) }));
const rn = resumir(normal);
const rd = resumir(demo);
const porHora = dia.alertas.length / dia.horas;
const segundos = ((Date.now() - inicio) / 1000).toFixed(0);

console.log(`Modo normal: detección ${pct(rn.deteccion)} · falsas alarmas ${pct(rn.falsasAlarmas)}`);
console.log(`Modo demo:   detección ${pct(rd.deteccion)} · falsas alarmas ${pct(rd.falsasAlarmas)}`);
console.log(`Día normal: ${dia.alertas.length} falsas alarmas en ${dia.horas} h (${(porHora * 16).toFixed(2)} por día de 16 h)`);
for (const a of dia.alertas.slice(0, 10)) console.log(`  · durante "${a.actividad}" (${a.via})`);
for (const v of robustez) console.log(`Robustez · ${v.nombre}: detección ${pct(v.r.deteccion)} · falsas alarmas ${pct(v.r.falsasAlarmas)}`);

const reporte = `# Evaluación del detector (simulación)

> Generado con \`npm run evaluar\` en ${segundos} s · ${corridas} corridas por escenario · ${horas} h de "día normal".
> ⚠️ **Son datos simulados**, no grabaciones reales. Los números del simulador (fuerza del jalón, vibración de la moto,
> error del GPS) son **estimaciones** nuestras. Sirven para probar la lógica y detectar regresiones; los umbrales
> finales se ajustan con las grabaciones reales (\`datos/\`). Ver [docs/PLAN.md](../../../docs/PLAN.md).

## Resumen

| Modo | Detección (escenarios de arrebato) | Falsas alarmas (escenarios trampa) |
|---|---|---|
| Normal | **${pct(rn.deteccion)}** | **${pct(rn.falsasAlarmas)}** |
| Demo (velocidad de huida = correr) | ${pct(rd.deteccion)} | ${pct(rd.falsasAlarmas)} |

**Día normal sin robos (modo normal):** ${dia.alertas.length} falsas alarmas en ${dia.horas} h simuladas
→ **${(porHora * 16).toFixed(2)} por día** de 16 h despierto. Posibles jalones evaluados: ${dia.posiblesJalones}.
Descartes: ${lista(dia.descartes)}.
${dia.alertas.length ? `\nFalsas alarmas por actividad: ${lista(dia.alertas.reduce<Record<string, number>>((acc, a) => ((acc[a.actividad] = (acc[a.actividad] ?? 0) + 1), acc), {}))}.\n` : ''}
## Robustez (modo normal, ${Math.max(10, Math.round(corridas / 3))} corridas por escenario)

Mismos escenarios, pero con un "mundo" peor que el que usamos para ajustar los umbrales.

| Variante | Detección | Falsas alarmas |
|---|---|---|
${robustez.map((v) => `| ${v.nombre} | ${pct(v.r.deteccion)} | ${pct(v.r.falsasAlarmas)} |`).join('\n')}

## Modo normal

${tabla(normal)}

## Modo demo

${tabla(demo)}

## Cómo leer esto
- **Esperado = alerta:** queremos ≥ 90% (✅). **sin_alerta:** queremos ≤ 5% (✅). **fuera_de_alcance:** no cuenta.
- **Tiempo hasta la alerta:** desde el jalón real hasta que la app manda la alerta. Incluye el retraso del GPS (0,5–1,5 s).
- **Cómo se confirmó:** \`velocidad_gps\` (2 lecturas seguidas > 15 km/h), \`desplazamiento_gps\` (> 40 m), \`solo_sensores\` (sin GPS).
`;

const salida = join(dirname(fileURLToPath(import.meta.url)), '..', 'reportes', 'evaluacion.md');
writeFileSync(salida, reporte);
console.log(`Reporte: ${salida}`);
