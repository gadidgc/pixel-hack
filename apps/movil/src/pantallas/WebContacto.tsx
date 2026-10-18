import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Linking, Pressable, ScrollView, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { EJEMPLO_KIT, KitBloqueo, type Kit, type ResultadoMarca } from '../componentes/KitBloqueo';
import { Boton, Hoja, Insignia, LineaDeTiempo, Onda, T, type Paso } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { MapaFondo, useEscalaX } from '../ui/mapa';
import { MapaCalles, aPantalla, encuadrar, type Coordenada, type Punto } from '../ui/mapa-calles';
import { COLORES, RADIO, TemaContexto, useTema } from '../ui/tema';

export type { Coordenada };

export interface DatosContacto {
  nombre: string;
  pasos: Paso[];
  velocidadKmh: number | null;
  horaJalon: string;
  haceTexto: string;
  /** La ruta real (la primera lectura es la más antigua). Sin ruta se dibuja la de ejemplo. */
  ruta?: Coordenada[];
  jalon?: Coordenada | null;
  /** `cancelada`: el dueño confirmó con su PIN que fue falsa alarma. `robo_confirmado`: alguien de la red confirmó el robo. */
  estado?: 'en_espera' | 'avisada' | 'robo_confirmado' | 'cancelada';
  /** Quién de la red dijo "Yo me encargo". */
  encargado?: string | null;
  /** Quién confirmó el robo. */
  roboConfirmadoPor?: string | null;
  /** Kit de bloqueo: solo existe después de confirmar el robo. */
  kit?: Kit | null;
}

/** Ruta de ejemplo en coordenadas del diseño (390 de ancho), sobre el mapa estilizado. */
const RUTA_EJEMPLO: Punto[] = [
  { x: 150, y: 450 },
  { x: 162, y: 394 },
  { x: 236, y: 378 },
  { x: 312, y: 362 },
  { x: 318, y: 300 },
  { x: 322, y: 242 },
];

/** Zona libre por defecto (entre la cabecera y la hoja) hasta que se mida la pantalla. */
const ZONA_INICIAL = { arriba: 210, abajo: 460 };
/** Margen alrededor de la ruta para que entren el punto del jalón y las etiquetas. */
const MARGEN = { lados: 36, arriba: 44, abajo: 48 };

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
  /** "Sí, fue un robo": devuelve `null` si salió bien o el motivo si no. */
  onConfirmarRobo?: () => Promise<string | null>;
  /** Marca un paso del kit de bloqueo para toda la red. */
  onMarcarPaso?: (paso: string, hecho: boolean) => Promise<ResultadoMarca>;
}

export function WebContacto(props: Props) {
  return (
    <TemaContexto.Provider value={COLORES.dia}>
      <Contenido {...props} />
    </TemaContexto.Provider>
  );
}

