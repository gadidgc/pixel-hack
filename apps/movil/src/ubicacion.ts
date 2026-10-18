import type { LecturaGps } from '@pixel-hack/detector';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

/**
 * GPS en segundo plano (iPhone y Android; la web usa ubicacion.web.ts).
 *
 * - Android: expo-location levanta un "servicio en primer plano" con una notificación fija. Eso mantiene
 *   vivo el proceso con la pantalla apagada (y con él, los sensores de modules/sensores-fondo).
 * - iPhone: modo de fondo "location" (UIBackgroundModes) con el indicador azul de ubicación. Mientras el GPS
 *   está encendido iOS no suspende la app, así que CoreMotion (modules/sensores-fondo) y JavaScript siguen
 *   corriendo con la pantalla apagada. Las opciones de abajo evitan que iOS pause el GPS si estás quieta.
 * - Si la persona cierra la app a mano (deslizándola en el selector de apps), iOS y Android detienen todo.
 *
 * Requiere el permiso de ubicación "Permitir siempre". Sin él no activamos la protección.
 */
export const TAREA_UBICACION = 'alerta-arrebato-ubicacion';

let receptor: ((l: LecturaGps) => void) | null = null;

/**
 * El detector compara el tiempo del GPS con el de los sensores (reloj del sistema). Si la hora de la
 * lectura está lejos de la hora actual (reloj mal configurado o lecturas atrasadas), usamos la hora de llegada.
 */
export function aLectura(pos: Location.LocationObject): LecturaGps {
  const ahora = Date.now();
  const { latitude, longitude, speed, accuracy } = pos.coords;
  return {
    t: Math.abs(ahora - pos.timestamp) <= 3000 ? pos.timestamp : ahora,
    lat: latitude,
    lon: longitude,
    // iOS devuelve -1 cuando no sabe la velocidad.
    velocidad: speed !== null && speed >= 0 ? speed : null,
    precision: accuracy ?? null,
  };
}

// La tarea se define al cargar el archivo (index.ts lo importa antes que la app), como pide TaskManager.
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(TAREA_UBICACION, async ({ data, error }) => {
  if (error || !data) return;
  for (const pos of data.locations) receptor?.(aLectura(pos));
});

export interface PermisosUbicacion {
  primerPlano: boolean;
  segundoPlano: boolean;
}

/** Primero "mientras se usa la app"; luego "siempre" (iOS y Android exigen ese orden). */
export async function pedirPermisosUbicacion(): Promise<PermisosUbicacion> {
  const primer = await Location.requestForegroundPermissionsAsync();
  if (!primer.granted) return { primerPlano: false, segundoPlano: false };
  const segundo = await Location.requestBackgroundPermissionsAsync();
  return { primerPlano: true, segundoPlano: segundo.granted };
}

/** Solo mira los permisos, sin pedirlos (para saber si la persona ya eligió «Siempre» en Ajustes). */
export async function revisarPermisosUbicacion(): Promise<PermisosUbicacion> {
  const primer = await Location.getForegroundPermissionsAsync();
  if (!primer.granted) return { primerPlano: false, segundoPlano: false };
  const segundo = await Location.getBackgroundPermissionsAsync();
  return { primerPlano: true, segundoPlano: segundo.granted };
}

/**
 * `true` si el GPS en segundo plano quedó encendido de una sesión anterior (por ejemplo, el sistema cerró
 * la app y la volvió a abrir en segundo plano). En ese caso hay que reactivar la protección: si no, el GPS
 * sigue gastando batería y nadie escucha los sensores.
 */
export async function ubicacionSigueEncendida(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(TAREA_UBICACION);
  } catch {
    return false;
  }
}

export async function escucharUbicacion(alRecibir: (l: LecturaGps) => void): Promise<() => Promise<void>> {
  receptor = alRecibir;
  await Location.startLocationUpdatesAsync(TAREA_UBICACION, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 1000,
    distanceInterval: 0,
    // Sin lotes: cada lectura llega al momento también en segundo plano (la alerta no puede esperar).
    deferredUpdatesInterval: 0,
    deferredUpdatesDistance: 0,
    // iOS: que el sistema NO apague el GPS cuando cree que estás quieta (te pueden robar en un paradero).
    pausesUpdatesAutomatically: false,
    activityType: Location.ActivityType.Other,
    // iOS: el indicador azul. Apple lo espera en apps que usan la ubicación en segundo plano.
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      // F2 · Notificación fija (diseño "Notificación"): calma, sin datos técnicos.
      notificationTitle: 'Estás protegida',
      notificationBody: `Desde las ${new Date().toTimeString().slice(0, 5)}. Usa tu celular normal.`,
      notificationColor: '#8ee3c0',
      killServiceOnDestroy: false,
    },
  });
  return async () => {
    receptor = null;
    if (await Location.hasStartedLocationUpdatesAsync(TAREA_UBICACION)) {
      await Location.stopLocationUpdatesAsync(TAREA_UBICACION);
    }
  };
}
