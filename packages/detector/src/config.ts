import type { MotivoDescarte } from './tipos';

/**
 * Umbrales del detector. Todos se pueden ajustar con datos reales.
 * Los valores por defecto salen de la física del arrebato (docs/viabilidad-deteccion-arrebato-moto.md §1)
 * y de iterar sobre el simulador (packages/detector/reportes/evaluacion.md).
 */
export interface ConfigDetector {
  /** Pico mínimo de aceleración sin gravedad (g) cuando hay giroscopio. */
  umbralJalonG: number;
  /** Pico mínimo (g) cuando el celular no tiene giroscopio: pedimos más fuerza para compensar. */
  umbralJalonSinGiroG: number;
  /** Pico mínimo de giro (rad/s) en la misma ventana que la aceleración. */
  umbralGiroRadS: number;
  /** Ventana en la que deben coincidir el pico de aceleración y el de giro (ms). */
  ventanaJalonMs: number;
  /** Los primeros ms tras arrancar se ignoran mientras el filtro de gravedad se acomoda. */
  calentamientoMs: number;

  /** Velocidad máxima "de peatón" antes del jalón (m/s). Por encima, ya íbamos en un vehículo. */
  velocidadPeatonMaxMs: number;
  /** Cuántos ms antes del jalón miramos para saber si íbamos a pie. */
  ventanaPreviaMs: number;
  /**
   * Si el GPS mostró velocidad de vehículo hace menos de estos ms, seguimos "en un vehículo"
   * aunque ahora estemos parados (auto en un semáforo). Lo agregamos por los datos reales de SHL.
   */
  historialVehiculoMs: number;
  /** Velocidad que cuenta como "ir en un vehículo" para ese historial (m/s). */
  velocidadVehiculoMs: number;
  /**
   * Si después de bajar del vehículo caminamos (ritmo de pasos) esta cantidad de ms, el historial se borra:
   * alguien que bajó de la combi y camina ya es un peatón. `null` = nunca. (Auditoría: sin esto, un
   * arrebato en los 2 min después de bajar de un bus tenía 0% de detección.)
   */
  borrarHistorialCaminandoMs: number | null;

  /** Velocidad que cuenta como huida en vehículo (m/s). 4,2 m/s ≈ 15 km/h. */
  velocidadHuidaMs: number;
  /** Lecturas GPS seguidas por encima de `velocidadHuidaMs` para confirmar. */
  lecturasHuidaMin: number;
  /**
   * Huida "lenta": basta esta velocidad (m/s) si el celular NO tiene ritmo de pasos (no lo lleva alguien
   * corriendo: va en un vehículo). `null` = desactivado. (Auditoría: ladrón lento o que acelera.)
   */
  velocidadHuidaSinPasosMs: number | null;
  /** Distancia desde el punto del jalón que también confirma la huida (m). */
  desplazamientoHuidaM: number;
  /** Lecturas GPS con peor precisión que esta se ignoran (m). */
  precisionGpsMaxM: number;
  /** Tiempo máximo para confirmar la huida después del jalón (ms). */
  ventanaConfirmacionMs: number;
  /**
   * El ladrón ya viene rápido: la primera lectura de huida debe llegar antes de estos ms.
   * Un auto que arranca de cero acelera de a poco y llega tarde. `null` = sin límite.
   */
  huidaInmediataMs: number | null;

  /** Si la magnitud del acelerómetro varía menos que esto (desviación, en g)... */
  quietudDesviacionG: number;
  /** ...durante este tiempo, el celular está quieto (ms). */
  quietudDuracionMs: number;
  /** Tras el pico, se esperan estos ms antes de buscar quietud (el golpe "rebota"). */
  quietudInicioMs: number;
  /** Solo se busca quietud hasta estos ms después del pico: una caída queda quieta al toque. */
  quietudHastaMs: number;

  /** Sin GPS, ¿se permite alertar solo con sensores? (confianza media). */
  alertaSoloSensores: boolean;
  /** Sin GPS: desviación mínima de la magnitud (g) para considerar que hay huida. */
  energiaHuidaMinG: number;
  /** Sin GPS: autocorrelación desde la cual el movimiento tiene "ritmo de pasos". */
  umbralRitmoPasos: number;
  /**
   * Sin GPS: con ritmo de pasos, igual alertamos si la energía es la de alguien corriendo (g).
   * `null` = nunca (modo normal: el ladrón a pie está fuera de alcance).
   */
  energiaCorrerMinG: number | null;

