import { StatusBar } from 'expo-status-bar';
import * as IntentLauncher from 'expo-intent-launcher';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { hayBackend } from './src/alertas';
import { PedirPin } from './src/componentes/PedirPin';
import { ETIQUETAS, type Etiqueta } from './src/grabadora';
import { guardarPin, hayPin } from './src/pin';
import { correrSimulacion, ESCENARIOS_APP, type ResultadoSimulacion } from './src/simulacion';
import { describirEvento, useProteccion, type EstadoProteccion } from './src/useProteccion';

type PedidoPin = null | 'crear' | 'desactivar' | 'cancelar';

/** Texto honesto de dónde está la alerta: nunca decimos "enviada" si no salió del celular. */
function estadoDeLaAlerta(a: NonNullable<EstadoProteccion['alerta']>): string[] {
  const panel = a.panel === null ? 'Panel: enviando…' : a.panel.enviado ? 'Panel: recibida ✓' : `Panel: NO enviada (${a.panel.detalle})`;
  const familia =
    a.familia === 'esperando'
      ? `Familia: se avisa en ${a.segundosParaFamilia} s si no cancelas con tu PIN`
      : a.familia === 'enviando'
        ? 'Familia: avisando…'
        : a.familia === 'avisada'
          ? 'Familia: avisada ✓'
          : a.familia === 'no_avisada'
            ? `Familia: NO avisada (${a.detalleFamilia})`
            : 'Familia: cancelada';
  return [panel, familia];
}

/**
 * Pantalla única y simple: la UI se mejora después (docs/PLAN.md §7).
 * Toda la lógica vive en el servicio de protección (src/servicio.ts), que sigue en segundo plano.
 */
