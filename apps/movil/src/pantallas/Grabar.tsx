import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subirEvidencia } from '../evidencias';
import { marcarGrabacion } from '../grabacionEvidencia';
import { servicio } from '../servicio';
import { BarraPestanas, Boton, Chip, Parpadeo, T, hora, type Pestana } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { RADIO, useTema } from '../ui/tema';

type Modo = 'video' | 'audio';

/** `preparando` y `deteniendo` bloquean el botón: así un doble toque no arranca dos grabaciones. */
type Fase = 'lista' | 'preparando' | 'grabando' | 'deteniendo';

type Subida = { estado: 'subiendo'; avance: number } | { estado: 'subida'; enlace: string; conAlerta: boolean } | { estado: 'local'; motivo: string };

interface Evidencia {
  uri: string;
  mime: string;
  modo: Modo;
  t: number;
  duracionS: number;
  subida: Subida;
}

/** Cuántas filas caben abajo (las demás con scroll). El espacio está reservado para que el botón no se mueva. */
const FILAS_VISIBLES = 2;
const ALTO_FILA = 52;

/** Cuánto esperamos a que la cámara esté lista después de dar el permiso. */
const ESPERA_CAMARA_MS = 4000;

/** Si al detener el video la cámara no responde en este tiempo, liberamos el botón y lo decimos. */
const ESPERA_GUARDAR_MS = 5000;

/** iOS graba video en .mov (QuickTime); Android en .mp4. El audio es .m4a (AAC en MP4). */
function tipoDe(uri: string, m: Modo): { extension: string; mime: string } {
  if (m === 'audio') return { extension: 'm4a', mime: 'audio/mp4' };
  return /\.mov$/i.test(uri) ? { extension: 'mov', mime: 'video/quicktime' } : { extension: 'mp4', mime: 'video/mp4' };
}

/** Los errores de expo-camera y expo-audio llegan en inglés y en jerga: aquí los decimos en simple. */
function mensajeDeError(e: unknown, m: Modo): string {
  const texto = e instanceof Error ? e.message : String(e);
  if (/simulator/i.test(texto)) return m === 'video' ? 'El simulador no tiene cámara. Prueba "Solo audio" o usa un celular de verdad.' : 'El simulador no puede grabar audio.';
  if (/not ready|no está lista/i.test(texto)) return 'La cámara todavía no está lista. Toca el botón otra vez.';
  if (/permission|permiso/i.test(texto)) return m === 'video' ? 'Falta el permiso de cámara o micrófono. Actívalo en Ajustes.' : 'Falta el permiso de micrófono. Actívalo en Ajustes.';
  if (/in use|busy|interrupt/i.test(texto)) return 'Otra app está usando la cámara o el micrófono. Ciérrala e intenta otra vez.';
  return 'No se pudo grabar. Intenta otra vez.';
}

/**
 * F7 · Grabar evidencia (video o solo audio). Se guarda en el celular y además se sube al servidor
 * (R2): si tienes una alerta abierta, tu red la ve en la página de la alerta. Si la subida falla, la
 * copia del celular queda y la pantalla dice por qué. "Graba solo si es seguro para ti."
 *
 * La pantalla queda montada aunque cambies de pestaña (`visible` en falso): el audio sigue grabando con
 * el celular en el bolsillo y la lista de grabaciones no se pierde. El video se detiene y se guarda
 * cuando TÚ cambias de pestaña (`enPestana` en falso); si una alerta tapa la pantalla, sigue grabando.
 */
