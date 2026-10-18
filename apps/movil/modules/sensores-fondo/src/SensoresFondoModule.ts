import { NativeModule, requireOptionalNativeModule } from 'expo';

/** Cada fila: [t (ms época), ax, ay, az (m/s² con gravedad), gx, gy, gz (rad/s; NaN si no hay giroscopio)]. */
export type FilaMuestra = [number, number, number, number, number, number, number];

/** Para comprobar en un celular real que con la pantalla apagada siguen llegando muestras. */
export interface DiagnosticoSensores {
  activo: boolean;
  muestras: number;
  /** -1 si todavía no llegó ninguna. */
  msDesdeUltimaMuestra: number;
  /** Veces que el vigilante (solo Android) volvió a registrar los sensores porque dejaron de llegar. */
  reinicios: number;
  /** Android: la CPU se mantiene despierta con la pantalla apagada. */
  wakeLock: boolean;
}

type Eventos = {
  onMuestras: (evento: { muestras: FilaMuestra[] }) => void;
};

declare class SensoresFondoModule extends NativeModule<Eventos> {
  disponible(): { acelerometro: boolean; giroscopio: boolean };
  iniciar(intervaloMs: number): void;
  detener(): void;
  diagnostico(): DiagnosticoSensores;
  /** Android: `true` si la app ya no tiene "optimización de batería". iPhone: siempre `true`. */
  sinOptimizacionBateria(): boolean;
}

/**
 * `null` cuando el módulo nativo no está compilado (Expo Go o la web): la app cae a expo-sensors
 * y avisa que la protección solo funciona con la app abierta.
 */
export default requireOptionalNativeModule<SensoresFondoModule>('SensoresFondo');
