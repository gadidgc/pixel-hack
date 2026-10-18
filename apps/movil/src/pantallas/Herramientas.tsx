import { useState } from 'react';
import { Alert, Platform, Pressable, Share, Switch, View } from 'react-native';
import { hayBackend } from '../alertas';
import { consultarBloqueo, faltaParaBloqueo } from '../bloqueo';
import { textoEstadoLlave } from '../componentes/ConfiguracionLlave';
import { diagnosticoSensores } from '../sensores';
import type { EstadoProteccion } from '../servicio';
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
  const [copiado, setCopiado] = useState(false);

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

      {estado.llave && (
        <>
          <Rotulo>LLAVE EN VIVO (ROBO SILENCIOSO)</Rotulo>
          <Lecturas
            celdas={[
              { rotulo: 'ESTADO', valor: estado.llave.modo === 'vigilando' ? (estado.llave.telemetria?.estado ?? '—') : estado.llave.modo.replace('_', ' ') },
              { rotulo: 'DISTANCIA', valor: estado.llave.telemetria?.distanciaM != null ? estado.llave.telemetria.distanciaM.toFixed(1) : '—', unidad: 'm' },
              { rotulo: 'SEÑAL', valor: estado.llave.telemetria?.rssi != null ? estado.llave.telemetria.rssi.toFixed(0) : '—', unidad: 'dBm' },
            ]}
          />
          <T v="apoyo13" suave>
            {`${textoEstadoLlave(estado.llave, estado.activa)} Alerta a más de ${estado.llave.distanciaMaxM} m (${estado.modoDemo ? 'modo demo' : 'modo normal'}).`}
          </T>
        </>
      )}

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
        En 5 s dispara una alerta de verdad con un arrebato simulado: bloquea el celular, pregunta "¿Todo bien?" sobre la pantalla de bloqueo y avisa a tu red si no cancelas con tu PIN. Sal a otra app o apaga la pantalla para probarlo.
      </T>
      <Boton
        texto={!estado.activa ? 'Activa la protección para ensayar' : 'Ensayar en 5 s'}
        variante="secundario"
        principal={false}
        deshabilitado={!estado.activa || Boolean(estado.alerta)}
        onPress={() => {
          // Se revisa en el momento: si falta algo, se dice ANTES de ensayar (en el Samsung no se bloqueó por esto).
          const bloqueo = consultarBloqueo();
          const falta = faltaParaBloqueo(bloqueo);
          Alert.alert(
            'Ensayar la alerta completa',
            falta
              ? `Ojo: ${falta} Así el celular NO se bloqueará: solo verás la notificación y se avisará a tu red si no cancelas. Arréglalo en Tú › Bloqueo antirrobo.`
              : bloqueo.disponible
                ? 'Es una alerta real: bloquea el celular y, si no cancelas con tu PIN a tiempo, avisa a tu red.'
                : 'Es una alerta real: este celular no se puede bloquear desde la app (iPhone o web), pero verás el "¿Todo bien?" y, si no cancelas con tu PIN a tiempo, se avisará a tu red.',
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
      <Boton
        texto={copiado ? 'Copiado' : 'Copiar registro'}
        variante="secundario"
        principal={false}
        icono="compartir"
        onPress={() => void compartirRegistro()}
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
    `Protección: ${estado.activa ? 'activa' : 'apagada'} · Modo demo: ${sino(estado.modoDemo)} · Segundo plano: ${sino(estado.segundoPlano)}`,
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
