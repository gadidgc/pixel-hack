import type { LecturaGps } from '@pixel-hack/detector';
import * as Location from 'expo-location';
import type { PermisosUbicacion } from './ubicacion';

/**
 * Web (la URL pública): el navegador no permite ubicación en segundo plano.
 * La protección solo funciona con la página abierta y la pantalla prendida.
 */
export type { PermisosUbicacion };

export function aLectura(pos: Location.LocationObject): LecturaGps {
  const ahora = Date.now();
  const { latitude, longitude, speed, accuracy } = pos.coords;
  return {
    t: Math.abs(ahora - pos.timestamp) <= 3000 ? pos.timestamp : ahora,
    lat: latitude,
    lon: longitude,
    velocidad: speed !== null && speed >= 0 ? speed : null,
    precision: accuracy ?? null,
  };
}

export async function pedirPermisosUbicacion(): Promise<PermisosUbicacion> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  return { primerPlano: granted, segundoPlano: false };
}

export async function escucharUbicacion(alRecibir: (l: LecturaGps) => void): Promise<() => Promise<void>> {
  const sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
    (pos) => alRecibir(aLectura(pos)),
  );
  return async () => sub.remove();
}
