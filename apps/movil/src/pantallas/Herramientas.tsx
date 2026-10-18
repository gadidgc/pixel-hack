import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { hayBackend } from '../alertas';
import { ETIQUETAS, type Etiqueta } from '../grabadora';
import { correrSimulacion, ESCENARIOS_APP, type ResultadoSimulacion } from '../simulacion';
import { describirEvento, useProteccion } from '../useProteccion';
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

      <Rotulo>SIMULAR (SIN MOVERSE)</Rotulo>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {ESCENARIOS_APP.map((x) => (
          <Chip key={x.nombre} texto={x.titulo} activo={false} onPress={() => setSimulacion(correrSimulacion(x.nombre, x.titulo, estado.modoDemo))} />
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
    </Pantalla>
  );
}
