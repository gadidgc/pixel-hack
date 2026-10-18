import { useEffect, useState, useSyncExternalStore } from 'react';
import { cargarPreferencias, preferencias, suscribirPreferencias, type Preferencias } from './preferencias';
import { servicio, type EstadoProteccion } from './servicio';

export { describirEvento, type EstadoProteccion, type Registro } from './servicio';

/** La pantalla solo observa el servicio de protección (que vive fuera de React; ver servicio.ts). */
export function useProteccion(): { estado: EstadoProteccion; servicio: typeof servicio } {
  const estado = useSyncExternalStore(
    (cambio) => servicio.suscribir(cambio),
    () => servicio.obtener(),
  );
  return { estado, servicio };
}

/** Preferencias guardadas (nombre, red, espera). `null` mientras se cargan. */
export function usePreferencias(): Preferencias | null {
  const [p, setP] = useState<Preferencias | null>(null);
  useEffect(() => {
    void cargarPreferencias().then(setP);
    return suscribirPreferencias(setP);
  }, []);
  return p ?? null;
}

export { preferencias };
