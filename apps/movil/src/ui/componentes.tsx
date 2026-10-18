import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGrabacionEnCurso } from '../grabacionEvidencia';
import { Icono, type NombreIcono } from './iconos';
import { CONTROL, ESPACIO, FUENTES, RADIO, TIPO, useTema, type Colores } from './tema';

// --- Movimiento ------------------------------------------------------------------------------------

/** "Reducir movimiento" del sistema: si está activo, no animamos nada (README del sistema). */
export function useReducirMovimiento(): boolean {
  const [reducir, setReducir] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducir);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducir);
    return () => sub.remove();
  }, []);
  return reducir;
}

/** Valor que va de 0 a 1 en bucle (para pulsos, respiración y parpadeo). */
export function useBucle(duracionMs: number, retrasoMs = 0, vaiven = false): Animated.Value {
  const reducir = useReducirMovimiento();
  const valor = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reducir) {
      valor.setValue(0);
      return;
    }
    const nativo = Platform.OS !== 'web';
    const ida = Animated.timing(valor, { toValue: 1, duration: duracionMs, easing: Easing.inOut(Easing.ease), useNativeDriver: nativo });
    const vuelta = Animated.timing(valor, { toValue: 0, duration: duracionMs, easing: Easing.inOut(Easing.ease), useNativeDriver: nativo });
    const anim = Animated.loop(
      vaiven ? Animated.sequence([ida, vuelta]) : Animated.sequence([Animated.timing(valor, { toValue: 1, duration: duracionMs, easing: Easing.out(Easing.ease), useNativeDriver: nativo }), Animated.timing(valor, { toValue: 0, duration: 0, useNativeDriver: nativo })]),
    );
    const t = setTimeout(() => anim.start(), retrasoMs);
    return () => {
      clearTimeout(t);
      anim.stop();
    };
  }, [reducir, duracionMs, retrasoMs, vaiven, valor]);
  return valor;
}

/** Onda que se expande y se desvanece (ubicación en vivo, "EN VIVO", pines recientes). */
export function Onda({ tam, color, duracionMs = 2400, retrasoMs = 0, borde = false }: { tam: number; color: string; duracionMs?: number; retrasoMs?: number; borde?: boolean }) {
  const v = useBucle(duracionMs, retrasoMs);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: tam,
        height: tam,
        borderRadius: RADIO.total,
        ...(borde ? { borderWidth: 1, borderColor: color } : { backgroundColor: color }),
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }),
        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.3] }) }],
      }}
    />
  );
}

/** Respiración lenta (el escudo cuando estás protegida). */
export function Respira({ children, activo = true }: { children: ReactNode; activo?: boolean }) {
  const v = useBucle(1400, 0, true);
  if (!activo) return <>{children}</>;
  return <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }}>{children}</Animated.View>;
}

export function Parpadeo({ color, tam = 7 }: { color: string; tam?: number }) {
  const v = useBucle(800, 0, true);
  return <Animated.View style={{ width: tam, height: tam, borderRadius: RADIO.total, backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }) }} />;
}

// --- Texto -----------------------------------------------------------------------------------------

type Variante = keyof typeof TIPO;

export function T({
  v = 'cuerpo',
  color,
  suave = false,
  style,
  children,
  ...resto
}: {
  v?: Variante;
  color?: string;
  suave?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  accessibilityRole?: 'header' | 'text' | 'alert';
  /** Para copiar un número largo (IMEI, DNI) en la web. */
  selectable?: boolean;
}) {
  const c = useTema();
  return (
    <Text style={[TIPO[v], { color: color ?? (suave ? c.textoSuave : c.texto) }, style]} {...resto}>
      {children}
    </Text>
  );
}

/** Número con su unidad pegada (en `texto-suave`): **34** km/h. */
export function Medida({ valor, unidad, v = 'dato20' }: { valor: string; unidad?: string; v?: Variante }) {
  const c = useTema();
  return (
    <Text style={[TIPO[v], { color: c.texto, fontVariant: ['tabular-nums'] }]}>
      {valor}
      {unidad ? <Text style={{ fontFamily: FUENTES.datos, fontSize: 12, color: c.textoSuave }}> {unidad}</Text> : null}
    </Text>
  );
}

// --- Botón (components/Boton) ----------------------------------------------------------------------

export type VarianteBoton = 'proteger' | 'emergencia' | 'secundario' | 'terciario';

