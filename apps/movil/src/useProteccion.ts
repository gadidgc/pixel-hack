import { useSyncExternalStore } from 'react';
import { servicio, type EstadoProteccion } from './servicio';

export { describirEvento, ESPERA_FAMILIA_S, type EstadoProteccion, type Registro } from './servicio';

/** La pantalla solo observa el servicio de protección (que vive fuera de React; ver servicio.ts). */
export function useProteccion(): { estado: EstadoProteccion; servicio: typeof servicio } {
  const estado = useSyncExternalStore(
    (cambio) => servicio.suscribir(cambio),
    () => servicio.obtener(),
  );
  return { estado, servicio };
}
