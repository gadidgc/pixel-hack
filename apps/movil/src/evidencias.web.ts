import { hayBackend, urlBackend } from './alertas';
import { MAX_BYTES, cabecerasEvidencia, leerRespuesta, type ResultadoSubida } from './evidencias.comun';

/**
 * Web: el archivo es un `blob:` del navegador; lo leemos y lo mandamos con XMLHttpRequest
 * (fetch no informa el avance de una subida).
 */
export type { ResultadoSubida };
export { MAX_BYTES };

export async function subirEvidencia(
  uri: string,
  mime: string,
  pos: { lat: number; lon: number } | null,
  alAvanzar?: (fraccion: number) => void,
): Promise<ResultadoSubida> {
  if (!hayBackend()) return { ok: false, motivo: 'la app no está conectada al servidor' };
  try {
    const blob = await (await fetch(uri)).blob();
    if (blob.size > MAX_BYTES) return { ok: false, motivo: 'pasa de 50 MB (graba algo más corto)' };
    return await new Promise<ResultadoSubida>((listo) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${urlBackend()}/api/evidencias`);
      for (const [k, v] of Object.entries(cabecerasEvidencia(mime, pos))) xhr.setRequestHeader(k, v);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) alAvanzar?.(e.loaded / e.total);
      };
      xhr.onload = () => listo(leerRespuesta(xhr.status, xhr.responseText));
      xhr.onerror = () => listo({ ok: false, motivo: 'sin conexión con el servidor' });
      xhr.send(blob);
    });
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : 'no se pudo leer el archivo' };
  }
}
