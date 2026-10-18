export { DetectorArrebato } from './detector';
export { CONFIG_POR_DEFECTO, CONFIG_DEMO, crearConfig, type ConfigDetector } from './config';
export { CABECERA_CSV, aCsv, filaCsv, leerCsv, reproducir, type Entrada, type Grabacion, type ResultadoReproduccion } from './csv';
export { distanciaM, desplazarLatLon } from './geo';
export { G } from './matematica';
export {
  CONFIG_LLAVE_DEMO,
  CONFIG_LLAVE_NORMAL,
  RSSI_A_1M_POR_DEFECTO,
  VigilanteLlave,
  calibrarRssiA1m,
  distanciaDesdeRssi,
  type ConfigLlave,
  type EstadoLlave,
  type EventoLlave,
  type LecturaLlave,
  type TelemetriaLlave,
} from './llave';
export type * from './tipos';

// Simulador: lo usan las pruebas, la evaluación y el botón "Simular arrebato" de la app.
export { ESCENARIOS, simular, buscarEscenario, type Escenario, type Simulacion } from './simulador/escenarios';
export { simularDia, type ResultadoDia } from './simulador/dia';
export { evaluarEscenarios, resumir, type FilaEvaluacion, type Resumen } from './simulador/evaluacion';
