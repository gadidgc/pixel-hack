import { useState } from 'react';
import { Image, Pressable, ScrollView, View, type ImageSourcePropType } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { BarraPestanas, Chip, Hoja, Insignia, Onda, T, type Pestana } from '../ui/componentes';
import { Icono, type NombreIcono } from '../ui/iconos';
import { MapaFondo, useEscalaX } from '../ui/mapa';
import { RADIO, TIPO, useTema } from '../ui/tema';

type Tipo = 'arrebato' | 'aviso' | 'robo';

interface Incidente {
  id: string;
  tipo: Tipo;
  x: number;
  y: number;
  reciente: boolean;
  titulo: string;
  hora: string;
  lugar: string;
  distancia: string;
  imagen: ImageSourcePropType;
  media: string;
  fuente: string;
}

/**
 * DATOS DE EJEMPLO (las fotos son escenas generadas con Nano Banana para el diseño). Todavía no hay un
 * backend que junte los avisos de la comunidad: la pantalla lo dice con una insignia.
 */
const EJEMPLOS: Incidente[] = [
  { id: 'a1', tipo: 'arrebato', x: 250, y: 232, reciente: true, titulo: 'Arrebato desde moto', hora: '19:42', lugar: 'Av. Arequipa y Schell', distancia: '350 m', imagen: require('../../assets/fotos/av-arequipa.jpg'), media: '2 videos', fuente: 'Detectado por la app' },
  { id: 'a2', tipo: 'aviso', x: 92, y: 196, reciente: true, titulo: 'Moto con dos personas dando vueltas', hora: '19:05', lugar: 'Calle Berlín', distancia: '500 m', imagen: require('../../assets/fotos/calle-moto.jpg'), media: '1 foto', fuente: 'Aviso de un vecino' },
  { id: 'a3', tipo: 'arrebato', x: 304, y: 384, reciente: false, titulo: 'Intento de arrebato en paradero', hora: '18:15', lugar: 'Av. Benavides', distancia: '800 m', imagen: require('../../assets/fotos/paradero.jpg'), media: '1 audio', fuente: 'Reportado por una vecina' },
  { id: 'a4', tipo: 'robo', x: 52, y: 372, reciente: false, titulo: 'Robo de celular en la esquina', hora: 'ayer', lugar: 'Parque Kennedy', distancia: '1 km', imagen: require('../../assets/fotos/parque-kennedy.jpg'), media: '1 video', fuente: 'Reportado por un vecino' },
];

const ICONO: Record<Tipo, NombreIcono> = { arrebato: 'arrebato', aviso: 'ojo', robo: 'bolso' };

