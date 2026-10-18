import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import {
  MAX_NOTA,
  TIPOS,
  buscarReportes,
  distanciaM,
  posicionActual,
  reportar,
  textoCuando,
  textoDistancia,
  textoMedios,
  type Categoria,
  type Reporte,
  type TipoReporte,
} from '../comunidad';
import { BarraPestanas, Boton, Chip, Hoja, Insignia, Onda, T, type Pestana } from '../ui/componentes';
import { Icono, type NombreIcono } from '../ui/iconos';
import { MapaFondo, useEscalaX } from '../ui/mapa';
import { RADIO, TIPO, useTema } from '../ui/tema';

const RADIO_KM = 1;
/** En el dibujo (390 × 520) la persona está en (195, 300) y el círculo de 1 km mide 150 px de radio. */
const CENTRO = { x: 195, y: 300 };
const RADIO_PX = 150;
/** "AHORA": lo de las últimas 2 horas. */
const RECIENTE_MS = 2 * 3600_000;

const ICONO: Record<Categoria, NombreIcono> = { arrebato: 'arrebato', aviso: 'ojo', robo: 'bolso' };

type Estado =
  | { fase: 'cargando'; texto: string }
  | { fase: 'error'; motivo: string; dondeFallo: 'ubicacion' | 'servidor' }
  | { fase: 'listo'; reportes: Reporte[]; aqui: { lat: number; lon: number }; ahora: number };

/** Lleva un reporte al dibujo del mapa, relativo a la persona (norte arriba). Lo de fuera del círculo queda en el borde. */
function aMapa(r: Reporte, aqui: { lat: number; lon: number }): { x: number; y: number } {
  const este = (r.lon - aqui.lon) * 111.32 * Math.cos((aqui.lat * Math.PI) / 180);
  const norte = (r.lat - aqui.lat) * 110.574;
  let x = (este / RADIO_KM) * RADIO_PX;
  let y = -(norte / RADIO_KM) * RADIO_PX;
  const largo = Math.hypot(x, y);
  if (largo > RADIO_PX + 20) {
    x = (x / largo) * (RADIO_PX + 20);
    y = (y / largo) * (RADIO_PX + 20);
  }
  return { x: CENTRO.x + x, y: CENTRO.y + y };
}

