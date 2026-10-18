import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Boton, Hoja, Insignia, LineaDeTiempo, Onda, T, type Paso } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { MapaFondo, useEscalaX } from '../ui/mapa';
import { COLORES, RADIO, TemaContexto, useTema } from '../ui/tema';

export interface Coordenada {
  lat: number;
  lon: number;
}

export interface DatosContacto {
  nombre: string;
  pasos: Paso[];
  velocidadKmh: number | null;
  horaJalon: string;
  haceTexto: string;
  /** La ruta real (la primera lectura es la más antigua). Sin ruta se dibuja la de ejemplo. */
  ruta?: Coordenada[];
  jalon?: Coordenada | null;
  /** `cancelada`: el dueño confirmó con su PIN que fue falsa alarma. */
  estado?: 'en_espera' | 'avisada' | 'cancelada';
  /** Quién de la red dijo "Yo me encargo". */
  encargado?: string | null;
}

const RUTA_EJEMPLO = 'M150 450 L162 394 L236 378 L312 362 L318 300 L322 242';

/**
 * Pasa la ruta real (lat/lon) al lienzo del mapa (390 × 600): la encaja en la zona libre entre la cabecera
 * y la hoja, sin deformarla (1° de longitud mide menos que 1° de latitud fuera del ecuador).
 */
export function proyectarRuta(puntos: Coordenada[], caja = { x: 50, y: 210, ancho: 290, alto: 250 }): Array<{ x: number; y: number }> {
  if (puntos.length === 0) return [];
  const latMedia = puntos.reduce((a, p) => a + p.lat, 0) / puntos.length;
  const k = Math.cos((latMedia * Math.PI) / 180);
  const xs = puntos.map((p) => p.lon * k);
  const ys = puntos.map((p) => p.lat);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // Mínimo ~110 m de lado: una ruta cortita no se estira hasta llenar la pantalla.
  const lado = Math.max(x1 - x0, y1 - y0, 0.001);
  const escala = Math.min(caja.ancho, caja.alto) / lado;
  const cx = caja.x + caja.ancho / 2;
  const cy = caja.y + caja.alto / 2;
  return puntos.map((_, i) => ({ x: cx + (xs[i] - (x0 + x1) / 2) * escala, y: cy - (ys[i] - (y0 + y1) / 2) * escala }));
}

/** Datos de ejemplo, SOLO para mostrar cómo se verá (se marca en pantalla). */
export const EJEMPLO_CONTACTO: DatosContacto = {
  nombre: 'Ana',
  pasos: [
    { hora: '19:43:11', texto: 'Va al norte por Av. Arequipa', clave: true, ahora: true },
    { hora: '19:42:05', texto: 'Jalón en Av. Arequipa y Calle Schell', clave: true },
  ],
  velocidadKmh: 34,
  horaJalon: '19:42',
  haceTexto: 'hace 01:12',
};

/**
 * F5 · Página web del contacto (tema Día). La abre la mamá desde el WhatsApp, sin instalar nada.
 * Primero lo que calma ("probablemente está bien"), después el dato. Un solo botón de emergencia.
 */
interface Props {
  datos: DatosContacto;
  ejemplo: boolean;
  onCerrar?: () => void;
  /** En una alerta real: avisa al resto de la red que esta persona se encarga. */
  onEncargarme?: () => Promise<boolean>;
}

export function WebContacto(props: Props) {
  return (
    <TemaContexto.Provider value={COLORES.dia}>
      <Contenido {...props} />
    </TemaContexto.Provider>
  );
}

