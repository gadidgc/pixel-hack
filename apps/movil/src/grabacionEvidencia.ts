import { useSyncExternalStore } from 'react';

/**
 * Si hay una grabación de evidencia en curso (video o audio). Vive fuera de la pantalla Grabar para que
 * la barra de pestañas muestre "Grabando" desde cualquier pantalla y sepas que sigue grabando.
 */
export type GrabacionEnCurso = { modo: 'video' | 'audio'; desde: number } | null;

let actual: GrabacionEnCurso = null;
const oyentes = new Set<() => void>();

export function marcarGrabacion(g: GrabacionEnCurso): void {
  actual = g;
  oyentes.forEach((o) => o());
}

function suscribir(o: () => void): () => void {
  oyentes.add(o);
  return () => oyentes.delete(o);
}

export function useGrabacionEnCurso(): GrabacionEnCurso {
  return useSyncExternalStore(suscribir, () => actual);
}
