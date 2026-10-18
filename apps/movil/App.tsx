import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { hayBackend } from './src/alertas';
import { ETIQUETAS, type Etiqueta } from './src/grabadora';
import { correrSimulacion, ESCENARIOS_APP, type ResultadoSimulacion } from './src/simulacion';
import { describirEvento, useProteccion } from './src/useProteccion';

/**
 * Pantalla única y simple: la UI se mejora después (docs/PLAN.md §7).
 * Lo importante aquí es que el detector corra con los sensores reales y se pueda probar.
 */
export default function App() {
  const p = useProteccion();
  const { estado } = p;
  const [etiqueta, setEtiqueta] = useState<Etiqueta>('caminar');
  const [simulacion, setSimulacion] = useState<ResultadoSimulacion | null>(null);
  const tel = estado.telemetria;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={e.pantalla}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={e.contenido}>
          <Text style={e.titulo}>Alerta Arrebato</Text>
          <Text style={e.subtitulo}>Detecta cuando te arranchan el celular desde una moto y avisa al instante.</Text>

          {estado.ultimaAlerta && (
            <View style={e.alerta} accessibilityRole="alert">
              <Text style={e.alertaTitulo}>🚨 ¡Alerta enviada!</Text>
              <Text style={e.alertaTexto}>{describirEvento(estado.ultimaAlerta)}</Text>
              <Pressable style={e.botonBlanco} onPress={p.cancelarAlerta}>
                <Text style={e.botonBlancoTexto}>Fue falsa alarma: cancelar</Text>
              </Pressable>
            </View>
          )}

          <Pressable
            style={[e.boton, estado.activa ? e.botonApagar : e.botonPrender]}
            onPress={estado.activa ? p.desactivar : p.activar}
          >
            <Text style={e.botonTexto}>{estado.activa ? 'Desactivar protección' : 'Activar protección'}</Text>
          </Pressable>

          <View style={e.fila}>
            <Text style={e.etiqueta}>Modo demo (la huida corriendo cuenta)</Text>
            <Switch value={estado.modoDemo} onValueChange={p.cambiarModoDemo} />
          </View>

          <View style={e.tarjeta}>
            <Text style={e.tarjetaTitulo}>En vivo</Text>
            <Dato nombre="Estado" valor={tel ? tel.estado.replace('_', ' ') : 'apagado'} />
            <Dato nombre="Aceleración (sin gravedad)" valor={tel ? `${tel.aceleracionLinealG.toFixed(2)} g` : '—'} />
            <Dato nombre="Giro" valor={tel?.giroRadS != null ? `${tel.giroRadS.toFixed(1)} rad/s` : estado.tieneGiroscopio === false ? 'sin giroscopio' : '—'} />
            <Dato nombre="Velocidad GPS" valor={tel?.velocidadMs != null ? `${(tel.velocidadMs * 3.6).toFixed(0)} km/h` : estado.tieneGps === false ? 'sin GPS' : '—'} />
            <Dato nombre="Precisión GPS" valor={tel?.precisionGpsM != null ? `${tel.precisionGpsM.toFixed(0)} m` : '—'} />
            <Dato nombre="Backend de alertas" valor={hayBackend() ? 'configurado' : 'solo local'} />
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
              onPress={estado.grabando ? p.detenerGrabacion : () => p.empezarGrabacion(etiqueta)}
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
  botonChico: { backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  deshabilitado: { backgroundColor: '#9aa4b0' },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  etiqueta: { fontSize: 15, color: '#222', flex: 1 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 12, padding: 14, gap: 6, borderWidth: 1, borderColor: '#e3e6ea' },
  tarjetaTitulo: { fontSize: 17, fontWeight: '700', color: '#111', marginBottom: 2 },
  ayuda: { fontSize: 13, color: '#555' },
  dato: { flexDirection: 'row', justifyContent: 'space-between' },
  datoNombre: { fontSize: 14, color: '#555' },
  datoValor: { fontSize: 14, color: '#111', fontWeight: '600', fontVariant: ['tabular-nums'] },
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
