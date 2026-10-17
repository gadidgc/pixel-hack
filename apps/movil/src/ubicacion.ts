import type { LecturaGps } from '@pixel-hack/detector';
import * as Location from 'expo-location';

export async function pedirPermisoUbicacion(): Promise<boolean> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return granted;
}

/**
 * GPS a 1 lectura por segundo con la mejor precisión.
 * Por ahora solo con la app abierta (ver docs/PLAN.md §5: segundo plano es la fase 2).
 */
export async function escucharUbicacion(alRecibir: (l: LecturaGps) => void): Promise<() => void> {
  const sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
    (pos) => {
      const { latitude, longitude, speed, accuracy } = pos.coords;
      alRecibir({
        t: pos.timestamp,
        lat: latitude,
        lon: longitude,
        // iOS devuelve -1 cuando no sabe la velocidad.
        velocidad: speed !== null && speed >= 0 ? speed : null,
        precision: accuracy ?? null,
      });
    },
  );
  return () => sub.remove();
}
