import { useState } from 'react';
import { Alert, Platform, Pressable, Share, Switch, View } from 'react-native';
import { DISTANCIA_DEMO_M, ESPACIOS_DEMO, type EspacioDemo } from '@pixel-hack/detector';
import { hayBackend } from '../alertas';
import { PedirPin } from '../componentes/PedirPin';
import { consultarBloqueo, faltaParaBloqueo } from '../bloqueo';
import { diagnosticoSensores } from '../sensores';
import type { EstadoProteccion } from '../servicio';
import { ETIQUETAS, type Etiqueta } from '../grabadora';
import { correrSimulacion, ESCENARIOS_APP, type ResultadoSimulacion } from '../simulacion';
import { describirEvento, useProteccion } from '../useProteccion';
import { preferencias } from '../preferencias';
import { Boton, Chip, Grupo, Lecturas, Pantalla, Rotulo, T, Tarjeta, hora } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { useTema } from '../ui/tema';

/**
 * Herramientas del equipo (no son para el usuario final): modo demo, capturar datos de sensores en CSV
 * para ajustar el detector (docs/PLAN.md §4.5), simular casos y ver el registro.
 */
export function Herramientas({ onVolver }: { onVolver: () => void }) {
  const c = useTema();
  const { estado, servicio } = useProteccion();
  const [etiqueta, setEtiqueta] = useState<Etiqueta>('caminar');
  const [simulacion, setSimulacion] = useState<ResultadoSimulacion | null>(null);
  const tel = estado.telemetria;
  const [copiado, setCopiado] = useState(false);
  const [pedirPinBorrar, setPedirPinBorrar] = useState(false);

  async function compartirRegistro() {
    const texto = textoRegistro(estado);
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
      } else {
        // Hoja de compartir del sistema: trae "Copiar" y también WhatsApp, correo, etc.
        await Share.share({ message: texto });
      }
    } catch {
      servicio.registrar('No se pudo copiar el registro.', 'error');
    }
  }

  return (
    <Pantalla style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={onVolver} accessibilityRole="button" accessibilityLabel="Volver" style={{ width: 48, height: 48, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icono nombre="volver" color={c.texto} />
        </Pressable>
        <T v="titulo">Herramientas del equipo</T>
      </View>

      <Grupo>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <View style={{ flex: 1 }}>
            <T v="cuerpo15">Modo demo</T>
            <T v="apoyo13" suave>
              La huida corriendo cuenta (para la demo sin moto). Decirlo en el pitch.
            </T>
          </View>
          <Switch value={estado.modoDemo} onValueChange={(v) => servicio.cambiarModoDemo(v)} />
        </View>
        {estado.modoDemo && (
          <View style={{ gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
            <T v="apoyo13" suave>
              ¿Dónde es la demo?
            </T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(Object.keys(ESPACIOS_DEMO) as EspacioDemo[]).map((x) => (
                <Chip key={x} texto={ESPACIOS_DEMO[x].titulo} activo={estado.espacioDemo === x} onPress={() => servicio.cambiarEspacioDemo(x)} />
              ))}
            </View>
            <T v="apoyo13" suave>
              {ESPACIOS_DEMO[estado.espacioDemo].detalle}
            </T>
            {estado.espacioDemo !== 'sin_gps' && (
              <SelectorDistancia valor={estado.distanciaDemoM} onCambiar={(m) => servicio.cambiarDistanciaDemo(m)} />
            )}
          </View>
        )}
      </Grupo>

      <Rotulo>EN VIVO</Rotulo>
      <Lecturas
        celdas={[
          { rotulo: 'ESTADO', valor: tel ? tel.estado.replace('_', ' ') : 'apagado' },
          { rotulo: 'ACELERACIÓN', valor: tel ? tel.aceleracionLinealG.toFixed(2) : '—', unidad: 'g' },
          { rotulo: 'GIRO', valor: tel?.giroRadS != null ? tel.giroRadS.toFixed(1) : '—', unidad: 'rad/s' },
        ]}
      />
      <T v="apoyo13" suave>
        Panel: {hayBackend() ? 'configurado' : 'no configurado (EXPO_PUBLIC_URL_ALERTAS)'} · Giroscopio: {estado.tieneGiroscopio === false ? 'no' : estado.tieneGiroscopio ? 'sí' : '—'}
      </T>

      <Rotulo>CAPTURA DE SENSORES (CSV)</Rotulo>
      <T v="apoyo" suave>
        Para ajustar el detector, no es evidencia. Elige qué vas a hacer, captura y comparte el CSV al equipo (packages/detector/datos/grabaciones).
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {ETIQUETAS.map((x) => (
          <Chip key={x} texto={x} activo={etiqueta === x} onPress={() => !estado.grabando && setEtiqueta(x)} />
        ))}
      </View>
      <Boton
        texto={!estado.activa ? 'Activa la protección para capturar' : estado.grabando ? `Detener y exportar (${estado.filasGrabadas} filas)` : `Capturar "${etiqueta}"`}
        variante="secundario"
        principal={false}
        icono="movimiento"
        deshabilitado={!estado.activa}
        onPress={estado.grabando ? () => void servicio.detenerGrabacion() : () => servicio.empezarGrabacion(etiqueta)}
      />

      <Rotulo>ENSAYAR LA ALERTA COMPLETA</Rotulo>
      <T v="apoyo" suave>
        En 5 s dispara una alerta de verdad con un arrebato simulado: bloquea el celular (en iPhone tapa las demás apps), pregunta "¿Todo bien?" y avisa a tu red si no cancelas con tu PIN. Sal a otra app o apaga la pantalla para probarlo.
      </T>
      <Boton
        texto={!estado.activa ? 'Activa la protección para ensayar' : 'Ensayar en 5 s'}
        variante="secundario"
        principal={false}
        deshabilitado={!estado.activa || Boolean(estado.alerta)}
        onPress={() => {
          // Se revisa en el momento: si falta algo, se dice ANTES de ensayar (en el Samsung no se bloqueó por esto).
          const bloqueo = consultarBloqueo();
          const falta = faltaParaBloqueo(bloqueo, preferencias().numeroPropio);
          Alert.alert(
            'Ensayar la alerta completa',
            falta
              ? Platform.OS === 'ios'
                ? `Ojo: ${falta} Así el iPhone NO se bloqueará solo: verás la notificación y se avisará a tu red si no cancelas. Arréglalo en Tú › Bloqueo antirrobo.`
                : `Ojo: ${falta} Así el celular NO se bloqueará: solo verás la notificación y se avisará a tu red si no cancelas. Arréglalo en Tú › Bloqueo antirrobo.`
              : bloqueo.disponible
                ? Platform.OS === 'ios'
                  ? 'Es una alerta real: tapa las demás apps del iPhone (al cancelar con tu PIN vuelven) y, si no cancelas con tu PIN a tiempo, avisa a tu red.'
                  : 'Es una alerta real: bloquea el celular y, si no cancelas con tu PIN a tiempo, avisa a tu red.'
                : 'Es una alerta real: este celular no se puede bloquear desde la app, pero verás el "¿Todo bien?" y, si no cancelas con tu PIN a tiempo, se avisará a tu red.',
            [
              { text: 'Cancelar', style: 'cancel' },
              falta ? { text: 'Ir a arreglarlo', onPress: onVolver } : { text: 'Ensayar', onPress: () => servicio.ensayarAlertaCompleta(5) },
            ],
          );
        }}
      />

      <Rotulo>SIMULAR (SIN MOVERSE)</Rotulo>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {ESCENARIOS_APP.map((x) => (
          <Chip key={x.nombre} texto={x.titulo} activo={false} onPress={() => setSimulacion(correrSimulacion(x.nombre, x.titulo, servicio.configDetector()))} />
        ))}
      </View>
      {simulacion && (
        <Tarjeta style={{ gap: 4 }}>
          <T v="cuerpo15Fuerte">
            {simulacion.titulo}: {simulacion.hayAlerta ? 'alerta' : 'sin alerta'} ({simulacion.duracionS.toFixed(0)} s simulados)
          </T>
          {simulacion.eventos.length === 0 && (
            <T v="apoyo" suave>
              Sin eventos.
            </T>
          )}
          {simulacion.eventos.map(({ segundo, evento }, i) => (
            <T key={i} v="apoyo13" suave>
              {segundo.toFixed(1)} s · {describirEvento(evento)}
            </T>
          ))}
        </Tarjeta>
      )}

      <Rotulo>REGISTRO</Rotulo>
      <Tarjeta style={{ gap: 4 }}>
        {estado.registros.length === 0 && (
          <T v="apoyo" suave>
            Aún no hay eventos.
          </T>
        )}
        {estado.registros.map((r) => (
          <T key={r.id} v="apoyo13" color={r.tipo === 'alerta' || r.tipo === 'error' ? c.alerta : r.tipo === 'aviso' ? c.aviso : c.textoSuave}>
            {hora(r.t, true)} · {r.texto}
          </T>
        ))}
      </Tarjeta>
      <Boton
        texto={copiado ? 'Copiado' : 'Copiar registro'}
        variante="secundario"
        principal={false}
        icono="compartir"
        onPress={() => void compartirRegistro()}
      />

      <Rotulo>PROBAR LA BIENVENIDA</Rotulo>
      <T v="apoyo" suave>
        Borra tu nombre, tu red, el PIN y lo de bloqueo, apaga la protección y vuelve a la bienvenida, como recién instalada. Los permisos del celular siguen dados (para quitarlos, borra la app).
      </T>
      <Boton
        texto="Borrar todo y ver la bienvenida"
        variante="secundario"
        principal={false}
        onPress={() => setPedirPinBorrar(true)}
      />
      <PedirPin
        visible={pedirPinBorrar}
        titulo="Borrar todo"
        explicacion="Escribe tu PIN. Se borra todo lo que configuraste y la app vuelve a la bienvenida."
        textoConfirmar="Borrar todo"
        alConfirmar={(pin) => servicio.borrarTodo(pin)}
        alCerrar={() => setPedirPinBorrar(false)}
      />
    </Pantalla>
  );
}

/**
 * El registro como texto para pegarlo en el chat del equipo. Arriba van los datos del celular y del estado,
 * para saber de un vistazo si faltó un permiso, si está en Expo Go o si el modo demo estaba apagado.
 */
function textoRegistro(estado: EstadoProteccion): string {
  const sino = (v: boolean | null) => (v === null ? '—' : v ? 'sí' : 'no');
  const constantes = Platform.constants as { Brand?: string; Model?: string };
  const celular = Platform.OS === 'android' ? `${constantes.Brand ?? ''} ${constantes.Model ?? ''}`.trim() : Platform.OS;
  const diag = diagnosticoSensores();
  const tel = estado.telemetria;
  const lineas = [
    'Alerta Arrebato · registro',
    `Celular: ${celular} (${Platform.OS} ${Platform.Version})`,
    `Protección: ${estado.activa ? 'activa' : 'apagada'} · Modo demo: ${estado.modoDemo ? `sí (${ESPACIOS_DEMO[estado.espacioDemo].titulo})` : 'no'} · Segundo plano: ${sino(estado.segundoPlano)}`,
    `Giroscopio: ${sino(estado.tieneGiroscopio)} · GPS: ${sino(estado.tieneGps)} · Permisos que faltan: ${estado.permisosFaltantes.length ? estado.permisosFaltantes.join(', ') : 'ninguno'}`,
    diag
      ? `Sensores: ${diag.muestras} muestras, última hace ${diag.msDesdeUltimaMuestra} ms, ${diag.reinicios} reinicios, wake lock ${sino(diag.wakeLock)}`
      : 'Sensores: sin módulo nativo (Expo Go o web)',
    tel ? `Ahora: ${tel.estado} · ${tel.aceleracionLinealG.toFixed(2)} g · giro ${tel.giroRadS?.toFixed(1) ?? '—'} rad/s` : 'Ahora: —',
    '',
    // En pantalla el más nuevo va arriba; para leerlo como historia, del más viejo al más nuevo.
    ...[...estado.registros].reverse().map((r) => `${hora(r.t, true)} [${r.tipo}] ${r.texto}`),
  ];
  return lineas.join('\n');
}

/**
 * Cuántos metros hay que correr en la demo: barra que se toca o arrastra, más botones de 1 m.
 * Hecha con View (sin librería nativa de slider). Solo avisa al soltar, para no reiniciar el detector
 * con cada movimiento del dedo.
 */
function SelectorDistancia({ valor, onCambiar }: { valor: number; onCambiar: (m: number) => void }) {
  const c = useTema();
  const [ancho, setAncho] = useState(0);
  const [arrastre, setArrastre] = useState<number | null>(null);
  const { min, max } = DISTANCIA_DEMO_M;
  const mostrado = arrastre ?? valor;
  const fraccion = (mostrado - min) / (max - min);
  const limitar = (m: number) => Math.min(max, Math.max(min, Math.round(m)));
  const desdeX = (x: number) => limitar(min + (ancho > 0 ? x / ancho : 0) * (max - min));
  const soltar = (m: number) => {
    setArrastre(null);
    onCambiar(m);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <T v="apoyo13" suave>
          Distancia de huida
        </T>
        <T v="cuerpo15Fuerte">{mostrado} m</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={() => soltar(limitar(valor - 1))} accessibilityRole="button" accessibilityLabel="Un metro menos" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.superficie2 }}>
          <T v="cuerpo15Fuerte">−</T>
        </Pressable>
        <View
          style={{ flex: 1, height: 44, justifyContent: 'center' }}
          onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => setArrastre(desdeX(e.nativeEvent.locationX))}
          onResponderMove={(e) => setArrastre(desdeX(e.nativeEvent.locationX))}
          onResponderRelease={(e) => soltar(desdeX(e.nativeEvent.locationX))}
          accessibilityRole="adjustable"
          accessibilityLabel="Distancia de huida"
          accessibilityValue={{ min, max, now: mostrado, text: `${mostrado} metros` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => soltar(limitar(valor + (e.nativeEvent.actionName === 'increment' ? 1 : -1)))}
        >
          <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: c.superficie2 }}>
            <View style={{ width: `${fraccion * 100}%`, height: 6, borderRadius: 3, backgroundColor: c.texto }} />
          </View>
          <View
            pointerEvents="none"
            style={{ position: 'absolute', left: Math.max(0, fraccion * ancho - 12), width: 24, height: 24, borderRadius: 12, backgroundColor: c.texto }}
          />
        </View>
        <Pressable onPress={() => soltar(limitar(valor + 1))} accessibilityRole="button" accessibilityLabel="Un metro más" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.superficie2 }}>
          <T v="cuerpo15Fuerte">+</T>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 54 }}>
        <T v="apoyo13" suave>
          {min} m
        </T>
        <T v="apoyo13" suave>
          {max} m
        </T>
      </View>
      <T v="apoyo13" suave>
        Hay que recorrerla a 1,5–2 m/s (trote). Menos de 25 m: no se exige que supere el error del GPS, así que salen más falsas alarmas.
      </T>
    </View>
  );
}
