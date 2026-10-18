import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { servicio } from '../servicio';
import { BarraPestanas, Boton, Chip, Parpadeo, T, hora, type Pestana } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { RADIO, useTema } from '../ui/tema';

type Modo = 'video' | 'audio';

interface Evidencia {
  uri: string;
  modo: Modo;
  t: number;
  duracionS: number;
}

/**
 * F7 · Grabar evidencia (video o solo audio). Se guarda en el celular y es privada hasta que la compartas.
 * "Graba solo si es seguro para ti." Todavía no hay backend: no se sube a ningún lado (la pantalla lo dice).
 */
export function Grabar({ onPestana }: { onPestana: (p: Pestana) => void }) {
  const c = useTema();
  const ins = useSafeAreaInsets();
  const [modo, setModo] = useState<Modo>('video');
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [error, setError] = useState('');
  const [permCamara, pedirCamara] = useCameraPermissions();
  const [permMic, pedirMic] = useMicrophonePermissions();
  const camara = useRef<CameraView>(null);
  const grabadora = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const inicio = useRef(0);

  useEffect(() => {
    if (!grabando) return;
    const t = setInterval(() => setSegundos(Math.round((Date.now() - inicio.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [grabando]);

  const web = Platform.OS === 'web';
  const pos = servicio.ultimaPosicion();

  /** Mueve el archivo a la carpeta de documentos de la app (la caché se borra sola). */
  const guardar = (uri: string, m: Modo, duracionS: number) => {
    let final = uri;
    try {
      const origen = new File(uri);
      const destino = new File(Paths.document, `evidencia-${Date.now()}.${m === 'video' ? 'mp4' : 'm4a'}`);
      origen.move(destino);
      final = destino.uri;
    } catch {
      // Si no se pudo mover, queda en la caché: igual se puede compartir.
    }
    setEvidencias((e) => [{ uri: final, modo: m, t: Date.now(), duracionS }, ...e]);
  };

  const empezar = async () => {
    setError('');
    try {
      if (modo === 'video') {
        if (!permCamara?.granted && !(await pedirCamara()).granted) return setError('Sin permiso de cámara.');
        if (!permMic?.granted && !(await pedirMic()).granted) return setError('Sin permiso de micrófono.');
        inicio.current = Date.now();
        setSegundos(0);
        setGrabando(true);
        const r = await camara.current?.recordAsync({ maxDuration: 600 });
        setGrabando(false);
        if (r?.uri) guardar(r.uri, 'video', Math.round((Date.now() - inicio.current) / 1000));
      } else {
        const p = await AudioModule.requestRecordingPermissionsAsync();
        if (!p.granted) return setError('Sin permiso de micrófono.');
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await grabadora.prepareToRecordAsync();
        grabadora.record();
        inicio.current = Date.now();
        setSegundos(0);
        setGrabando(true);
      }
    } catch (e) {
      setGrabando(false);
      setError(e instanceof Error ? e.message : 'No se pudo grabar.');
    }
  };

  const detener = async () => {
    try {
      if (modo === 'video') {
        camara.current?.stopRecording();
      } else {
        await grabadora.stop();
        setGrabando(false);
        if (grabadora.uri) guardar(grabadora.uri, 'audio', Math.round((Date.now() - inicio.current) / 1000));
      }
    } catch (e) {
      setGrabando(false);
      setError(e instanceof Error ? e.message : 'No se pudo detener.');
    }
  };

  const mmss = `${String(Math.floor(segundos / 60)).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}`;

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
        ) : modo === 'video' ? (
          <CameraView ref={camara} style={{ flex: 1 }} mode="video" facing="back" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
            <Icono nombre="microfono" tam={64} color={grabando ? c.texto : c.textoSuave} grosor={1.6} />
            <T v="cuerpo15" suave style={{ textAlign: 'center', maxWidth: 260 }}>
              Solo audio: puedes guardar el celular en el bolsillo mientras graba.
            </T>
          </View>
        )}

        <View style={{ position: 'absolute', left: 16, right: 16, top: ins.top + 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => onPestana('inicio')} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ width: 48, height: 48, borderRadius: 99, backgroundColor: 'rgba(8,7,6,0.7)', alignItems: 'center', justifyContent: 'center' }}>
            <Icono nombre="cerrar" color={c.texto} tam={20} />
          </Pressable>
          <View style={{ flex: 1, minHeight: 40, borderRadius: 99, backgroundColor: 'rgba(8,7,6,0.7)', alignItems: 'center', justifyContent: 'center' }}>
            <T v="apoyo13" suave>
              Graba solo si es seguro para ti
            </T>
          </View>
        </View>

        {grabando && (
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 99, backgroundColor: 'rgba(8,7,6,0.78)', borderTopWidth: 1, borderTopColor: c.brillo }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Parpadeo color={c.texto} tam={8} />
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
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 99, backgroundColor: c.superficie, borderTopWidth: 1, borderTopColor: c.brillo }}>
          <Chip texto="Video" activo={modo === 'video'} onPress={() => !grabando && setModo('video')} />
          <Chip texto="Solo audio" activo={modo === 'audio'} onPress={() => !grabando && setModo('audio')} />
        </View>
        <Pressable
          onPress={grabando ? detener : empezar}
          disabled={web}
          accessibilityRole="button"
          accessibilityLabel={grabando ? 'Detener grabación' : 'Empezar a grabar'}
          style={{ width: 84, height: 84, borderRadius: 99, borderWidth: 3, borderColor: c.texto, alignItems: 'center', justifyContent: 'center', opacity: web ? 0.4 : 1 }}
        >
          {grabando ? <View style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: c.texto }} /> : <View style={{ width: 64, height: 64, borderRadius: 99, backgroundColor: c.alerta }} />}
        </Pressable>
        {!!error && (
          <T v="apoyo" color={c.aviso}>
            {error}
          </T>
        )}
        <T v="apoyo13" suave style={{ textAlign: 'center' }}>
          Se guarda en tu celular. Es privado: solo tú lo ves hasta que lo compartas.
        </T>
        {evidencias.slice(0, 2).map((e) => (
          <View key={e.uri} style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icono nombre={e.modo === 'video' ? 'grabar' : 'microfono'} tam={18} color={c.textoSuave} />
            <T v="apoyo" style={{ flex: 1 }}>
              {e.modo === 'video' ? 'Video' : 'Audio'} de las {hora(e.t)} · {e.duracionS} s
            </T>
            <Boton texto="Compartir" variante="secundario" principal={false} icono="compartir" onPress={() => void Sharing.shareAsync(e.uri)} />
          </View>
        ))}
        <View style={{ alignSelf: 'stretch', marginHorizontal: -16 }}>
          <BarraPestanas actual="grabar" onCambiar={onPestana} />
        </View>
      </View>
      {!web && !permCamara?.granted && modo === 'video' && !grabando && (
        <View style={{ position: 'absolute', left: 16, right: 16, top: ins.top + 80, padding: 14, borderRadius: RADIO.s, backgroundColor: c.superficie }}>
          <T v="apoyo" suave>
            Al tocar el botón te pediremos la cámara y el micrófono.
          </T>
        </View>
      )}
    </View>
  );
}
