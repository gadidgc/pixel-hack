import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { TIPOS, grabacionesDe, type Grabacion, type Reporte } from '../comunidad';
import { textoDuracion } from '../onda';
import { BarrasOnda } from '../ui/BarrasOnda';
import { Hoja, Insignia, T } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { RADIO, useTema } from '../ui/tema';

type Estado = { fase: 'cargando' } | { fase: 'error'; motivo: string } | { fase: 'listo'; grabaciones: Grabacion[] };

/**
 * Lo que se abre al tocar una tarjeta de "Cerca de ti": qué pasó, dónde, y sus grabaciones.
 * El audio suena aquí mismo; el video se abre en el reproductor del celular (así no hace falta un
 * módulo nativo nuevo en la app).
 */
export function DetalleReporte({
  reporte,
  insignia,
  cuando,
  lugar,
  fuente,
  colorFuente,
  onCerrar,
}: {
  reporte: Reporte | null;
  insignia: { tipo: 'alerta' | 'aviso' | 'neutra'; texto: string };
  cuando: string;
  lugar: string;
  fuente: string;
  colorFuente: string;
  onCerrar: () => void;
}) {
  const c = useTema();
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });
  const id = reporte?.id ?? null;
  const conGrabaciones = (reporte?.videos ?? 0) + (reporte?.audios ?? 0) > 0;

  useEffect(() => {
    if (!id) return;
    if (!conGrabaciones) return setEstado({ fase: 'listo', grabaciones: [] });
    let vigente = true;
    setEstado({ fase: 'cargando' });
    void grabacionesDe(id).then((r) => {
      if (vigente) setEstado(r.ok ? { fase: 'listo', grabaciones: r.datos } : { fase: 'error', motivo: r.motivo });
    });
    return () => {
      vigente = false;
    };
  }, [id, conGrabaciones]);

  return (
    <Modal visible={reporte !== null} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable onPress={onCerrar} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} accessibilityLabel="Cerrar" />
      {reporte && (
        <Hoja style={{ maxHeight: '80%', paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <View style={{ alignSelf: 'flex-start' }}>
                <Insignia tipo={insignia.tipo} texto={insignia.texto} />
              </View>
              <T v="titulo">{TIPOS[reporte.tipo].nombre}</T>
              <T v="hora" suave>
                {cuando} · {lugar}
              </T>
            </View>
            <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ width: 44, height: 44, borderRadius: RADIO.total, backgroundColor: c.superficie2, alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre="cerrar" tam={18} color={c.textoSuave} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 14 }}>
            {!!reporte.nota && <T v="cuerpo15">“{reporte.nota}”</T>}

            {estado.fase === 'cargando' && (
              <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={c.textoSuave} />
              </View>
            )}
            {estado.fase === 'error' && (
              <T v="apoyo" color={c.aviso}>
                No pudimos cargar las grabaciones: {estado.motivo}.
              </T>
            )}
            {estado.fase === 'listo' &&
              estado.grabaciones.map((g) => (g.tipo === 'video' ? <FilaVideo key={g.id} g={g} /> : <FilaAudio key={g.id} g={g} />))}
            {estado.fase === 'listo' && estado.grabaciones.length === 0 && (
              <T v="apoyo13" suave>
                Este reporte no tiene grabaciones.
              </T>
            )}

            <View style={{ height: 1, backgroundColor: c.linea }} />
            <View style={{ gap: 4 }}>
              <T v="apoyo13" color={colorFuente}>
                {fuente}
              </T>
              <T v="apoyo13" suave>
                Publicado sin nombre, con la ubicación aproximada (a unos 100 m).
              </T>
            </View>
          </ScrollView>
        </Hoja>
      )}
    </Modal>
  );
}

/** El cuadro del video con un botón de reproducir: abre el archivo en el reproductor del celular. */
function FilaVideo({ g }: { g: Grabacion }) {
  const c = useTema();
  const [error, setError] = useState('');
  const abrir = () => {
    setError('');
    Linking.openURL(g.enlace).catch(() => setError('No se pudo abrir el video en este celular.'));
  };
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={abrir} accessibilityRole="button" accessibilityLabel="Ver el video" style={{ height: 202, borderRadius: RADIO.s, overflow: 'hidden', backgroundColor: c.superficie2, alignItems: 'center', justifyContent: 'center' }}>
        {g.miniatura ? (
          <Image source={{ uri: g.miniatura }} accessibilityIgnoresInvertColors style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Icono nombre="video" tam={36} color={c.textoSuave} />
        )}
        <View style={{ width: 56, height: 56, borderRadius: RADIO.total, backgroundColor: 'rgba(242,236,227,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          <Icono nombre="reproducir" tam={22} color="#171513" grosor={2.4} />
        </View>
        {g.duracionMs !== null && (
          <View style={{ position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(8,7,6,0.82)' }}>
            <T v="hora" style={{ fontSize: 12, color: '#f2ece3' }}>
              {textoDuracion(g.duracionMs)}
            </T>
          </View>
        )}
      </Pressable>
      {!!error && (
        <T v="apoyo13" color={c.aviso}>
          {error}
        </T>
      )}
    </View>
  );
}

/** El audio suena aquí: botón de reproducir, la onda que se va llenando y cuánto dura. */
function FilaAudio({ g }: { g: Grabacion }) {
  const c = useTema();
  const reproductor = useAudioPlayer(g.enlace);
  const estado = useAudioPlayerStatus(reproductor);
  const sonando = estado.playing;
  const durS = estado.duration > 0 ? estado.duration : (g.duracionMs ?? 0) / 1000;
  const avance = durS > 0 ? estado.currentTime / durS : 0;

  const alternar = async () => {
    if (sonando) return reproductor.pause();
    // iPhone: que suene aunque el celular esté en silencio.
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
    if (estado.didJustFinish || (durS > 0 && estado.currentTime >= durS - 0.2)) await reproductor.seekTo(0);
    reproductor.play();
  };

  return (
    <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 6, paddingRight: 14, borderRadius: RADIO.total, backgroundColor: c.superficie2 }}>
      <Pressable
        onPress={() => void alternar()}
        accessibilityRole="button"
        accessibilityLabel={sonando ? 'Pausar el audio' : 'Escuchar el audio'}
        style={{ width: 44, height: 44, borderRadius: RADIO.total, backgroundColor: c.fondo, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icono nombre={sonando ? 'pausa' : 'reproducir'} tam={16} color={c.texto} grosor={2.4} />
      </Pressable>
      {g.onda ? (
        <BarrasOnda onda={g.onda} alto={28} color={c.textoSuave} colorAvance={c.alerta} avance={avance} style={{ flex: 1 }} />
      ) : (
        <View style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: c.linea }}>
          <View style={{ width: `${Math.min(100, avance * 100)}%`, height: 3, borderRadius: 99, backgroundColor: c.alerta }} />
        </View>
      )}
      <T v="hora" suave>
        {durS > 0 ? textoDuracion((sonando || avance > 0 ? estado.currentTime : durS) * 1000) : '–:––'}
      </T>
    </View>
  );
}
