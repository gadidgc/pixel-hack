import { File, UploadTask } from 'expo-file-system';
import { hayBackend, idDispositivo, urlBackend } from './alertas';
import { MAX_BYTES, cabecerasEvidencia, leerRespuesta, type DatosGrabacion, type ResultadoSubida } from './evidencias.comun';

/**
 * Sube una evidencia (video o audio) al backend (`POST /api/evidencias`, guardada en R2). Si va con
 * ubicación, el servidor la publica en "Cerca de ti". De un video sacamos además un cuadro (miniatura)
 * para la tarjeta del mapa.
 * La copia del celular NO se borra: si la subida falla, sigue ahí para compartirla a mano.
 * La web usa evidencias.web.ts.
 */
export type { DatosGrabacion, ResultadoSubida };

export async function subirEvidencia(
  uri: string,
  mime: string,
  pos: { lat: number; lon: number } | null,
  alAvanzar?: (fraccion: number) => void,
  datos: DatosGrabacion = {},
): Promise<ResultadoSubida> {
  if (!hayBackend()) return { ok: false, motivo: 'la app no está conectada al servidor' };
  try {
    const archivo = new File(uri);
    if (!archivo.exists) return { ok: false, motivo: 'no se encontró el archivo' };
    if (archivo.size > MAX_BYTES) return { ok: false, motivo: 'pasa de 50 MB (graba algo más corto)' };
    const tarea = new UploadTask(archivo, `${urlBackend()}/api/evidencias`, {
      httpMethod: 'POST',
      headers: cabecerasEvidencia(mime, pos, datos),
      mimeType: mime,
      // iOS: que siga subiendo aunque la app pase a segundo plano.
      sessionType: 'background',
      onProgress: (p) => {
        if (p.totalBytes > 0) alAvanzar?.(p.bytesSent / p.totalBytes);
      },
    });
    let resultado: ResultadoSubida;
    try {
      const r = await tarea.uploadAsync();
      resultado = leerRespuesta(r.status, r.body);
    } finally {
      tarea.release();
    }
    if (resultado.ok && mime.startsWith('video/')) await subirMiniatura(resultado.id, uri);
    return resultado;
  } catch (e) {
    return { ok: false, motivo: e instanceof Error ? e.message : 'sin conexión' };
  }
}

/** El servidor acepta miniaturas de hasta 512 KB. */
const MAX_MINIATURA_BYTES = 512 * 1024;

/**
 * Saca un cuadro del video (a los 0,5 s) y lo sube como miniatura. Si falla, la tarjeta del mapa sale
 * sin foto: no es motivo para decir que la grabación no se subió.
 */
async function subirMiniatura(id: string, uriVideo: string): Promise<void> {
  try {
    // Import diferido: en una app compilada antes de agregar expo-video-thumbnails, el módulo nativo no existe.
    const { getThumbnailAsync } = await import('expo-video-thumbnails');
    const { uri } = await getThumbnailAsync(uriVideo, { time: 500, quality: 0.5 });
    const imagen = new File(uri);
    try {
      if (!imagen.exists || imagen.size > MAX_MINIATURA_BYTES) return;
      const tarea = new UploadTask(imagen, `${urlBackend()}/api/evidencias/${id}/miniatura`, {
        httpMethod: 'POST',
        headers: { 'Content-Type': 'image/jpeg', 'X-Dispositivo': idDispositivo() },
        mimeType: 'image/jpeg',
      });
      try {
        await tarea.uploadAsync();
      } finally {
        tarea.release();
      }
    } finally {
      if (imagen.exists) imagen.delete();
    }
  } catch (e) {
    console.warn('No se pudo subir la miniatura', e);
  }
}
