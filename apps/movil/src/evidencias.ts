import { File, UploadTask } from 'expo-file-system';
import { hayBackend, urlBackend } from './alertas';
import { MAX_BYTES, cabecerasEvidencia, leerRespuesta, type ResultadoSubida } from './evidencias.comun';

/**
 * Sube una evidencia (video o audio) al backend (`POST /api/evidencias`, guardada en R2).
 * La copia del celular NO se borra: si la subida falla, sigue ahí para compartirla a mano.
 * La web usa evidencias.web.ts.
 */
export type { ResultadoSubida };

export async function subirEvidencia(
  uri: string,
  mime: string,
  pos: { lat: number; lon: number } | null,
  alAvanzar?: (fraccion: number) => void,
): Promise<ResultadoSubida> {
  if (!hayBackend()) return { ok: false, motivo: 'la app no está conectada al servidor' };
  try {
    const archivo = new File(uri);
    if (!archivo.exists) return { ok: false, motivo: 'no se encontró el archivo' };
    if (archivo.size > MAX_BYTES) return { ok: false, motivo: 'pasa de 50 MB (graba algo más corto)' };
    const tarea = new UploadTask(archivo, `${urlBackend()}/api/evidencias`, {
      httpMethod: 'POST',
      headers: cabecerasEvidencia(mime, pos),
      mimeType: mime,
      // iOS: que siga subiendo aunque la app pase a segundo plano.
      sessionType: 'background',
      onProgress: (p) => {
        if (p.totalBytes > 0) alAvanzar?.(p.bytesSent / p.totalBytes);
      },
    });
    try {
      const r = await tarea.uploadAsync();
      return leerRespuesta(r.status, r.body);
    } finally {
      tarea.release();
    }
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : 'sin conexión' };
  }
}
