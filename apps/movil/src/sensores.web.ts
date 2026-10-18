import type { MuestraImu } from '@pixel-hack/detector';
import type { Suscripcion } from './sensores';

/**
 * Versión web (la URL pública). NO usamos expo-sensors aquí: en la web su `Accelerometer`
 * entrega ángulos de orientación (evento `deviceorientation`) y su `Gyroscope` entrega la
 * aceleración, no el giro (revisado en expo-sensors 58). Leemos el evento `devicemotion` directo:
 * - `accelerationIncludingGravity`: m/s² con gravedad (lo que espera el detector).
 * - `rotationRate`: grados/s alrededor de z (alpha), x (beta) e y (gamma) → lo pasamos a rad/s.
 * Requiere HTTPS y, en iPhone, pedir permiso al tocar un botón.
 */
export { INTERVALO_SENSORES_MS } from './sensores.constantes';

const GRADOS_A_RAD = Math.PI / 180;

type ConPermiso = { requestPermission?: () => Promise<'granted' | 'denied'> };

export async function pedirPermisoSensores(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') return false;
  const pedir = (DeviceMotionEvent as unknown as ConPermiso).requestPermission;
  if (!pedir) return true; // Android y escritorio no piden permiso
  try {
    return (await pedir()) === 'granted';
  } catch {
    return false;
  }
}

export async function escucharSensores(alRecibir: (m: MuestraImu) => void): Promise<Suscripcion> {
  if (typeof window === 'undefined' || typeof DeviceMotionEvent === 'undefined') {
    throw new Error('Este navegador no da acceso a los sensores de movimiento.');
  }
  let tieneGiroscopio = false;
  let llegoAlgo = false;
  // El reloj del evento empieza al cargar la página; lo pasamos a época Unix.
  const desfase = Date.now() - performance.now();

  const alMoverse = (ev: DeviceMotionEvent) => {
    const a = ev.accelerationIncludingGravity;
    if (!a || a.x === null || a.y === null || a.z === null) return;
    llegoAlgo = true;
    const r = ev.rotationRate;
    const hayGiro = !!r && r.alpha !== null && r.beta !== null && r.gamma !== null;
    if (hayGiro) tieneGiroscopio = true;
    alRecibir({
      t: ev.timeStamp + desfase,
      ax: a.x,
      ay: a.y,
      az: a.z,
      gx: hayGiro ? r!.beta! * GRADOS_A_RAD : null,
      gy: hayGiro ? r!.gamma! * GRADOS_A_RAD : null,
      gz: hayGiro ? r!.alpha! * GRADOS_A_RAD : null,
    });
  };
  window.addEventListener('devicemotion', alMoverse);

  // En una laptop el evento existe pero nunca llega: avisamos en vez de quedarnos mudos.
  await new Promise((resolver) => setTimeout(resolver, 1000));
  if (!llegoAlgo) {
    window.removeEventListener('devicemotion', alMoverse);
    throw new Error('No llegan datos de movimiento: abre la app en un celular (con HTTPS). En la laptop usa "Simular".');
  }
  return {
    tieneGiroscopio,
    // El navegador detiene los sensores con la pestaña en segundo plano.
    segundoPlano: false,
    detener: () => window.removeEventListener('devicemotion', alMoverse),
  };
}