function Contenido({ datos, ejemplo, onCerrar, onEncargarme }: Props) {
  const c = useTema();
  const ins = useSafeAreaInsets();
  const ex = useEscalaX();
  const [yoMeEncargo, setYoMeEncargo] = useState(false);
  const encargado = yoMeEncargo || Boolean(datos.encargado);
  const cancelada = datos.estado === 'cancelada';

  const real = datos.ruta && datos.ruta.length > 0 ? proyectarRuta(datos.jalon ? [datos.jalon, ...datos.ruta] : datos.ruta) : null;
  const inicio = real ? real[0] : { x: 150, y: 450 };
  const fin = real ? real[real.length - 1] : { x: 322, y: 242 };
  const trazo = real ? real.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') : RUTA_EJEMPLO;
  const ultima = datos.ruta?.[datos.ruta.length - 1];

  const encargarme = async () => {
    if (!onEncargarme) return setYoMeEncargo(true);
    if (await onEncargarme()) setYoMeEncargo(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <MapaFondo alto={600}>
        <Svg width={ex(390)} height={600} viewBox="0 0 390 600" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Path d={trazo} fill="none" stroke={c.alerta} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 8" />
        </Svg>
        <View style={{ position: 'absolute', left: ex(inicio.x - 10), top: inicio.y - 10, width: 20, height: 20, borderRadius: 99, backgroundColor: '#ffffff', borderWidth: 4, borderColor: c.alerta }} />
        <View style={{ position: 'absolute', left: ex(Math.min(inicio.x + 16, 290)), top: inicio.y + 8, backgroundColor: c.superficie, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
          <T v="apoyo13">Jalón · {datos.horaJalon}</T>
        </View>
        <View style={{ position: 'absolute', left: ex(fin.x - 19), top: fin.y - 19, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
          <Onda tam={38} color="rgba(194,65,45,0.35)" duracionMs={2000} />
          <View style={{ width: 16, height: 16, borderRadius: 99, backgroundColor: c.alerta, borderWidth: 3, borderColor: '#ffffff' }} />
        </View>
        {datos.velocidadKmh !== null && !cancelada && (
          <View style={{ position: 'absolute', left: ex(Math.max(10, Math.min(fin.x - 132, 250))), top: fin.y - 27, backgroundColor: c.alerta, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <T v="apoyo13" color={c.sobreAlerta}>
              Ahora · {datos.velocidadKmh} km/h
            </T>
          </View>
        )}
      </MapaFondo>

      <View style={{ paddingTop: ins.top + 12, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: c.superficie, borderBottomWidth: 1, borderBottomColor: c.linea, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {cancelada ? <Insignia tipo="protegido" texto="FALSA ALARMA" /> : <Insignia tipo="alerta" texto="EN VIVO" punto parpadeo />}
          <T v="hora" suave>
            {datos.haceTexto}
          </T>
          <View style={{ flex: 1 }} />
          {onCerrar && (
            <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel="Cerrar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre="cerrar" color={c.texto} />
            </Pressable>
          )}
        </View>
        <T v="titulo" accessibilityRole="header">
          {cancelada ? `${datos.nombre} está bien` : `Le arrancharon el celular a ${datos.nombre}`}
        </T>
        <T v="cuerpo15" suave>
          {cancelada
            ? `${datos.nombre} confirmó con su PIN que fue una falsa alarma. No tienes que hacer nada.`
            : `${datos.nombre} probablemente está bien. Esta es la ruta de su celular.`}
        </T>
        {ejemplo && <Insignia tipo="aviso" texto="VISTA DE EJEMPLO" />}
      </View>

      <View style={{ flex: 1 }} />
      <Hoja style={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: ins.bottom + 24 }}>
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          <LineaDeTiempo pasos={datos.pasos} enTarjeta={false} />
          {!cancelada && <Boton texto="Llamar a la Policía (105)" variante="emergencia" icono="telefono" onPress={() => void Linking.openURL('tel:105')} />}
          {ultima && (
            <Boton
              texto="Ver la calle exacta en Google Maps"
              variante="secundario"
              principal={false}
              icono="mapa"
              onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${ultima.lat},${ultima.lon}`)}
            />
          )}
          {cancelada ? null : !encargado ? (
            <Boton texto="Yo me encargo (avisa al resto)" variante="secundario" principal={false} onPress={() => void encargarme()} />
          ) : (
            <View style={{ minHeight: 48, borderRadius: RADIO.total, backgroundColor: c.protegidoFondo, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 }}>
              <Icono nombre="check" tam={18} color={c.protegido} />
              <T v="cuerpo15Fuerte" color={c.protegido}>
                {ejemplo ? 'Así le avisaremos al resto de la red' : yoMeEncargo ? 'Avisamos al resto de la red que tú te encargas' : `${datos.encargado} se está encargando`}
              </T>
            </View>
          )}
        </ScrollView>
      </Hoja>
    </View>
  );
}
