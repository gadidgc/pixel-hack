/**
 * Tipos compartidos del detector.
 *
 * Unidades (iguales en Node, React Native y la web):
 * - tiempo `t`: milisegundos (época Unix en el celular; cualquier origen en simulaciones).
 * - aceleración: m/s², INCLUYE la gravedad (lo que entrega el acelerómetro).
 * - giro: rad/s.
 * - velocidad: m/s. Distancias y precisión GPS: metros.
 */

export type Vec3 = [number, number, number];

/** Una lectura del acelerómetro, con el giroscopio más reciente si el celular lo tiene. */
export interface MuestraImu {
  t: number;
  ax: number;
  ay: number;
  az: number;
  /** `null` si el celular no tiene giroscopio. */
  gx: number | null;
  gy: number | null;
  gz: number | null;
}

/** Una posición del GPS. */
export interface LecturaGps {
  t: number;
  lat: number;
  lon: number;
  /** Velocidad que reporta el sistema; algunos celulares la dejan vacía (`null`). */
  velocidad: number | null;
  /** Radio de error en metros; `null` si no se conoce. */
  precision: number | null;
}

/**
 * Estados de la máquina:
 * - `reposo`: escuchando, no pasa nada raro.
 * - `posible_jalon`: hubo un pico de aceleración + giro; esperamos confirmar la huida.
 * - `alerta`: se confirmó la huida. Se queda aquí hasta que el dueño la cancele.
 */
export type EstadoDetector = 'reposo' | 'posible_jalon' | 'alerta';

/** Por qué un posible jalón no terminó en alerta. */
export type MotivoDescarte =
  /** El pico llegó cuando ya íbamos rápido (vamos en moto, bici o combi y hubo un bache). */
  | 'ya_en_vehiculo'
  /** Después del pico el celular quedó quieto: se cayó, lo dejaron en la mesa o lo tienen en la mano. */
  | 'quieto_despues'
  /** Hay GPS y no se vio velocidad de vehículo a tiempo. */
  | 'sin_huida'
  /** La velocidad subió de a poco, como un auto que arranca en un semáforo, no de golpe. */
  | 'arranque_gradual'
  /** Sin GPS, el movimiento tiene ritmo de pasos: alguien camina o corre con el celular. */
  | 'ritmo_de_pasos'
  /** El dueño canceló a mano. */
  | 'cancelado';

/** Cómo se confirmó la huida. */
export type ViaConfirmacion = 'velocidad_gps' | 'desplazamiento_gps' | 'solo_sensores';

export interface PosicionSimple {
  t: number;
  lat: number;
  lon: number;
  precision: number | null;
}

/** Lo que vio el detector después del jalón: sirve para entender por qué no hubo alerta. */
export interface DiagnosticoDescarte {
  /** Lecturas GPS que llegaron después del jalón, y cuántas tenían precisión aceptable. */
  lecturasGps: number;
  lecturasGpsValidas: number;
  /** Mejor precisión (m) entre esas lecturas; `null` si no llegó ninguna. */
  mejorPrecisionM: number | null;
  /** Velocidad más alta (m/s) entre las lecturas válidas; `null` si ninguna la traía. */
  maxVelocidadMs: number | null;
  /** Lo más lejos (m) que llegó el GPS desde el punto del jalón; `null` sin lecturas válidas. */
  maxDesplazamientoM: number | null;
  /** Desviación de la magnitud (g) desde 1 s después del jalón: cuánto "se corrió". `null` sin datos. */
  energiaG: number | null;
}

export type EventoDetector =
  | {
      tipo: 'posible_jalon';
      t: number;
      /** Pico de aceleración sin gravedad, en g. */
      picoAceleracionG: number;
      /** Pico de giro en rad/s; `null` sin giroscopio. */
      picoGiroRadS: number | null;
      /** Mediana de la velocidad GPS de los segundos previos; `null` si no hubo GPS. */
      velocidadPreviaMs: number | null;
    }
  | {
      tipo: 'descartado';
      t: number;
      motivo: MotivoDescarte;
      /** Momento del pico que se descartó (si lo hubo). */
      tJalon: number | null;
      /** Qué vio el detector entre el jalón y el descarte (para el registro de la app). `null` sin jalón. */
      diagnostico: DiagnosticoDescarte | null;
    }
  | {
      tipo: 'alerta';
      t: number;
      tJalon: number;
      via: ViaConfirmacion;
      /** `alta` con GPS; `media` cuando solo hubo sensores. */
      confianza: 'alta' | 'media';
      velocidadMs: number | null;
      posicionJalon: PosicionSimple | null;
      ultimaPosicion: PosicionSimple | null;
      picoAceleracionG: number;
      picoGiroRadS: number | null;
    };

/** Lo que la pantalla puede mostrar en vivo. */
export interface Telemetria {
  t: number;
  estado: EstadoDetector;
  aceleracionLinealG: number;
  giroRadS: number | null;
  velocidadMs: number | null;
  precisionGpsM: number | null;
}