/**
 * - proteger: píldora `protegido`, ícono en círculo oscuro. Uno por pantalla.
 * - emergencia: solo "Llamar a la Policía (105)". Uno por pantalla.
 * - secundario: píldora tonal `superficie-2`, sin borde, ícono en círculo `fondo`.
 * - terciario: solo texto.
 * Deshabilitado: opacidad 0,5 y un texto que explique por qué.
 */
export function Boton({
  texto,
  onPress,
  variante = 'proteger',
  icono,
  principal = variante === 'proteger' || variante === 'emergencia',
  deshabilitado = false,
  flex,
  accessibilityLabel,
}: {
  texto: string;
  onPress?: () => void;
  variante?: VarianteBoton;
  icono?: NombreIcono;
  principal?: boolean;
  deshabilitado?: boolean;
  flex?: boolean;
  accessibilityLabel?: string;
}) {
  const c = useTema();
  const colores = {
    proteger: { fondo: c.protegido, texto: c.sobreProtegido, circulo: c.sobreProtegido, icono: c.protegido },
    emergencia: { fondo: c.alerta, texto: c.sobreAlerta, circulo: c.sobreAlerta, icono: c.alerta },
    secundario: { fondo: c.superficie2, texto: c.texto, circulo: c.fondo, icono: c.texto },
    terciario: { fondo: 'transparent', texto: c.textoSuave, circulo: 'transparent', icono: c.textoSuave },
  }[variante];
  const alto = principal ? CONTROL.botonAlto : variante === 'terciario' ? CONTROL.toqueMin : 52;
  const circulo = principal ? CONTROL.iconoCirculo : 36;
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? texto}
      accessibilityState={{ disabled: deshabilitado }}
      style={({ pressed }) => [
        {
          minHeight: alto,
          borderRadius: RADIO.total,
          backgroundColor: colores.fondo,
          flexDirection: 'row',
          alignItems: 'center',
          gap: principal ? ESPACIO[3] : ESPACIO[2],
          paddingLeft: icono ? ESPACIO[2] : ESPACIO[4],
          paddingRight: principal ? ESPACIO[4] : ESPACIO[3],
          justifyContent: !icono || principal ? 'center' : 'flex-start',
          opacity: deshabilitado ? 0.5 : pressed ? 0.85 : 1,
        },
        flex && { flex: 1 },
      ]}
    >
      {icono && (
        <View style={{ width: circulo, height: circulo, borderRadius: RADIO.total, backgroundColor: colores.circulo, alignItems: 'center', justifyContent: 'center' }}>
          <Icono nombre={icono} tam={principal ? 18 : 16} color={colores.icono} grosor={2.2} />
        </View>
      )}
      <Text
        numberOfLines={principal ? 2 : 1}
        style={[
          principal ? TIPO.cuerpoFuerte : TIPO.cuerpo15Fuerte,
          { color: colores.texto },
          principal && icono ? { flex: 1, textAlign: 'center', marginRight: circulo + ESPACIO[3] } : null,
        ]}
      >
        {texto}
      </Text>
    </Pressable>
  );
}

// --- Insignia (components/Insignia) ----------------------------------------------------------------

export function Insignia({ tipo, texto, punto = false, parpadeo = false }: { tipo: 'protegido' | 'alerta' | 'aviso' | 'neutra'; texto: string; punto?: boolean; parpadeo?: boolean }) {
  const c = useTema();
  const col = {
    protegido: [c.protegidoFondo, c.protegido],
    alerta: [c.alertaFondo, c.alerta],
    aviso: [c.avisoFondo, c.aviso],
    neutra: [c.superficie2, c.textoSuave],
  }[tipo];
  return (
    <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 10, borderRadius: RADIO.total, backgroundColor: col[0] }}>
      {punto && (parpadeo ? <Parpadeo color={col[1]!} /> : <View style={{ width: 7, height: 7, borderRadius: 99, backgroundColor: col[1] }} />)}
      <Text style={[TIPO.etiqueta, { fontSize: 11, color: col[1] }]}>{texto}</Text>
    </View>
  );
}

// --- Lectura (components/Lectura) ------------------------------------------------------------------

export interface Celda {
  rotulo: string;
  valor: string;
  unidad?: string;
  estado?: string;
  tono?: 'protegido' | 'aviso';
  extra?: ReactNode;
}