function Contenido({ datos, ejemplo, onCerrar, onEncargarme, onConfirmarRobo, onMarcarPaso }: Props) {
  const c = useTema();
  const ins = useSafeAreaInsets();
  const ex = useEscalaX();
  const [yoMeEncargo, setYoMeEncargo] = useState(false);
  const encargado = yoMeEncargo || Boolean(datos.encargado);
  const cancelada = datos.estado === 'cancelada';
  // Confirmar el robo: primero se pregunta "¿seguro?" en la misma hoja (sin diálogos del sistema).
  const [preguntando, setPreguntando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [errorRobo, setErrorRobo] = useState('');
  // En la vista de ejemplo se puede probar el flujo completo sin backend.
  const [ejemploConfirmado, setEjemploConfirmado] = useState(false);
  const [kitEjemplo, setKitEjemplo] = useState(EJEMPLO_KIT);
  const kit = ejemplo ? (ejemploConfirmado ? kitEjemplo : null) : (datos.kit ?? null);
  // En la vista de ejemplo no hay backend: las marcas se guardan aquí.
  const marcarEjemplo = async (paso: string, hecho: boolean): Promise<ResultadoMarca> => {
    setKitEjemplo((k) => ({ ...k, pasos: k.pasos.map((p) => (p.paso === paso ? { ...p, hecho, quien: hecho ? 'Tú' : null, hechoEn: null } : p)) }));
    return { error: null, quien: 'Tú' };
  };
  const robo = Boolean(kit) || datos.estado === 'robo_confirmado';
  const puedeConfirmar = !cancelada && !robo && (ejemplo || datos.estado === 'avisada');
  // Al aparecer el kit, la hoja vuelve arriba: si no, se queda donde estaba el "¿Confirmas?" y no se ve el primer paso.
  const hoja = useRef<ComponentRef<typeof ScrollView>>(null);
  const conKit = Boolean(kit);
  useEffect(() => {
    if (conKit) hoja.current?.scrollTo({ y: 0, animated: false });
  }, [conKit]);

  // Medidas reales: el lienzo entero y el hueco entre la cabecera y la hoja (ahí va la ruta).
  const ventana = useWindowDimensions();
  const [lienzo, setLienzo] = useState({ ancho: ventana.width, alto: ventana.height });
  const [hueco, setHueco] = useState(ZONA_INICIAL);
  const medirLienzo = (e: LayoutChangeEvent) => setLienzo({ ancho: e.nativeEvent.layout.width, alto: e.nativeEvent.layout.height });
  const medirHueco = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setHueco({ arriba: y, abajo: y + height });
  };

  const conRuta = Boolean(datos.ruta && datos.ruta.length > 0);
  const coordenadas: Coordenada[] = conRuta ? (datos.jalon ? [datos.jalon, ...(datos.ruta ?? [])] : (datos.ruta ?? [])) : [];
  const zona = {
    x: MARGEN.lados,
    y: hueco.arriba + MARGEN.arriba,
    ancho: Math.max(lienzo.ancho - 2 * MARGEN.lados, 80),
    alto: Math.max(hueco.abajo - hueco.arriba - MARGEN.arriba - MARGEN.abajo, 80),
  };
  const encuadre = conRuta ? encuadrar(coordenadas, zona) : null;
  // Todo en píxeles de pantalla: la ruta real con Web Mercator; la de ejemplo, escalada desde el diseño.
  const puntos: Punto[] = encuadre ? coordenadas.map((p) => aPantalla(p, encuadre)) : RUTA_EJEMPLO.map((p) => ({ x: ex(p.x), y: p.y }));
  const inicio = puntos[0];
  const fin = puntos[puntos.length - 1];
  const trazo = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const ultima = datos.ruta?.[datos.ruta.length - 1];

  const confirmarRobo = async () => {
    if (ejemplo || !onConfirmarRobo) {
      setEjemploConfirmado(true);
      return setPreguntando(false);
    }
    setConfirmando(true);
    const motivo = await onConfirmarRobo();
    setConfirmando(false);
    setErrorRobo(motivo ?? '');
    if (!motivo) setPreguntando(false);
  };

  const encargarme = async () => {
    if (!onEncargarme) return setYoMeEncargo(true);
    if (await onEncargarme()) setYoMeEncargo(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }} onLayout={medirLienzo}>
      {encuadre ? <MapaCalles encuadre={encuadre} ancho={lienzo.ancho} alto={lienzo.alto} arribaCredito={hueco.arriba} /> : <MapaFondo alto={600} />}
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} pointerEvents="none">
        <Svg width={lienzo.ancho} height={lienzo.alto} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
          <Path d={trazo} fill="none" stroke={c.alerta} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 8" />
        </Svg>
        <View style={{ position: 'absolute', left: inicio.x - 10, top: inicio.y - 10, width: 20, height: 20, borderRadius: 99, backgroundColor: '#ffffff', borderWidth: 4, borderColor: c.alerta }} />
        <View style={{ position: 'absolute', left: Math.max(8, Math.min(inicio.x + 16, lienzo.ancho - 110)), top: inicio.y + 8, backgroundColor: c.superficie, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 }}>
          <T v="apoyo13">Jalón · {datos.horaJalon}</T>
        </View>
        <View style={{ position: 'absolute', left: fin.x - 19, top: fin.y - 19, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
          <Onda tam={38} color="rgba(194,65,45,0.35)" duracionMs={2000} />
          <View style={{ width: 16, height: 16, borderRadius: 99, backgroundColor: c.alerta, borderWidth: 3, borderColor: '#ffffff' }} />
        </View>
        {datos.velocidadKmh !== null && !cancelada && (
          <View style={{ position: 'absolute', left: Math.max(10, Math.min(fin.x - 132, lienzo.ancho - 140)), top: fin.y - 27, backgroundColor: c.alerta, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <T v="apoyo13" color={c.sobreAlerta}>
              Ahora · {datos.velocidadKmh} km/h
            </T>
          </View>
        )}
      </View>

      <View style={{ paddingTop: ins.top + 12, paddingHorizontal: 16, paddingBottom: 14, backgroundColor: c.superficie, borderBottomWidth: 1, borderBottomColor: c.linea, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {cancelada ? (
            <Insignia tipo="protegido" texto="FALSA ALARMA" />
          ) : robo ? (
            <Insignia tipo="alerta" texto="ROBO CONFIRMADO" />
          ) : (
            <Insignia tipo="alerta" texto="EN VIVO" punto parpadeo />
          )}
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
            : robo
              ? `${ejemplo ? 'Confirmaste' : `${datos.roboConfirmadoPor ?? 'Alguien de su red'} confirmó`} el robo. Sigue estos pasos para bloquear sus cuentas.`
              : `${datos.nombre} probablemente está bien. Esta es la ruta de su celular.`}
        </T>
        {ejemplo && <Insignia tipo="aviso" texto="VISTA DE EJEMPLO" />}
      </View>

      <View style={{ flex: 1 }} onLayout={medirHueco} />
      <Hoja style={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: ins.bottom + 24, maxHeight: kit || preguntando ? '64%' : undefined }}>
        {/* Con el kit, el 105 va primero (sigue siendo la acción de emergencia) y la hoja deja ver parte del mapa. */}
        <ScrollView ref={hoja} contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
          {kit && !cancelada && <Boton texto="Llamar a la Policía (105)" variante="emergencia" icono="telefono" onPress={() => void Linking.openURL('tel:105')} />}
          {kit && <KitBloqueo kit={kit} nombre={datos.nombre} horaJalon={datos.horaJalon} onMarcar={ejemplo || !onMarcarPaso ? marcarEjemplo : onMarcarPaso} />}
          <LineaDeTiempo pasos={datos.pasos} enTarjeta={false} />
          {!cancelada && !kit && <Boton texto="Llamar a la Policía (105)" variante="emergencia" icono="telefono" onPress={() => void Linking.openURL('tel:105')} />}
          {ultima && (
            <Boton
              texto="Ver la calle exacta en Google Maps"
              variante="secundario"
              principal={false}
              icono="mapa"
              onPress={() => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${ultima.lat},${ultima.lon}`)}
            />
          )}
          {puedeConfirmar &&
            (preguntando ? (
              <View style={{ borderRadius: RADIO.s, borderWidth: 1, borderColor: c.linea, padding: 14, gap: 10 }}>
                <T v="cuerpo15Fuerte">¿Confirmas que le robaron el celular a {datos.nombre}?</T>
                <T v="apoyo" suave>
                  No llames a su celular: lo tiene el ladrón. Si {datos.nombre} está contigo o te escribe desde otro número, pregúntale primero. Al confirmar, verás los números para bloquear sus bancos y su línea.
                </T>
                <T v="apoyo" suave>
                  Si fue una falsa alarma, {datos.nombre} puede anularlo con su PIN.
                </T>
                {!!errorRobo && (
                  <T v="apoyo" color={c.alerta}>
                    {errorRobo}
                  </T>
                )}
                <Boton texto={confirmando ? 'Confirmando…' : 'Sí, fue un robo'} icono="check" variante="secundario" deshabilitado={confirmando} onPress={() => void confirmarRobo()} />
                <Boton texto="Volver" variante="terciario" onPress={() => setPreguntando(false)} />
              </View>
            ) : (
              <Boton texto="Fue un robo: ver cómo bloquear" variante="secundario" principal={false} onPress={() => setPreguntando(true)} />
            ))}
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
