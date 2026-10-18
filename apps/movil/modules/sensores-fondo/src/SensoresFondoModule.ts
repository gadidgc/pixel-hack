import { NativeModule, requireOptionalNativeModule } from 'expo';

/** Cada fila: [t (ms época), ax, ay, az (m/s² con gravedad), gx, gy, gz (rad/s; NaN si no hay giroscopio)]. */
export type FilaMuestra = [number, number, number, number, number, number, number];

type Eventos = {
  onMuestras: (evento: { muestras: FilaMuestra[] }) => void;
};

declare class SensoresFondoModule extends NativeModule<Eventos> {
  disponible(): { acelerometro: boolean; giroscopio: boolean };
  iniciar(intervaloMs: number): void;
  detener(): void;
}

/**
 * `null` cuando el módulo nativo no está compilado (Expo Go o la web): la app cae a expo-sensors
 * y avisa que la protección solo funciona con la app abierta.
 */
export default requireOptionalNativeModule<SensoresFondoModule>('SensoresFondo');