/** Fila abierta de 2–3 lecturas entre dos líneas de 1 px, sin caja ni divisiones verticales. */
export function Lecturas({ celdas }: { celdas: Celda[] }) {
  const c = useTema();
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.linea }}>
      {celdas.map((x) => (
        <View key={x.rotulo} style={{ flex: 1, paddingVertical: 12, gap: 2 }} accessible accessibilityLabel={`${x.rotulo}: ${x.valor} ${x.unidad ?? ''}. ${x.estado ?? ''}`}>
          <Text style={[TIPO.etiqueta, { fontSize: 11, color: c.textoSuave }]}>{x.rotulo}</Text>
          <Medida valor={x.valor} unidad={x.unidad} />
          {x.extra ?? (x.estado ? <Text style={{ fontFamily: FUENTES.texto, fontSize: 12, color: x.tono === 'aviso' ? c.aviso : c.protegido }}>{x.estado}</Text> : null)}
        </View>
      ))}
    </View>
  );
}

// --- Superficies -----------------------------------------------------------------------------------

/** Tarjeta: `superficie` con el filo de `brillo` arriba en vez de borde (sin cajas). */
export function Tarjeta({ children, style, filo }: { children: ReactNode; style?: StyleProp<ViewStyle>; filo?: string }) {
  const c = useTema();
  return <View style={[{ backgroundColor: c.superficie, borderRadius: RADIO.m, borderTopWidth: 1, borderTopColor: filo ?? c.brillo, padding: ESPACIO[4] }, style]}>{children}</View>;
}

/** Hoja inferior: la única superficie elevada de la pantalla (radio 28, brillo y sombra larga). */
export function Hoja({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTema();
  return (
    <View
      style={[
        {
          backgroundColor: c.superficie,
          borderTopLeftRadius: RADIO.l,
          borderTopRightRadius: RADIO.l,
          borderTopWidth: 1,
          borderTopColor: c.brillo,
          shadowColor: '#000',
          shadowOpacity: 0.45,
          shadowRadius: 40,
          shadowOffset: { width: 0, height: -16 },
          elevation: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Pantalla con fondo del tema, márgenes seguros y scroll opcional. */
export function Pantalla({ children, scroll = true, style, sinMargen = false }: { children: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle>; sinMargen?: boolean }) {
  const c = useTema();
  const ins = useSafeAreaInsets();
  const contenido: StyleProp<ViewStyle> = [
    { paddingTop: ins.top + 16, paddingBottom: ins.bottom + 24, paddingHorizontal: sinMargen ? 0 : ESPACIO[4], gap: ESPACIO[6], flexGrow: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
    style,
  ];
  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      {scroll ? <ScrollView contentContainerStyle={contenido} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[contenido, { flex: 1 }]}>{children}</View>}
    </View>
  );
}

/** Encabezado de los pasos de bienvenida: volver + una barra de progreso por segmentos. */
export function Pasos({ paso, total, onVolver, titulo }: { paso: number; total: number; onVolver?: () => void; titulo?: string }) {
  const c = useTema();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 }}>
      {onVolver ? (
        <Pressable onPress={onVolver} accessibilityRole="button" accessibilityLabel="Volver" style={{ width: 48, height: 48, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icono nombre="volver" color={c.texto} />
        </Pressable>
      ) : (
        <Text style={{ fontFamily: FUENTES.titular, fontSize: 17, color: c.texto }}>{titulo ?? 'Alerta Arrebato'}</Text>
      )}
      {/* En pantallas sueltas (total 1) solo queda el botón de volver. */}
      {total > 1 && (
        <View accessible accessibilityLabel={`Paso ${paso} de ${total}`} style={{ flex: 1, flexDirection: 'row', gap: 6, marginLeft: onVolver ? 0 : 16 }}>
          {Array.from({ length: total }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: RADIO.total, backgroundColor: i < paso ? c.protegido : c.linea }} />
          ))}
        </View>
      )}
    </View>
  );
}

/** Rótulo de sección en mayúsculas (estilo `etiqueta`). */
export function Rotulo({ children }: { children: string }) {
  return (
    <T v="etiqueta" suave>
      {children}
    </T>
  );
}

/** Fila de una lista de ajustes: separada por `linea`, mínimo 56 px. */
export function Fila({ titulo, detalle, derecha, onPress, ultima = false, fondo }: { titulo: string; detalle?: string; derecha?: ReactNode; onPress?: () => void; ultima?: boolean; fondo?: string }) {
  const c = useTema();
  const contenido = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: ultima ? 0 : 1, borderBottomColor: c.linea, backgroundColor: fondo }}>
      <View style={{ flex: 1 }}>
        <T v="cuerpo15">{titulo}</T>
        {detalle ? <T v="apoyo13" suave>{detalle}</T> : null}
      </View>
      {derecha}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {contenido}
    </Pressable>
  ) : (
    contenido
  );
}

