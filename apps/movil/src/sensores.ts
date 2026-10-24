import { G, type MuestraImu } from '@pixel-hack/detector';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import SensoresFondo, { type DiagnosticoSensores } from '../modules/sensores-fondo';
import { INTERVALO_SENSORES_MS } from './sensores.constantes';

export { INTERVALO_SENSORES_MS };

export interface Suscripcion {
  detener: () => void;
  tieneGiroscopio: boolean;
  /** `true` si los sensores siguen con la pantalla apagada o la app en segundo plano. */
  segundoPlano: boolean;
}

export async function pedirPermisoSensores(): Promise<boolean> {
  // En iPhone pide el permiso de "Movimiento y estado físico" si hace falta.
  const { granted } = await Accelerometer.requestPermissionsAsync();
  return granted;
}

/**
 * (iOS y Android; la web usa sensores.web.ts.)
 * Preferimos nuestro módulo nativo (modules/sensores-fondo), que sigue funcionando en segundo plano.
 * Si no está compilado (por ejemplo, en Expo Go), usamos expo-sensors, que se detiene al salir de la app.
 */
export async function escucharSensores(alRecibir: (m: MuestraImu) => void): Promise<Suscripcion> {
  if (MODO_CAPTURAS && !(await Accelerometer.isAvailableAsync())) return celularQuieto(alRecibir);
  if (SensoresFondo) {
    const disponible = SensoresFondo.disponible();
    if (!disponible.acelerometro) throw new Error('Este celular no tiene acelerómetro.');
    const sub = SensoresFondo.addListener('onMuestras', ({ muestras }) => {
      for (const [t, ax, ay, az, gx, gy, gz] of muestras) {
        const hayGiro = Number.isFinite(gx) && Number.isFinite(gy) && Number.isFinite(gz);
        alRecibir({ t, ax, ay, az, gx: hayGiro ? gx : null, gy: hayGiro ? gy : null, gz: hayGiro ? gz : null });
      }
    });
    SensoresFondo.iniciar(INTERVALO_SENSORES_MS);
    return {
      tieneGiroscopio: disponible.giroscopio,
      segundoPlano: true,
      detener: () => {
        sub.remove();
        SensoresFondo?.detener();
      },
    };
  }
  return escucharConExpoSensors(alRecibir);
}

/**
 * Modo capturas (solo para las fotos de las tiendas, docs/publicacion-tiendas.md): el simulador de iPhone no tiene
 * acelerómetro y sin él no se puede mostrar la protección encendida. Con EXPO_PUBLIC_MODO_CAPTURAS=1 al compilar,
 * y solo si el aparato no tiene acelerómetro, mandamos lo que mediría un celular quieto sobre la mesa.
 * Los builds de tienda no llevan esta variable.
 */
const MODO_CAPTURAS = process.env.EXPO_PUBLIC_MODO_CAPTURAS === '1';

function celularQuieto(alRecibir: (m: MuestraImu) => void): Suscripcion {
  const id = setInterval(() => alRecibir({ t: Date.now(), ax: 0, ay: 0, az: G, gx: 0, gy: 0, gz: 0 }), INTERVALO_SENSORES_MS);
  // `segundoPlano: true` para que la pantalla muestre la protección como en un celular real (sin el aviso de "limitada").
  return { tieneGiroscopio: true, segundoPlano: true, detener: () => clearInterval(id) };
}

/**
 * Para la pantalla "Herramientas del equipo": cuántas muestras llegaron y hace cuánto la última.
 * Sirve para comprobar en un celular real que con la pantalla apagada los sensores no se detienen.
 * `null` si no está el módulo nativo (Expo Go o la web).
 */
export function diagnosticoSensores(): DiagnosticoSensores | null {
  if (!SensoresFondo) return null;
  try {
    return SensoresFondo.diagnostico();
  } catch {
    return null;
  }
}

/**
 * Convierte el reloj de expo-sensors (segundos desde que prendió el celular) al reloj de época Unix
 * que usa el GPS, para que el detector pueda compararlos.
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

/** Respaldo con expo-sensors: da la aceleración en g (la pasamos a m/s²) y el giro en rad/s. */
async function escucharConExpoSensors(alRecibir: (m: MuestraImu) => void): Promise<Suscripcion> {
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
    segundoPlano: false,
    detener: () => {
      subAcc.remove();
      subGiro?.remove();
    },
  };
}
