import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PedirPin } from '../componentes/PedirPin';
import { preferencias } from '../preferencias';
import { useProteccion } from '../useProteccion';
import { T, useReducirMovimiento } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { RADIO, TIPO, useTema } from '../ui/tema';

/**
 * F4 · "¿Todo bien?" (components/AvisoDiscreto). Aparece arriba como una notificación normal, sin rojo
 * ni sirenas: si el celular lo tiene el ladrón, no le dice nada; si lo tiene la dueña, lo responde en un
 * segundo. "Estoy bien" pide el PIN. Muestra cuánto falta para avisar, sin cuenta regresiva grande.
 */
export function TodoBien({ onVer }: { onVer: () => void }) {
  const c = useTema();
  const ins = useSafeAreaInsets();
  const { estado, servicio } = useProteccion();
  const [pin, setPin] = useState(false);
  const reducir = useReducirMovimiento();
  const barra = useRef(new Animated.Value(1)).current;
  const alerta = estado.alerta;
  const espera = preferencias().esperaFamiliaS;

  useEffect(() => {
    if (!alerta || alerta.familia !== 'esperando' || reducir) return;
    barra.setValue(Math.min(1, alerta.segundosParaFamilia / espera));
    const anim = Animated.timing(barra, { toValue: 0, duration: alerta.segundosParaFamilia * 1000, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' });
    anim.start();
    return () => anim.stop();
    // Solo al aparecer: la barra se vacía sola.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerta?.evento]);

  if (!alerta || alerta.familia !== 'esperando') return null;
  const s = alerta.segundosParaFamilia;

  return (
    <View style={{ position: 'absolute', left: 10, right: 10, top: ins.top + 8, zIndex: 20 }} accessibilityLiveRegion="polite">
      <View style={{ maxWidth: 520, width: '100%', alignSelf: 'center', gap: 12, padding: 16, backgroundColor: c.superficie, borderRadius: RADIO.m, borderTopWidth: 1, borderTopColor: c.brillo, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: c.protegidoFondo, alignItems: 'center', justifyContent: 'center' }}>
            <Icono nombre="escudo" tam={14} color={c.protegido} grosor={2.4} />
          </View>
          <T v="apoyo13" suave style={{ flex: 1 }}>
            Alerta Arrebato · ahora
          </T>
          <T v="hora" suave>
            avisaremos en 0:{String(s).padStart(2, '0')}
          </T>
        </View>
        <View style={{ height: 3, borderRadius: 99, backgroundColor: c.superficie2, overflow: 'hidden' }}>
          <Animated.View style={{ height: 3, width: '100%', backgroundColor: c.textoSuave, transform: [{ scaleX: reducir ? Math.min(1, s / espera) : barra }], transformOrigin: 'left' }} />
        </View>
        <T v="cuerpoFuerte" style={[TIPO.cuerpoFuerte, { fontSize: 17 }]}>
          ¿Todo bien?
        </T>
        <T v="cuerpo15" suave>
          Notamos un movimiento brusco y luego velocidad. Si fue tuyo, confírmalo y no avisaremos a nadie.
        </T>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setPin(true)} accessibilityRole="button" style={{ flex: 1, minHeight: 48, borderRadius: RADIO.total, backgroundColor: c.superficie2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icono nombre="huella" tam={18} color={c.texto} />
            <T v="cuerpo15Fuerte">Estoy bien</T>
          </Pressable>
          <Pressable onPress={onVer} accessibilityRole="button" style={{ flex: 1, minHeight: 48, borderRadius: RADIO.total, backgroundColor: c.superficie2, alignItems: 'center', justifyContent: 'center' }}>
            <T v="cuerpo15Fuerte">Ver</T>
          </Pressable>
        </View>
      </View>
      <PedirPin
        visible={pin}
        titulo="¿Estás bien?"
        explicacion="Escribe tu PIN y no avisaremos a nadie."
        textoConfirmar="Estoy bien"
        alConfirmar={(p) => servicio.cancelarAlerta(p)}
        mensajeError={() => servicio.mensajePin()}
        alCerrar={() => setPin(false)}
      />
    </View>
  );
}
