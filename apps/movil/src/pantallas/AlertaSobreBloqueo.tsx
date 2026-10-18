import { useEffect, useState } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pinValido } from '../pin';
import { useProteccion } from '../useProteccion';
import { T } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { FUENTES, RADIO, useTema } from '../ui/tema';

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'borrar'] as const;

/**
 * "¿Todo bien?" ENCIMA de la pantalla de bloqueo de Android (como un despertador). Es lo único que se ve
 * con el celular bloqueado: sin pestañas ni ajustes, para que el ladrón no pueda apagar nada desde aquí.
 * - La dueña (falsa alarma) escribe el PIN de la app y listo: no tiene que desbloquear Android antes.
 * - El ladrón ve una pregunta neutra y un teclado que no le sirve; Android sigue bloqueado detrás.
 * Teclado propio: el teclado del sistema puede no abrirse sobre la pantalla de bloqueo.
 */
export function AlertaSobreBloqueo() {
  const c = useTema();
  const ins = useSafeAreaInsets();
  const { estado, servicio } = useProteccion();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const alerta = estado.alerta;
  // "Atrás" no cierra la pregunta: sin ella, la dueña tendría que desbloquear Android para cancelar
  // (el botón de inicio ya no hace nada sobre la pantalla de bloqueo). Lo comprobamos en el emulador.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);
  if (!alerta) return null;

  const esperando = alerta.familia === 'esperando';
  const s = alerta.segundosParaFamilia;

  const confirmar = async (valor: string) => {
    if (!pinValido(valor)) return setError('El PIN tiene de 4 a 6 números.');
    setOcupado(true);
    const ok = await servicio.cancelarAlerta(valor).catch(() => false);
    setOcupado(false);
    setPin('');
    if (!ok) setError(servicio.mensajePin() ?? 'PIN incorrecto.');
  };

  const tocar = (tecla: (typeof TECLAS)[number]) => {
    if (ocupado || !tecla) return;
    setError('');
    if (tecla === 'borrar') return setPin((p) => p.slice(0, -1));
    setPin((p) => (p.length < 6 ? p + tecla : p));
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo, paddingTop: ins.top + 16, paddingBottom: Math.max(ins.bottom, 32) + 16, paddingHorizontal: 24, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: c.protegidoFondo, alignItems: 'center', justifyContent: 'center' }}>
          <Icono nombre="escudo" tam={14} color={c.protegido} grosor={2.4} />
        </View>
        <T v="apoyo13" suave style={{ flex: 1 }}>
          Vigía
        </T>
        {esperando && (
          <T v="hora" suave>
            avisaremos en 0:{String(s).padStart(2, '0')}
          </T>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <T v="titulo26" accessibilityRole="header">
          ¿Todo bien?
        </T>
        <T v="cuerpo15" suave>
          {esperando
            ? 'Notamos un movimiento brusco y luego velocidad. Si fue tuyo, escribe tu PIN de Vigía y no avisaremos a nadie.'
            : 'Ya avisamos a tu red. Si estás bien, escribe tu PIN de Vigía y les diremos que fue una falsa alarma.'}
        </T>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14, minHeight: 20 }} accessibilityLabel={`${pin.length} números escritos`}>
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: i < pin.length ? c.texto : c.superficie2 }} />
        ))}
      </View>
      <View accessibilityLiveRegion="assertive">
        <T v="apoyo" color={c.alerta} style={{ textAlign: 'center', minHeight: 20 }}>
          {error}
        </T>
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: 10, columnGap: 18, maxWidth: 320, alignSelf: 'center' }}>
        {TECLAS.map((tecla, i) =>
          tecla === '' ? (
            <View key={i} style={{ width: 76, height: 56 }} />
          ) : (
            <Pressable
              key={i}
              onPress={() => tocar(tecla)}
              accessibilityRole="button"
              accessibilityLabel={tecla === 'borrar' ? 'Borrar' : tecla}
              style={({ pressed }) => ({ width: 76, height: 56, borderRadius: RADIO.total, backgroundColor: pressed ? c.superficie2 : c.superficie, alignItems: 'center', justifyContent: 'center' })}
            >
              {tecla === 'borrar' ? <T v="cuerpo15Fuerte">Borrar</T> : <T style={{ fontFamily: FUENTES.datosMedio, fontSize: 26, color: c.texto }}>{tecla}</T>}
            </Pressable>
          ),
        )}
      </View>
      <Pressable
        onPress={() => void confirmar(pin)}
        disabled={ocupado || pin.length < 4}
        accessibilityRole="button"
        style={{ minHeight: 56, borderRadius: RADIO.total, backgroundColor: pin.length >= 4 ? c.protegido : c.superficie2, alignItems: 'center', justifyContent: 'center' }}
      >
        <T v="cuerpo15Fuerte" color={pin.length >= 4 ? c.sobreProtegido : c.textoSuave}>
          {ocupado ? 'Comprobando…' : 'Estoy bien'}
        </T>
      </Pressable>
      <T v="apoyo13" suave style={{ textAlign: 'center' }}>
        Tu celular sigue bloqueado. Después usa tu clave de Android para entrar.
      </T>
    </View>
  );
}
