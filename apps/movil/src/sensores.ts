import { G, type MuestraImu } from '@pixel-hack/detector';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { INTERVALO_SENSORES_MS } from './sensores.constantes';

export { INTERVALO_SENSORES_MS };

export interface Suscripcion {
  detener: () => void;
  tieneGiroscopio: boolean;
}

/**
 * Convierte el reloj de los sensores (segundos desde que prendió el celular, según la plataforma)
 * al reloj del GPS (milisegundos de época Unix), para que el detector pueda compararlos.
 */
class Reloj {
  private desfase: number | null = null;

  aEpoca(timestampSegundos: number | undefined): number {
    const ahora = Date.now();
    if (timestampSegundos === undefined || !Number.isFinite(timestampSegundos)) return ahora;
    const ms = timestampSegundos * 1000;
    // Si la app estuvo pausada o el reloj saltó, recalculamos.
    if (this.desfase === null || Math.abs(ms + this.desfase - ahora) > 2000) this.desfase = ahora - ms;
    return ms + this.desfase;
  }
}

export async function pedirPermisoSensores(): Promise<boolean> {
  // En iPhone (web) el permiso de movimiento solo se puede pedir al tocar un botón.
  const { granted } = await Accelerometer.requestPermissionsAsync();
  return granted;
}

/**
 * (iOS y Android; la web usa sensores.web.ts.)
 * Escucha acelerómetro y giroscopio y entrega muestras ya en las unidades del detector:
 * expo-sensors da la aceleración en g (la pasamos a m/s²) y el giro en rad/s.
 */
export async function escucharSensores(alRecibir: (m: MuestraImu) => void): Promise<Suscripcion> {
  if (!(await Accelerometer.isAvailableAsync())) {
    throw new Error('Este dispositivo no tiene acelerómetro (el simulador de iPhone tampoco). Usa "Simular" o un celular real.');
  }
  const tieneGiroscopio = await Gyroscope.isAvailableAsync().catch(() => false);
  const reloj = new Reloj();
  let ultimoGiro: { t: number; x: number; y: number; z: number } | null = null;

  Accelerometer.setUpdateInterval(INTERVALO_SENSORES_MS);
  const subAcc = Accelerometer.addListener((d) => {
    const t = reloj.aEpoca(d.timestamp);
    // Usamos el giro solo si es reciente (los dos sensores llegan por separado).
    const giro = ultimoGiro && Math.abs(t - ultimoGiro.t) < 100 ? ultimoGiro : null;
    alRecibir({
      t,
      ax: d.x * G,
      ay: d.y * G,
      az: d.z * G,
      gx: giro ? giro.x : null,
      gy: giro ? giro.y : null,
      gz: giro ? giro.z : null,
    });
  });

  let subGiro: { remove: () => void } | null = null;
  if (tieneGiroscopio) {
    Gyroscope.setUpdateInterval(INTERVALO_SENSORES_MS);
    subGiro = Gyroscope.addListener((d) => {
      ultimoGiro = { t: reloj.aEpoca(d.timestamp), x: d.x, y: d.y, z: d.z };
    });
  }

  return {
    tieneGiroscopio,
    detener: () => {
      subAcc.remove();
      subGiro?.remove();
    },
  };
}