/** F8 · Cerca de ti: mapa primero, pines por tipo y un carrusel de tarjetas con foto. */
export function Cerca({ onPestana }: { onPestana: (p: Pestana) => void }) {
  const c = useTema();
  const ex = useEscalaX();
  const [filtro, setFiltro] = useState<'todo' | Tipo>('todo');
  const [elegido, setElegido] = useState('a1');

  const colores: Record<Tipo, { fondo: string; texto: string; halo: string; insignia: 'alerta' | 'aviso' | 'neutra'; nombre: string }> = {
    arrebato: { fondo: c.alerta, texto: c.sobreAlerta, halo: 'rgba(255,122,102,0.45)', insignia: 'alerta', nombre: 'ARREBATO' },
    aviso: { fondo: c.aviso, texto: '#1f1300', halo: 'rgba(242,181,68,0.4)', insignia: 'aviso', nombre: 'AVISO' },
    robo: { fondo: '#5b6b80', texto: c.texto, halo: 'rgba(165,157,146,0.3)', insignia: 'neutra', nombre: 'ROBO' },
  };

  const visibles = EJEMPLOS.filter((i) => filtro === 'todo' || i.tipo === filtro);
  const ordenadas = [...visibles].sort((a, b) => (a.id === elegido ? -1 : b.id === elegido ? 1 : 0));

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <MapaFondo alto={520}>
        <Svg width={ex(390)} height={520} viewBox="0 0 390 520" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Circle cx={195} cy={300} r={150} fill="none" stroke={c.linea} strokeWidth={1} strokeDasharray="4 6" />
          <Path d="M262 244 L274 214 L300 190 L318 150 L326 112" fill="none" stroke={c.alerta} strokeWidth={3} strokeLinecap="round" strokeDasharray="2 8" />
        </Svg>
        <View style={{ position: 'absolute', left: ex(171), top: 276, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Onda tam={48} color="rgba(111,168,255,0.35)" duracionMs={3200} />
          <View style={{ width: 20, height: 20, borderRadius: 99, backgroundColor: c.info, borderWidth: 3, borderColor: c.fondo }} />
        </View>
        {visibles.map((i) => {
          const col = colores[i.tipo];
          const on = elegido === i.id;
          const lado = on ? 40 : 32;
          return (
            <Pressable
              key={i.id}
              onPress={() => setElegido(i.id)}
              accessibilityRole="button"
              accessibilityLabel={`${col.nombre.toLowerCase()}: ${i.titulo}, ${i.hora}`}
              style={{ position: 'absolute', left: ex(i.x) - 24, top: i.y - 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
            >
              {i.reciente && <Onda tam={40} color={col.halo} duracionMs={2200} />}
              <View style={{ width: lado, height: lado, borderRadius: 99, backgroundColor: col.fondo, borderWidth: 3, borderColor: on ? c.texto : c.fondo, alignItems: 'center', justifyContent: 'center' }}>
                <Icono nombre={ICONO[i.tipo]} tam={16} color={col.texto} grosor={2.4} />
              </View>
            </Pressable>
          );
        })}
      </MapaFondo>

      <View style={{ position: 'absolute', left: 16, right: 16, top: 52, gap: 10 }}>
        <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: 'rgba(23,21,19,0.94)', borderRadius: RADIO.m, borderTopWidth: 1, borderTopColor: c.brillo }}>
          <Icono nombre="ubicacion" tam={18} color={c.textoSuave} />
          <T v="cuerpo15Fuerte" style={{ flex: 1 }}>
            Cerca de ti
          </T>
          <T v="hora" suave>
            1 km · 24 h
          </T>
        </View>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 8 }}>
          {(
            [
              ['todo', 'Todo'],
              ['arrebato', 'Arrebatos'],
              ['aviso', 'Avisos'],
            ] as const
          ).map(([id, nombre]) => (
            <Chip key={id} texto={nombre} activo={filtro === id} onPress={() => setFiltro(id)} />
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }} />
      <Hoja style={{ height: 392 }}>
        <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: c.linea, alignSelf: 'center', marginTop: 10, marginBottom: 8 }} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <T v="subtitulo">{visibles.length === 1 ? '1 cosa cerca' : `${visibles.length} cosas cerca`}</T>
          <Insignia tipo="aviso" texto="DATOS DE EJEMPLO" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 14 }}>
          {ordenadas.map((i) => {
            const col = colores[i.tipo];
            const on = elegido === i.id;
            return (
              <Pressable
                key={i.id}
                onPress={() => setElegido(i.id)}
                accessibilityRole="button"
                style={{ width: 236, borderRadius: 20, overflow: 'hidden', backgroundColor: c.superficie2, borderWidth: 2, borderColor: on ? c.texto : 'transparent' }}
              >
                <View style={{ width: 236, height: 124 }}>
                  <Image source={i.imagen} style={{ width: 236, height: 124 }} resizeMode="cover" accessibilityIgnoresInvertColors />
                  <View style={{ position: 'absolute', left: 8, top: 8 }}>
                    <Insignia tipo={col.insignia} texto={i.reciente ? `${col.nombre} · AHORA` : col.nombre} />
                  </View>
                  <View style={{ position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(8,7,6,0.78)' }}>
                    <T v="hora" color="#f2ece3" style={[TIPO.hora, { fontSize: 11 }]}>
                      {i.media}
                    </T>
                  </View>
                </View>
                <View style={{ padding: 12, paddingTop: 10, gap: 3 }}>
                  <T v="cuerpo15Fuerte" numberOfLines={1}>
                    {i.titulo}
                  </T>
                  <T v="apoyo13" suave numberOfLines={1}>
                    {i.hora} · {i.lugar} · {i.distancia}
                  </T>
                  <T v="apoyo13" color={i.fuente.startsWith('Detectado') ? c.protegido : c.textoSuave}>
                    {i.fuente}
                  </T>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={{ flex: 1 }} />
        <BarraPestanas actual="cerca" onCambiar={onPestana} />
      </Hoja>
    </View>
  );
}