  /** Un pico nuevo durante un posible jalón reinicia la cuenta (ver detector.reanclarJalon). */
  reanclarJalon: boolean;
  /** Tiempo que el GPS tiene para desmentir la "quietud" antes de descartar (ms). */
  quietudConfirmacionMs: number;

  /**
   * Segunda oportunidad: si un posible jalón (que empezó a pie) se descartó y en estos ms aparece velocidad
   * de huida sin ritmo de pasos, se alerta igual (confianza media). `null` = desactivado.
   */
  segundaOportunidadMs: number | null;
  /** Qué descartes dan segunda oportunidad. */
  segundaOportunidades: MotivoDescarte[];

  /** Tras un descarte, no se aceptan picos nuevos durante estos ms. */
  refractarioMs: number;
}

export const CONFIG_POR_DEFECTO: ConfigDetector = {
  umbralJalonG: 1.5,
  umbralJalonSinGiroG: 1.8,
  umbralGiroRadS: 4,
  ventanaJalonMs: 500,
  calentamientoMs: 1000,

  velocidadPeatonMaxMs: 2.5,
  ventanaPreviaMs: 10_000,
  historialVehiculoMs: 120_000,
  velocidadVehiculoMs: 3,
  borrarHistorialCaminandoMs: 10_000,

  velocidadHuidaMs: 4.2,
  lecturasHuidaMin: 2,
  velocidadHuidaSinPasosMs: 2.8,
  desplazamientoHuidaM: 40,
  precisionGpsMaxM: 35,
  ventanaConfirmacionMs: 10_000,
  huidaInmediataMs: 7000,

  quietudDesviacionG: 0.035,
  quietudDuracionMs: 1500,
  quietudInicioMs: 300,
  quietudHastaMs: 6000,

  // Con datos reales (SHL, SPU), alertar sin GPS dio decenas de falsas alarmas por día:
  // sin GPS solo avisamos "posible jalón" y empezamos a seguir la ubicación.
  alertaSoloSensores: false,
  energiaHuidaMinG: 0.06,
  umbralRitmoPasos: 0.45,
  energiaCorrerMinG: null,

  reanclarJalon: true,
  quietudConfirmacionMs: 4000,
  segundaOportunidadMs: 20_000,
  // Solo tras "no hubo huida". Medido: con 'arranque_gradual' las falsas alarmas reales pasaban de 9 a 19
  // (auto que arranca); con 'quieto_despues', subir a un mototaxi daba falsa alarma (10 en 80 h simuladas).
  segundaOportunidades: ['sin_huida'],

  refractarioMs: 3000,
};

/**
 * Modo demo: para mostrarlo en vivo frente al jurado SIN moto.
 * Un integrante arrancha el celular y se va corriendo, así que bajamos la velocidad de huida
 * a la de una persona corriendo. Hay que decirlo con honestidad en el pitch.
 */
export const CONFIG_DEMO: ConfigDetector = {
  ...CONFIG_POR_DEFECTO,
  velocidadPeatonMaxMs: 1.6,
  velocidadHuidaMs: 2.0,
  desplazamientoHuidaM: 25,
  lecturasHuidaMin: 2,
  // Sin GPS (bajo techo, en el local del evento): si hay ritmo de pasos, alertamos solo si
  // la energía es la de alguien corriendo, no caminando.
  energiaCorrerMinG: 0.3,
  // La persona que hace de ladrón corre unos segundos y se detiene: buscamos quietud solo al inicio.
  quietudHastaMs: 4000,
  // En la demo bajo techo no hay GPS: aceptamos la alerta solo con sensores (solo para el escenario).
  alertaSoloSensores: true,
  // Correr en un ensayo NO debe contar como "ir en un vehículo": si no, el siguiente ensayo
  // dentro de los 2 minutos se descartaría.
  velocidadVehiculoMs: 6,
  // La persona que hace de ladrón arranca corriendo desde quieta.
  huidaInmediataMs: null,
  // En la demo el jalón lo hace una persona, no una moto: pedimos un pico menor.
  umbralJalonG: 1.2,
};

export function crearConfig(cambios: Partial<ConfigDetector> = {}, base = CONFIG_POR_DEFECTO): ConfigDetector {
  return { ...base, ...cambios };
}