/** F8 · Cerca de ti: mapa primero, pines por tipo y un carrusel de tarjetas. Datos reales del servidor. */
export function Cerca({ onPestana }: { onPestana: (p: Pestana) => void }) {
  const c = useTema();
  const ex = useEscalaX();
  const [filtro, setFiltro] = useState<'todo' | Categoria>('todo');
  const [elegido, setElegido] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando', texto: 'Buscando tu ubicación…' });
  const [reportando, setReportando] = useState(false);

  const cargar = useCallback(async () => {
    setEstado({ fase: 'cargando', texto: 'Buscando tu ubicación…' });
    const pos = await posicionActual();
    if (!pos.ok) return setEstado({ fase: 'error', motivo: pos.motivo, dondeFallo: 'ubicacion' });
    setEstado({ fase: 'cargando', texto: 'Cargando reportes de la zona…' });
    const aqui = { lat: pos.datos.lat, lon: pos.datos.lon };
    const r = await buscarReportes(aqui.lat, aqui.lon, RADIO_KM);
    if (!r.ok) return setEstado({ fase: 'error', motivo: r.motivo, dondeFallo: 'servidor' });
    // El servidor busca en una caja: aquí nos quedamos con el círculo de 1 km.
    const reportes = r.datos.filter((x) => distanciaM(aqui, x) <= RADIO_KM * 1000 + 150);
    setEstado({ fase: 'listo', reportes, aqui, ahora: Date.now() });
    setElegido(reportes[0]?.id ?? null);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const colores: Record<Categoria, { fondo: string; texto: string; halo: string; insignia: 'alerta' | 'aviso' | 'neutra'; nombre: string }> = {
    arrebato: { fondo: c.alerta, texto: c.sobreAlerta, halo: 'rgba(255,122,102,0.45)', insignia: 'alerta', nombre: 'ARREBATO' },
    aviso: { fondo: c.aviso, texto: '#1f1300', halo: 'rgba(242,181,68,0.4)', insignia: 'aviso', nombre: 'AVISO' },
    robo: { fondo: '#5b6b80', texto: c.texto, halo: 'rgba(165,157,146,0.3)', insignia: 'neutra', nombre: 'ROBO' },
  };

  const todos = estado.fase === 'listo' ? estado.reportes : [];
  const visibles = todos.filter((i) => filtro === 'todo' || TIPOS[i.tipo].categoria === filtro);
  const ordenadas = [...visibles].sort((a, b) => (a.id === elegido ? -1 : b.id === elegido ? 1 : 0));
  const aqui = estado.fase === 'listo' ? estado.aqui : null;
  const ahora = estado.fase === 'listo' ? estado.ahora : Date.now();

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <MapaFondo alto={520}>
        <Svg width={ex(390)} height={520} viewBox="0 0 390 520" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Circle cx={CENTRO.x} cy={CENTRO.y} r={RADIO_PX} fill="none" stroke={c.linea} strokeWidth={1} strokeDasharray="4 6" />
        </Svg>
        {aqui &&
          visibles.map((i) => {
            const cat = TIPOS[i.tipo].categoria;
            const col = colores[cat];
            const on = elegido === i.id;
            const lado = on ? 40 : 32;
            const p = aMapa(i, aqui);
            return (
              <Pressable
                key={i.id}
                onPress={() => setElegido(i.id)}
                accessibilityRole="button"
                accessibilityLabel={`${col.nombre.toLowerCase()}: ${TIPOS[i.tipo].nombre}, ${textoCuando(i.creado, ahora)}`}
                style={{ position: 'absolute', left: ex(p.x) - 24, top: p.y - 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: on ? 2 : 1 }}
              >
                {ahora - i.creado < RECIENTE_MS && <Onda tam={40} color={col.halo} duracionMs={2200} />}
                <View style={{ width: lado, height: lado, borderRadius: 99, backgroundColor: col.fondo, borderWidth: 3, borderColor: on ? c.texto : c.fondo, alignItems: 'center', justifyContent: 'center' }}>
                  <Icono nombre={ICONO[cat]} tam={16} color={col.texto} grosor={2.4} />
                </View>
              </Pressable>
            );
          })}
        {/* Tú, encima de los pines (un reporte a menos de 100 m caería justo aquí). */}
        <View pointerEvents="none" style={{ position: 'absolute', left: ex(CENTRO.x) - 24, top: CENTRO.y - 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
          <Onda tam={48} color="rgba(111,168,255,0.35)" duracionMs={3200} />
          <View style={{ width: 20, height: 20, borderRadius: 99, backgroundColor: c.info, borderWidth: 3, borderColor: c.fondo }} />
        </View>
      </MapaFondo>

      <View style={{ position: 'absolute', left: 16, right: 16, top: 52, gap: 10 }}>
        <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: 'rgba(23,21,19,0.94)', borderRadius: RADIO.m, borderTopWidth: 1, borderTopColor: c.brillo }}>
          <Icono nombre="ubicacion" tam={18} color={c.textoSuave} />
          <T v="cuerpo15Fuerte" style={{ flex: 1 }}>
            Cerca de ti
          </T>
          <T v="hora" suave>
            {RADIO_KM} km · 30 días
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
          <T v="subtitulo">{estado.fase !== 'listo' ? 'Cerca de ti' : visibles.length === 1 ? '1 cosa cerca' : `${visibles.length} cosas cerca`}</T>
          <Pressable
            onPress={() => setReportando(true)}
            disabled={estado.fase !== 'listo'}
            accessibilityRole="button"
            accessibilityLabel="Reportar algo en esta zona"
            style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: RADIO.total, backgroundColor: c.superficie2, opacity: estado.fase === 'listo' ? 1 : 0.5 }}
          >
            <Icono nombre="mas" tam={16} color={c.texto} />
            <T v="apoyo13" style={{ fontWeight: '600' }}>
              Reportar algo
            </T>
          </Pressable>
        </View>

        {estado.fase === 'cargando' && (
          <View style={{ height: 196, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <ActivityIndicator color={c.textoSuave} />
            <T v="apoyo" suave>
              {estado.texto}
            </T>
          </View>
        )}

        {estado.fase === 'error' && (
          <View style={{ height: 196, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <T v="cuerpo15Fuerte" style={{ textAlign: 'center' }}>
              {estado.dondeFallo === 'ubicacion' ? 'Necesitamos tu ubicación para mostrar lo que pasa cerca' : 'No pudimos cargar los reportes'}
            </T>
            <T v="apoyo13" suave style={{ textAlign: 'center' }}>
              Motivo: {estado.motivo}
            </T>
            <Boton texto="Reintentar" variante="secundario" principal={false} onPress={() => void cargar()} />
          </View>
        )}

        {estado.fase === 'listo' && visibles.length === 0 && (
          <View style={{ height: 196, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icono nombre="escudoCheck" tam={32} color={c.textoSuave} />
            <T v="cuerpo15Fuerte" style={{ textAlign: 'center' }}>
              {todos.length === 0 ? 'Todavía no hay reportes cerca' : 'Nada de este tipo cerca'}
            </T>
            <T v="apoyo13" suave style={{ textAlign: 'center' }}>
              {todos.length === 0
                ? 'En el último mes nadie reportó nada a 1 km de ti. Si ves algo, avisa a tus vecinos con "Reportar algo".'
                : 'Prueba con "Todo" para ver los demás reportes.'}
            </T>
          </View>
        )}

        {estado.fase === 'listo' && visibles.length > 0 && aqui && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 14 }}>
            {ordenadas.map((i) => {
              const cat = TIPOS[i.tipo].categoria;
              const col = colores[cat];
              const on = elegido === i.id;
              const reciente = ahora - i.creado < RECIENTE_MS;
              const medios = textoMedios(i);
              const fuente = i.origen === 'alerta' ? 'Detectado por la app' : i.tipo === 'grabacion' ? 'Grabado por un vecino' : 'Reportado por un vecino';
              return (
                <Pressable
                  key={i.id}
                  onPress={() => setElegido(i.id)}
                  accessibilityRole="button"
                  style={{ width: 236, borderRadius: 20, overflow: 'hidden', backgroundColor: c.superficie2, borderWidth: 2, borderColor: on ? c.texto : 'transparent' }}
                >
                  {/* Arriba: un cuadro de la grabación; sin grabación, un mapa chico de dónde pasó respecto a ti. */}
                  <View style={{ height: 124, backgroundColor: c.mapaFondo }}>
                    {i.miniatura ? (
                      <Image source={{ uri: i.miniatura }} accessibilityIgnoresInvertColors style={{ width: '100%', height: 124 }} resizeMode="cover" />
                    ) : (
                      <MiniMapa reporte={i} aqui={aqui} color={col.fondo} colorIcono={col.texto} halo={col.halo} icono={ICONO[cat]} reciente={reciente} />
                    )}
                    <View style={{ position: 'absolute', left: 8, top: 8 }}>
                      <Insignia tipo={col.insignia} texto={reciente ? `${col.nombre} · AHORA` : col.nombre} />
                    </View>
                    {!!medios && (
                      <View style={{ position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(8,7,6,0.78)' }}>
                        <T v="hora" style={{ fontSize: 11, color: '#f2ece3' }}>
                          {medios}
                        </T>
                      </View>
                    )}
                  </View>
                  <View style={{ padding: 12, paddingTop: 10, gap: 3 }}>
                    <T v="cuerpo15Fuerte" numberOfLines={1}>
                      {TIPOS[i.tipo].nombre}
                    </T>
                    <T v="apoyo13" suave numberOfLines={1}>
                      {textoCuando(i.creado, ahora)} · {textoLugar(aqui, i)}
                    </T>
                    {!!i.nota && (
                      <T v="apoyo13" numberOfLines={1}>
                        “{i.nota}”
                      </T>
                    )}
                    <T v="apoyo13" color={i.origen === 'alerta' ? c.protegido : c.textoSuave}>
                      {fuente}
                    </T>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        <View style={{ flex: 1 }} />
        <BarraPestanas actual="cerca" onCambiar={onPestana} />
      </Hoja>

      {aqui && (
        <HojaReportar
          visible={reportando}
          aqui={aqui}
          onCerrar={() => setReportando(false)}
          onListo={(nuevo) => {
            setReportando(false);
            if (estado.fase === 'listo') setEstado({ ...estado, reportes: [nuevo, ...estado.reportes], ahora: Date.now() });
            setFiltro('todo');
            setElegido(nuevo.id);
          }}
        />
      )}
    </View>
  );
}

const RUMBOS = ['al norte', 'al noreste', 'al este', 'al sureste', 'al sur', 'al suroeste', 'al oeste', 'al noroeste'];

/** Metros al este y al norte de `desde` hasta `hasta`. */
function desplazamiento(desde: { lat: number; lon: number }, hasta: { lat: number; lon: number }): { este: number; norte: number } {
  return {
    este: (hasta.lon - desde.lon) * 111_320 * Math.cos((desde.lat * Math.PI) / 180),
    norte: (hasta.lat - desde.lat) * 110_574,
  };
}

/** "aquí cerca" o "350 m al norte" (desde ti hasta el reporte). */
function textoLugar(aqui: { lat: number; lon: number }, r: Reporte): string {
  const m = distanciaM(aqui, r);
  if (m < 100) return textoDistancia(m);
  const { este, norte } = desplazamiento(aqui, r);
  const grados = (Math.atan2(este, norte) * 180) / Math.PI;
  return `${textoDistancia(m)} ${RUMBOS[Math.round(((grados + 360) % 360) / 45) % 8]}`;
}

/** Número estable a partir del id, para que cada tarjeta tenga sus propias calles (y no cambien al recargar). */
function semilla(id: string): number {
  let h = 2166136261;
  for (let k = 0; k < id.length; k++) h = Math.imul(h ^ id.charCodeAt(k), 16777619);
  return h >>> 0;
}

/**
 * Miniatura sin video: el reporte al centro de un mapa chico y tú (punto azul) en la dirección real.
 * Las calles son decorativas; la distancia exacta va en el texto de la tarjeta.
 */
function MiniMapa({ reporte, aqui, color, colorIcono, halo, icono, reciente }: { reporte: Reporte; aqui: { lat: number; lon: number }; color: string; colorIcono: string; halo: string; icono: NombreIcono; reciente: boolean }) {
  const c = useTema();
  const A = 236;
  const H = 124;
  const pin = { x: A / 2 + 30, y: H / 2 + 6 };
  const s = semilla(reporte.id);
  const giro = ((s % 21) - 10) / 10; // inclinación de las calles: -1 a 1
  const dx = 30 + (s % 50);
  const dy = 20 + ((s >> 8) % 40);

  // Tú, en la dirección real desde el reporte; la escala se comprime para que siempre entres en el cuadro.
  const m = distanciaM(reporte, aqui);
  const { este, norte } = desplazamiento(reporte, aqui);
  const largo = Math.hypot(este, norte);
  const px = m < 100 ? 0 : Math.min(26 + Math.sqrt(m) * 1.6, 70);
  const tu = largo > 0 && px > 0 ? { x: pin.x + (este / largo) * px, y: pin.y - (norte / largo) * px } : { x: pin.x + 16, y: pin.y + 14 };
  tu.x = Math.max(12, Math.min(A - 12, tu.x));
  tu.y = Math.max(40, Math.min(H - 12, tu.y));

  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
      <Svg width="100%" height={H} viewBox={`0 0 ${A} ${H}`} preserveAspectRatio="xMidYMid slice">
        <Rect width={A} height={H} fill={c.mapaFondo} />
        <Rect x={pin.x + dx - 10} y={pin.y - dy - 34} width={44} height={30} rx={6} fill={c.mapaParque} />
        <Path d={`M-10 ${pin.y + 12 + giro * 10} L${A + 10} ${pin.y + 12 - giro * 18}`} stroke={c.mapaCalle} strokeWidth={12} />
        <Path d={`M${pin.x - 16 + giro * 8} -10 L${pin.x - 16 - giro * 14} ${H + 10}`} stroke={c.mapaCalle} strokeWidth={14} />
        <Path d={`M-10 ${pin.y - dy} L${A + 10} ${pin.y - dy - giro * 10}`} stroke={c.mapaCalleChica} strokeWidth={6} />
        <Path d={`M${pin.x + dx} -10 L${pin.x + dx + giro * 10} ${H + 10}`} stroke={c.mapaCalleChica} strokeWidth={6} />
        <Path d={`M${pin.x - dx - 40} -10 L${pin.x - dx - 34 - giro * 6} ${H + 10}`} stroke={c.mapaCalleChica} strokeWidth={5} />
        {m >= 100 && <Line x1={pin.x} y1={pin.y} x2={tu.x} y2={tu.y} stroke={c.info} strokeWidth={1.5} strokeDasharray="3 4" opacity={0.8} />}
        {reciente && <Circle cx={pin.x} cy={pin.y} r={30} fill={halo} opacity={0.5} />}
        <Circle cx={pin.x} cy={pin.y} r={20} fill={halo} />
        <Circle cx={tu.x} cy={tu.y} r={9} fill="rgba(111,168,255,0.25)" />
        <Circle cx={tu.x} cy={tu.y} r={5.5} fill={c.info} stroke={c.fondo} strokeWidth={2} />
      </Svg>
      <View style={{ position: 'absolute', left: pin.x - 14, top: pin.y - 14, width: 28, height: 28, borderRadius: 99, backgroundColor: color, borderWidth: 2.5, borderColor: c.fondo, alignItems: 'center', justifyContent: 'center' }}>
        <Icono nombre={icono} tam={14} color={colorIcono} grosor={2.4} />
      </View>
    </View>
  );
}

const OPCIONES: TipoReporte[] = ['arrebato_moto', 'arrebato_a_pie', 'intento', 'robo', 'sospechoso', 'zona_oscura'];

/** "Reportar algo": tipo, nota opcional y tu ubicación actual (redondeada a ~100 m en el servidor). */
function HojaReportar({ visible, aqui, onCerrar, onListo }: { visible: boolean; aqui: { lat: number; lon: number }; onCerrar: () => void; onListo: (r: Reporte) => void }) {
  const c = useTema();
  const [tipo, setTipo] = useState<TipoReporte | null>(null);
  const [nota, setNota] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setTipo(null);
    setNota('');
    setError('');
  }, [visible]);

  const enviar = async () => {
    if (!tipo) return;
    setEnviando(true);
    setError('');
    const r = await reportar(tipo, nota, aqui);
    setEnviando(false);
    if (!r.ok) return setError(`No se envió: ${r.motivo}.`);
    onListo(r.datos);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <Pressable onPress={onCerrar} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} accessibilityLabel="Cerrar" />
      <Hoja style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 28, gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T v="subtitulo">¿Qué viste?</T>
          <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
            <Icono nombre="cerrar" tam={18} color={c.textoSuave} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {OPCIONES.map((t) => (
            <Chip key={t} texto={TIPOS[t].nombre} activo={tipo === t} onPress={() => setTipo(t)} />
          ))}
        </View>
        <TextInput
          value={nota}
          onChangeText={(v) => setNota(v.slice(0, MAX_NOTA))}
          maxLength={MAX_NOTA}
          placeholder="Detalle (opcional): moto roja, dos personas…"
          placeholderTextColor={c.textoSuave}
          accessibilityLabel="Detalle del reporte"
          style={[TIPO.cuerpo15, { minHeight: 52, color: c.texto, backgroundColor: c.superficie2, borderRadius: RADIO.s, paddingHorizontal: 16, paddingVertical: 12 }]}
        />
        <T v="apoyo13" suave>
          Se publica sin tu nombre, con tu ubicación aproximada (a unos 100 m). {nota.length}/{MAX_NOTA}
        </T>
        {!!error && (
          <T v="apoyo" color={c.aviso}>
            {error}
          </T>
        )}
        <Boton texto={enviando ? 'Enviando…' : 'Publicar reporte'} icono="check" deshabilitado={!tipo || enviando} onPress={() => void enviar()} />
      </Hoja>
    </Modal>
  );
}
