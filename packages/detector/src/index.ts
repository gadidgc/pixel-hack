export { DetectorArrebato } from './detector';
export { CONFIG_POR_DEFECTO, CONFIG_DEMO, ESPACIOS_DEMO, DISTANCIA_CORTA_M, DISTANCIA_DEMO_M, configDemo, distanciaDemoPorDefecto, crearConfig, type ConfigDetector, type EspacioDemo } from './config';
export { CABECERA_CSV, aCsv, filaCsv, leerCsv, reproducir, type Entrada, type Grabacion, type ResultadoReproduccion } from './csv';
export { distanciaM, desplazarLatLon } from './geo';
export { G } from './matematica';
export type * from './tipos';

// Simulador: lo usan las pruebas, la evaluación y el botón "Simular arrebato" de la app.
export { ESCENARIOS, simular, buscarEscenario, type Escenario, type Simulacion } from './simulador/escenarios';
export { simularDia, type ResultadoDia } from './simulador/dia';
export { evaluarEscenarios, resumir, type FilaEvaluacion, type Resumen } from './simulador/evaluacion';