/** Grupo de filas (tarjeta sin borde, con brillo). */
export function Grupo({ children }: { children: ReactNode }) {
  const c = useTema();
  return <View style={{ backgroundColor: c.superficie, borderRadius: RADIO.m, borderTopWidth: 1, borderTopColor: c.brillo, overflow: 'hidden' }}>{children}</View>;
}

/** Chip seleccionable (filtros, motivos, modos). */
export function Chip({ texto, activo, onPress }: { texto: string; activo: boolean; onPress: () => void }) {
  const c = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: RADIO.total, justifyContent: 'center', backgroundColor: activo ? c.texto : c.superficie2 }}
    >
      <Text style={[TIPO.apoyo, { fontFamily: FUENTES.textoFuerte, color: activo ? c.fondo : c.texto }]}>{texto}</Text>
    </Pressable>
  );
}

// --- Línea de tiempo (components/LineaDeTiempo) ----------------------------------------------------

export interface Paso {
  hora: string;
  texto: string;
  clave?: boolean;
  ahora?: boolean;
}

export function LineaDeTiempo({ pasos, enTarjeta = true }: { pasos: Paso[]; enTarjeta?: boolean }) {
  const c = useTema();
  const lista = (
    <View style={{ gap: 14 }}>
      {pasos.map((p, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={[TIPO.hora, { color: c.textoSuave, width: 64, fontVariant: ['tabular-nums'] }]}>{p.hora}</Text>
          <View style={{ width: 10, height: 10, borderRadius: 99, backgroundColor: p.clave ? c.alerta : c.textoSuave }} />
          <Text style={[TIPO.cuerpo15, { color: c.texto, flex: 1 }]}>
            {p.texto}
            {p.ahora ? <Text style={[TIPO.etiqueta, { fontSize: 11, color: c.alerta }]}>{'  AHORA'}</Text> : null}
          </Text>
        </View>
      ))}
    </View>
  );
  return enTarjeta ? <Tarjeta>{lista}</Tarjeta> : lista;
}

// --- Barra de pestañas -----------------------------------------------------------------------------

export type Pestana = 'inicio' | 'cerca' | 'grabar' | 'tu';

const PESTANAS: Array<{ id: Pestana; nombre: string; icono: NombreIcono }> = [
  { id: 'inicio', nombre: 'Protección', icono: 'escudo' },
  { id: 'cerca', nombre: 'Cerca', icono: 'mapa' },
  { id: 'grabar', nombre: 'Grabar', icono: 'grabar' },
  { id: 'tu', nombre: 'Tú', icono: 'persona' },
];

/** La pestaña activa va en marfil (no en menta: el menta solo significa "protegida"). */
export function BarraPestanas({ actual, onCambiar, conFondo = false }: { actual: Pestana; onCambiar: (p: Pestana) => void; conFondo?: boolean }) {
  const c = useTema();
  const ins = useSafeAreaInsets();
  const grabacion = useGrabacionEnCurso();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.linea, paddingBottom: Math.max(ins.bottom, 12), backgroundColor: conFondo ? c.superficie : undefined }}>
      {PESTANAS.map((p) => {
        const on = p.id === actual;
        // Si hay una grabación en curso, la pestaña lo dice desde cualquier pantalla.
        const grabando = p.id === 'grabar' && grabacion !== null;
        return (
          <Pressable
            key={p.id}
            onPress={() => onCambiar(p.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={grabando ? 'Grabando evidencia' : p.nombre}
            style={{ flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <Icono nombre={p.icono} color={grabando ? c.alerta : on ? c.texto : c.textoSuave} />
            <Text style={{ fontFamily: FUENTES.textoMedio, fontSize: 11, color: grabando ? c.alerta : on ? c.texto : c.textoSuave }}>{grabando ? 'Grabando' : p.nombre}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// --- Utilidades ------------------------------------------------------------------------------------

export function hora(t: number, segundos = false): string {
  const d = new Date(t);
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${dos(d.getHours())}:${dos(d.getMinutes())}${segundos ? `:${dos(d.getSeconds())}` : ''}`;
}

export function estilosDe(c: Colores) {
  return StyleSheet.create({
    circuloIcono: { width: 44, height: 44, borderRadius: RADIO.total, backgroundColor: c.superficie2, alignItems: 'center', justifyContent: 'center' },
  });
}
