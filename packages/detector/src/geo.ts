const RADIO_TIERRA_M = 6_371_000;

function radianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

/** Distancia en metros entre dos puntos (fórmula del semiverseno / haversine). */
export function distanciaM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = radianes(lat2 - lat1);
  const dLon = radianes(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radianes(lat1)) * Math.cos(radianes(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Mueve un punto `esteM` metros al este y `norteM` al norte (válido para distancias cortas). */
export function desplazarLatLon(lat: number, lon: number, esteM: number, norteM: number): { lat: number; lon: number } {
  const dLat = norteM / RADIO_TIERRA_M;
  const dLon = esteM / (RADIO_TIERRA_M * Math.cos(radianes(lat)));
  return { lat: lat + (dLat * 180) / Math.PI, lon: lon + (dLon * 180) / Math.PI };
}