export default function App() {
  const { estado, servicio } = useProteccion();
  const [etiqueta, setEtiqueta] = useState<Etiqueta>('caminar');
  const [simulacion, setSimulacion] = useState<ResultadoSimulacion | null>(null);
  const [pedido, setPedido] = useState<PedidoPin>(null);
  const [tienePin, setTienePin] = useState<boolean | null>(null);
  const tel = estado.telemetria;

  useEffect(() => {
    void hayPin().then(setTienePin);
  }, []);

  const activar = () => {
    if (!tienePin) setPedido('crear');
    else void servicio.activar();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={e.pantalla}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={e.contenido}>
          <Text style={e.titulo}>Alerta Arrebato</Text>
          <Text style={e.subtitulo}>Detecta cuando te arranchan el celular desde una moto y avisa al instante.</Text>

          {estado.alerta && (
            <View style={e.alerta} accessibilityRole="alert">
              <Text style={e.alertaTitulo}>🚨 Posible robo detectado</Text>
              <Text style={e.alertaTexto}>{describirEvento(estado.alerta.evento)}</Text>
              {estadoDeLaAlerta(estado.alerta).map((linea) => (
                <Text key={linea} style={e.alertaTexto}>
                  {linea}
                </Text>
              ))}
              <Pressable style={e.botonBlanco} onPress={() => setPedido('cancelar')}>
                <Text style={e.botonBlancoTexto}>Fue falsa alarma: cancelar con PIN</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[e.boton, estado.activa ? e.botonApagar : e.botonPrender]}
            onPress={estado.activa ? () => setPedido('desactivar') : activar}
          >
            <Text style={e.botonTexto}>{estado.activa ? 'Desactivar protección (PIN)' : 'Activar protección'}</Text>
          </Pressable>
          {!estado.activa && (
            <Text style={e.ayuda}>
              Te pediremos: movimiento, ubicación "Permitir siempre" y un PIN. Son obligatorios: sin ellos la protección se
              apagaría al usar otra app o al bloquear la pantalla.
            </Text>
          )}

          {Platform.OS === 'android' && (
            <Pressable
              style={e.botonSecundario}
              onPress={() => void IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS)}
            >
              <Text style={e.botonSecundarioTexto}>Quitar la optimización de batería (Xiaomi, Samsung…)</Text>
            </Pressable>
          )}

          <View style={e.fila}>
            <Text style={e.etiqueta}>Modo demo (la huida corriendo cuenta)</Text>
            <Switch value={estado.modoDemo} onValueChange={(v) => servicio.cambiarModoDemo(v)} />
          </View>

          <View style={e.tarjeta}>
            <Text style={e.tarjetaTitulo}>En vivo</Text>
            <Dato nombre="Estado" valor={tel ? tel.estado.replace('_', ' ') : 'apagado'} />
            <Dato
              nombre="Con la pantalla apagada"
              valor={estado.segundoPlano === null ? '—' : estado.segundoPlano ? 'sí, sigue protegiendo' : 'NO (solo con la app abierta)'}
            />
            <Dato nombre="Aceleración (sin gravedad)" valor={tel ? `${tel.aceleracionLinealG.toFixed(2)} g` : '—'} />
            <Dato nombre="Giro" valor={tel?.giroRadS != null ? `${tel.giroRadS.toFixed(1)} rad/s` : estado.tieneGiroscopio === false ? 'sin giroscopio' : '—'} />
            <Dato nombre="Velocidad GPS" valor={tel?.velocidadMs != null ? `${(tel.velocidadMs * 3.6).toFixed(0)} km/h` : '—'} />
            <Dato nombre="Precisión GPS" valor={tel?.precisionGpsM != null ? `${tel.precisionGpsM.toFixed(0)} m` : '—'} />
            <Dato nombre="Backend de alertas" valor={hayBackend() ? 'configurado' : 'NO configurado: las alertas no salen del celular'} />
          </View>

          <View style={e.tarjeta}>
            <Text style={e.tarjetaTitulo}>Grabar datos reales</Text>
            <Text style={e.ayuda}>Elige qué vas a hacer, graba y comparte el CSV al equipo (packages/detector/datos/grabaciones).</Text>
            <View style={e.chips}>
              {ETIQUETAS.map((x) => (
                <Pressable key={x} onPress={() => setEtiqueta(x)} disabled={estado.grabando} style={[e.chip, etiqueta === x && e.chipActivo]}>
                  <Text style={[e.chipTexto, etiqueta === x && e.chipTextoActivo]}>{x}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[e.botonChico, !estado.activa && e.deshabilitado]}
              disabled={!estado.activa}
              onPress={estado.grabando ? () => void servicio.detenerGrabacion() : () => servicio.empezarGrabacion(etiqueta)}
            >
              <Text style={e.botonTexto}>
                {!estado.activa ? 'Activa la protección para grabar' : estado.grabando ? `Detener y exportar (${estado.filasGrabadas} filas)` : `Grabar "${etiqueta}"`}
              </Text>
            </Pressable>
          </View>

          <View style={e.tarjeta}>
            <Text style={e.tarjetaTitulo}>Simular (sin moverse)</Text>
            <Text style={e.ayuda}>Genera la señal de un caso con el simulador y la pasa por el mismo detector.</Text>
            <View style={e.chips}>
              {ESCENARIOS_APP.map((x) => (
                <Pressable key={x.nombre} style={e.chip} onPress={() => setSimulacion(correrSimulacion(x.nombre, x.titulo, estado.modoDemo))}>
                  <Text style={e.chipTexto}>{x.titulo}</Text>
                </Pressable>
              ))}
            </View>
            {simulacion && (
              <View style={e.resultado}>
                <Text style={e.resultadoTitulo}>
                  {simulacion.titulo}: {simulacion.hayAlerta ? '🚨 alerta' : '✅ sin alerta'} ({simulacion.duracionS.toFixed(0)} s simulados)
                </Text>
                {simulacion.eventos.length === 0 && <Text style={e.registro}>Sin eventos.</Text>}
                {simulacion.eventos.map(({ segundo, evento }, i) => (
                  <Text key={i} style={e.registro}>
                    {segundo.toFixed(1)} s · {describirEvento(evento)}
                  </Text>
                ))}
              </View>
            )}
          </View>

          <View style={e.tarjeta}>
            <Text style={e.tarjetaTitulo}>Registro</Text>
            {estado.registros.length === 0 && <Text style={e.ayuda}>Aún no hay eventos.</Text>}
            {estado.registros.map((r) => (
              <Text key={r.id} style={[e.registro, r.tipo === 'alerta' && e.rojo, r.tipo === 'error' && e.rojo, r.tipo === 'aviso' && e.ambar]}>
                {new Date(r.t).toLocaleTimeString()} · {r.texto}
              </Text>
            ))}
          </View>
        </ScrollView>
        <PedirPin
          visible={pedido === 'crear'}
          crear
          titulo="Crea tu PIN"
          explicacion="Lo necesitarás para cancelar una falsa alarma o apagar la protección. Así, quien te robe el celular no puede hacerlo."
          alConfirmar={async (pin) => {
            await guardarPin(pin);
            setTienePin(true);
            void servicio.activar();
            return true;
          }}
          alCerrar={() => setPedido(null)}
        />
        <PedirPin
          visible={pedido === 'desactivar'}
          titulo="Apagar la protección"
          explicacion="Escribe tu PIN."
          alConfirmar={(pin) => servicio.desactivar(pin)}
          alCerrar={() => setPedido(null)}
        />
        <PedirPin
          visible={pedido === 'cancelar'}
          titulo="¿Fue una falsa alarma?"
          explicacion="Escribe tu PIN para cancelar la alerta. Si tu familia ya fue avisada, le diremos que fue falsa alarma."
          alConfirmar={(pin) => servicio.cancelarAlerta(pin)}
          alCerrar={() => setPedido(null)}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <View style={e.dato}>
      <Text style={e.datoNombre}>{nombre}</Text>
      <Text style={e.datoValor}>{valor}</Text>
    </View>
  );
}

const e = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#f6f7f9' },
  contenido: { padding: 16, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  titulo: { fontSize: 28, fontWeight: '700', color: '#111', marginTop: 12 },
  subtitulo: { fontSize: 15, color: '#444' },
  alerta: { backgroundColor: '#c62828', borderRadius: 12, padding: 16, gap: 8 },
  alertaTitulo: { color: '#fff', fontSize: 22, fontWeight: '700' },
  alertaTexto: { color: '#fff', fontSize: 15 },
  boton: { borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  botonPrender: { backgroundColor: '#1b5e20' },
  botonApagar: { backgroundColor: '#555' },
  botonTexto: { color: '#fff', fontSize: 17, fontWeight: '600' },
  botonBlanco: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botonBlancoTexto: { color: '#c62828', fontWeight: '700', fontSize: 16 },
  botonSecundario: { borderWidth: 1, borderColor: '#1565c0', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  botonSecundarioTexto: { color: '#1565c0', fontWeight: '600', fontSize: 14 },
  botonChico: { backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  deshabilitado: { backgroundColor: '#9aa4b0' },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  etiqueta: { fontSize: 15, color: '#222', flex: 1 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 6, borderWidth: 1, borderColor: '#e3e6ea' },
  tarjetaTitulo: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 2 },
  ayuda: { fontSize: 13, color: '#555' },
  dato: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  datoNombre: { fontSize: 14, color: '#555', flexShrink: 0 },
  datoValor: { fontSize: 14, color: '#111', fontWeight: '600', fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: '#c5ccd4', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  chipActivo: { backgroundColor: '#1565c0', borderColor: '#1565c0' },
  chipTexto: { fontSize: 13, color: '#222' },
  chipTextoActivo: { color: '#fff' },
  resultado: { marginTop: 6, gap: 2 },
  resultadoTitulo: { fontWeight: '700', fontSize: 14, color: '#111' },
  registro: { fontSize: 13, color: '#333', fontVariant: ['tabular-nums'] },
  rojo: { color: '#c62828', fontWeight: '600' },
  ambar: { color: '#a15c00' },
});