export function Grabar({ visible, enPestana, onPestana }: { visible: boolean; enPestana: boolean; onPestana: (p: Pestana) => void }) {
  const c = useTema();
  const ins = useSafeAreaInsets();
  const [modo, setModo] = useState<Modo>('video');
  const [fase, setFase] = useState<Fase>('lista');
  const [segundos, setSegundos] = useState(0);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [error, setError] = useState('');
  const [permCamara, pedirCamara] = useCameraPermissions();
  const [permMic, pedirMic] = useMicrophonePermissions();
  const camara = useRef<CameraView>(null);
  const camaraLista = useRef(false);
  const alEstarLista = useRef<(() => void) | null>(null);
  const grabadora = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const inicio = useRef(0);
  /** En falso mientras recordAsync no termina: para saber si la cámara respondió al detener. */
  const videoTerminado = useRef(true);
  const ocupada = fase !== 'lista';

  // Oculta no se refresca el contador: al volver se calcula desde `inicio`.
  useEffect(() => {
    if (fase !== 'grabando' || !visible) return;
    setSegundos(Math.round((Date.now() - inicio.current) / 1000));
    const t = setInterval(() => setSegundos(Math.round((Date.now() - inicio.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [fase, visible]);

  // Si la pantalla se desmonta, la pestaña no puede quedarse diciendo "Grabando".
  useEffect(() => () => marcarGrabacion(null), []);

  const web = Platform.OS === 'web';
  const pos = servicio.ultimaPosicion();
  // La cámara solo se monta con permiso y en pantalla: sin permiso se ve negra y fuera de pantalla gasta batería.
  // Grabando video sigue montada aunque salgas, hasta que termine de guardar.
  const mostrarCamara = !web && (visible || fase !== 'lista') && modo === 'video' && Boolean(permCamara?.granted);

  useEffect(() => {
    if (!mostrarCamara) camaraLista.current = false;
  }, [mostrarCamara]);

  const cambiarSubida = (uri: string, subida: Subida) => setEvidencias((lista) => lista.map((e) => (e.uri === uri ? { ...e, subida } : e)));

  /** Sube una evidencia y va mostrando el avance. La copia local no se toca. */
  const subir = useCallback(async (uri: string, mime: string) => {
    cambiarSubida(uri, { estado: 'subiendo', avance: 0 });
    const p = servicio.ultimaPosicion();
    const r = await subirEvidencia(uri, mime, p ? { lat: p.lat, lon: p.lon } : null, (avance) => cambiarSubida(uri, { estado: 'subiendo', avance }));
    cambiarSubida(uri, r.ok ? { estado: 'subida', enlace: r.enlace, conAlerta: r.conAlerta } : { estado: 'local', motivo: r.motivo });
  }, []);

  /** Mueve el archivo a la carpeta de documentos de la app (la caché se borra sola) y lo sube. */
  const guardar = (uri: string, m: Modo, duracionS: number) => {
    const { extension, mime } = tipoDe(uri, m);
    let final = uri;
    try {
      const origen = new File(uri);
      const destino = new File(Paths.document, `evidencia-${Date.now()}.${extension}`);
      origen.move(destino);
      final = destino.uri;
    } catch {
      // Si no se pudo mover, queda en la caché: igual se puede compartir.
    }
    setEvidencias((e) => [{ uri: final, mime, modo: m, t: Date.now(), duracionS, subida: { estado: 'subiendo', avance: 0 } }, ...e]);
    void subir(final, mime);
  };

  /** Espera el aviso de la cámara (onCameraReady). Grabar antes de eso falla en iPhone. */
  const esperarCamara = () =>
    new Promise<void>((resolver, rechazar) => {
      if (camaraLista.current) return resolver();
      const plazo = setTimeout(() => {
        alEstarLista.current = null;
        rechazar(new Error('La cámara no está lista'));
      }, ESPERA_CAMARA_MS);
      alEstarLista.current = () => {
        clearTimeout(plazo);
        alEstarLista.current = null;
        resolver();
      };
    });

  const empezar = async () => {
    if (ocupada) return;
    setError('');
    setFase('preparando');
    try {
      if (modo === 'video') {
        if (!permCamara?.granted && !(await pedirCamara()).granted) {
          setFase('lista');
          return setError('Sin permiso de cámara. Actívalo en Ajustes o usa "Solo audio".');
        }
        if (!permMic?.granted && !(await pedirMic()).granted) {
          setFase('lista');
          return setError('Sin permiso de micrófono. Actívalo en Ajustes.');
        }
        await esperarCamara();
        if (!camara.current) throw new Error('La cámara no está lista');
        inicio.current = Date.now();
        setSegundos(0);
        setFase('grabando');
        marcarGrabacion({ modo: 'video', desde: inicio.current });
        videoTerminado.current = false;
        const r = await camara.current.recordAsync({ maxDuration: 600 });
        videoTerminado.current = true;
        marcarGrabacion(null);
        setFase('lista');
        if (r?.uri) guardar(r.uri, 'video', Math.round((Date.now() - inicio.current) / 1000));
        else setError('El video no se guardó (quizá fue muy corto). Graba otra vez.');
      } else {
        const p = await AudioModule.requestRecordingPermissionsAsync();
        if (!p.granted) {
          setFase('lista');
          return setError('Sin permiso de micrófono. Actívalo en Ajustes.');
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await grabadora.prepareToRecordAsync();
        grabadora.record();
        inicio.current = Date.now();
        setSegundos(0);
        setFase('grabando');
        marcarGrabacion({ modo: 'audio', desde: inicio.current });
      }
    } catch (e) {
      videoTerminado.current = true;
      marcarGrabacion(null);
      setFase('lista');
      setError(mensajeDeError(e, modo));
    }
  };

  const detener = async () => {
    if (fase !== 'grabando') return;
    setFase('deteniendo');
    try {
      if (modo === 'video') {
        // recordAsync (en empezar) termina, guarda el archivo y vuelve a 'lista'.
        if (!camara.current) throw new Error('La cámara no está lista');
        camara.current.stopRecording();
        setTimeout(() => {
          if (videoTerminado.current) return;
          videoTerminado.current = true;
          marcarGrabacion(null);
          setFase('lista');
          setError('La cámara no respondió y el video pudo no guardarse. Graba otra vez.');
        }, ESPERA_GUARDAR_MS);
      } else {
        await grabadora.stop();
        marcarGrabacion(null);
        setFase('lista');
        if (grabadora.uri) guardar(grabadora.uri, 'audio', Math.round((Date.now() - inicio.current) / 1000));
      }
    } catch (e) {
      marcarGrabacion(null);
      setFase('lista');
      setError(mensajeDeError(e, modo));
    }
  };

  // Al cambiar TÚ de pestaña grabando video: se detiene y se guarda (el audio sigue). Una alerta no lo corta.
  const detenerRef = useRef(detener);
  detenerRef.current = detener;
  useEffect(() => {
    if (!enPestana && modo === 'video' && fase === 'grabando') void detenerRef.current();
  }, [enPestana, modo, fase]);

  const cambiarModo = (m: Modo) => {
    if (ocupada) return;
    setModo(m);
    setError('');
  };

  const mmss = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;
  const etiquetaBoton = fase === 'grabando' ? 'Detener grabación' : fase === 'preparando' ? 'Preparando la grabación' : fase === 'deteniendo' ? 'Guardando la grabación' : 'Empezar a grabar';

  return (
    <View style={{ flex: 1, backgroundColor: '#05080e' }}>
      <View style={{ flex: 1 }}>
        {web ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Image source={require('../../assets/fotos/calle-moto.jpg')} style={{ position: 'absolute', width: '100%', height: '100%', opacity: 0.35 }} resizeMode="cover" />
            <T v="cuerpo15" suave style={{ textAlign: 'center', maxWidth: 300 }}>
              Grabar evidencia funciona en la app de iPhone y Android, no en la web.
            </T>
          </View>
        ) : mostrarCamara ? (
          <CameraView
            ref={camara}
            style={{ flex: 1 }}
            mode="video"
            facing="back"
            onCameraReady={() => {
              camaraLista.current = true;
              alEstarLista.current?.();
            }}
          />
        ) : modo === 'video' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
            <Icono nombre="grabar" tam={64} color={c.textoSuave} grosor={1.6} />
            <T v="cuerpo15" suave style={{ textAlign: 'center', maxWidth: 260 }}>
              Al tocar el botón rojo te pediremos la cámara y el micrófono.
            </T>
          </View>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
            <Icono nombre="microfono" tam={64} color={fase === 'grabando' ? c.texto : c.textoSuave} grosor={1.6} />
            <T v="cuerpo15" suave style={{ textAlign: 'center', maxWidth: 260 }}>
              Solo audio: puedes guardar el celular en el bolsillo o ir a otra pestaña mientras graba.
            </T>
          </View>
        )}

        <View style={{ position: 'absolute', left: 16, right: 16, top: ins.top + 8, gap: 8 }}>
          <View style={{ minHeight: 40, borderRadius: 99, backgroundColor: 'rgba(8,7,6,0.7)', alignItems: 'center', justifyContent: 'center' }}>
            <T v="apoyo13" suave>
              Graba solo si es seguro para ti
            </T>
          </View>
          {!!error && (
            <View accessibilityLiveRegion="polite" style={{ padding: 14, borderRadius: RADIO.s, backgroundColor: c.avisoFondo }}>
              <T v="apoyo" color={c.aviso}>
                {error}
              </T>
            </View>
          )}
        </View>

        {fase === 'grabando' && (
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 99, backgroundColor: 'rgba(8,7,6,0.78)', borderTopWidth: 1, borderTopColor: c.brillo }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Parpadeo color={c.alerta} tam={8} />
              <T v="dato">{mmss}</T>
            </View>
            <T v="hora" suave>
              {hora(Date.now())}
              {pos?.precision != null ? ` · ±${Math.round(pos.precision)} m` : ''}
            </T>
          </View>
        )}
      </View>

      <View style={{ backgroundColor: c.fondo, borderTopWidth: 1, borderTopColor: c.linea, paddingTop: 18, paddingHorizontal: 16, alignItems: 'center', gap: 14 }}>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 99, backgroundColor: c.superficie, borderTopWidth: 1, borderTopColor: c.brillo, opacity: ocupada ? 0.5 : 1 }}>
          <Chip texto="Video" activo={modo === 'video'} onPress={() => cambiarModo('video')} />
          <Chip texto="Solo audio" activo={modo === 'audio'} onPress={() => cambiarModo('audio')} />
        </View>
        <Pressable
          onPress={fase === 'grabando' ? detener : empezar}
          disabled={web || fase === 'preparando' || fase === 'deteniendo'}
          accessibilityRole="button"
          accessibilityLabel={etiquetaBoton}
          accessibilityState={{ busy: fase === 'preparando' || fase === 'deteniendo' }}
          style={({ pressed }) => ({ width: 84, height: 84, borderRadius: 99, borderWidth: 3, borderColor: c.texto, alignItems: 'center', justifyContent: 'center', opacity: web ? 0.4 : pressed ? 0.7 : 1 })}
        >
          {fase === 'grabando' ? (
            <View style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: c.texto }} />
          ) : fase === 'lista' ? (
            <View style={{ width: 64, height: 64, borderRadius: 99, backgroundColor: c.alerta }} />
          ) : (
            <ActivityIndicator color={c.texto} />
          )}
        </Pressable>
        <T v="apoyo13" suave style={{ textAlign: 'center' }}>
          {fase === 'preparando' ? 'Preparando…' : fase === 'deteniendo' ? 'Guardando…' : 'Se guarda en tu celular y se sube a un enlace privado. Si tienes una alerta abierta, tu red lo ve.'}
        </T>
        <ScrollView style={{ alignSelf: 'stretch', height: FILAS_VISIBLES * ALTO_FILA, flexGrow: 0 }} contentContainerStyle={{ flexGrow: 1, justifyContent: evidencias.length ? 'flex-start' : 'center' }}>
          {evidencias.length === 0 && (
            <T v="apoyo13" suave style={{ textAlign: 'center' }}>
              Tus grabaciones aparecerán aquí.
            </T>
          )}
          {evidencias.map((e) => (
            <View key={e.uri} style={{ height: ALTO_FILA, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Icono nombre={e.modo === 'video' ? 'grabar' : 'microfono'} tam={18} color={c.textoSuave} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="apoyo" numberOfLines={1}>
                  {e.modo === 'video' ? 'Video' : 'Audio'} de las {hora(e.t)} · {e.duracionS} s
                </T>
                {e.subida.estado === 'subiendo' && (
                  <T v="apoyo13" suave>
                    Subiendo… {Math.round(e.subida.avance * 100)}%
                  </T>
                )}
                {e.subida.estado === 'subida' && (
                  <T v="apoyo13" color={c.protegido}>
                    {e.subida.conAlerta ? 'Subida: tu red la ve en la alerta' : 'Subida'}
                  </T>
                )}
                {e.subida.estado === 'local' && (
                  <Pressable onPress={() => void subir(e.uri, e.mime)} accessibilityRole="button" accessibilityLabel="Reintentar la subida">
                    <T v="apoyo13" color={c.aviso} numberOfLines={1}>
                      Solo en tu celular ({e.subida.motivo}). Tocar para reintentar.
                    </T>
                  </Pressable>
                )}
              </View>
              <Boton texto="Compartir" variante="secundario" principal={false} icono="compartir" onPress={() => void Sharing.shareAsync(e.uri, { mimeType: e.mime })} />
            </View>
          ))}
        </ScrollView>
        <View style={{ alignSelf: 'stretch', marginHorizontal: -16 }}>
          <BarraPestanas actual="grabar" onCambiar={onPestana} />
        </View>
      </View>
    </View>
  );
}
