import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';
import { faltaParaBloqueo, useEstadoBloqueo } from '../bloqueo';
import { PedirPin } from '../componentes/PedirPin';
import { usePreferencias, useProteccion } from '../useProteccion';
import { BarraPestanas, Boton, Hoja, Insignia, Lecturas, Onda, Respira, T, hora, useBucle, type Pestana } from '../ui/componentes';
import { Icono, type NombreIcono } from '../ui/iconos';
import { MapaFondo, useEscalaX } from '../ui/mapa';
import { RADIO, useTema } from '../ui/tema';

type Fase = 'apagada' | 'protegida' | 'pausada' | 'limitada';

/** F2 · Inicio: estás protegida (components/EstadoProteccion + Lectura). */
export function Inicio({ onPestana, onCerca }: { onPestana: (p: Pestana) => void; onCerca: () => void }) {
  const c = useTema();
  const ex = useEscalaX();
  const { estado, servicio } = useProteccion();
  const [pedido, setPedido] = useState<null | 'pausar' | 'apagar'>(null);
  const [activando, setActivando] = useState(false);
  const [errorActivar, setErrorActivar] = useState('');
  // Si la protección se activa por otro camino, el error viejo ya no aplica.
  useEffect(() => {
    if (estado.activa) setErrorActivar('');
  }, [estado.activa]);
  const tel = estado.telemetria;
  // Si el bloqueo no está autorizado, se dice aquí, a la vista: no solo dentro de Tú.
  const faltaBloqueo = faltaParaBloqueo(useEstadoBloqueo(), usePreferencias()?.numeroPropio);

  const limitada = estado.activa && (estado.segundoPlano === false || estado.tieneGps === false || estado.permisosFaltantes.length > 0);
  const fase: Fase = !estado.activa ? 'apagada' : estado.pausadaHasta ? 'pausada' : limitada ? 'limitada' : 'protegida';

  const faltaPausa = estado.pausadaHasta ? Math.max(0, estado.pausadaHasta - Date.now()) : 0;
  const mmss = `${String(Math.floor(faltaPausa / 60000)).padStart(2, '0')}:${String(Math.floor((faltaPausa % 60000) / 1000)).padStart(2, '0')}`;

  const estadoVista: Record<Fase, { icono: NombreIcono; fondo: string; color: string; titulo: string; apoyo: string }> = {
    protegida: { icono: 'escudoCheck', fondo: c.protegidoFondo, color: c.protegido, titulo: 'Estás protegida', apoyo: estado.activaDesde ? `Desde las ${hora(estado.activaDesde)}` : '' },
    pausada: { icono: 'escudoPausa', fondo: c.superficie2, color: c.textoSuave, titulo: 'En pausa', apoyo: `Vuelve sola en ${mmss}` },
    limitada: {
      icono: 'escudoAviso',
      fondo: c.avisoFondo,
      color: c.aviso,
      titulo: 'Protección limitada',
      apoyo:
        estado.segundoPlano === false
          ? Platform.OS === 'web'
            ? 'Solo con esta página abierta y la pantalla prendida'
            : 'Solo con la app abierta (Expo Go): instala la app compilada'
          : estado.permisosFaltantes.length
            ? `Falta: ${estado.permisosFaltantes.join(', ')}`
            : 'Sin GPS: activa la ubicación para avisar con la ruta',
    },
    apagada: { icono: 'escudo', fondo: c.superficie2, color: c.textoSuave, titulo: 'Protección apagada', apoyo: 'Actívala antes de salir' },
  };
  const v = estadoVista[fase];

  const velocidadKmh = tel?.velocidadMs != null ? Math.round(tel.velocidadMs * 3.6) : null;
  const andando = velocidadKmh === null ? '—' : velocidadKmh < 2 ? 'Quieta' : velocidadKmh < 8 ? 'Caminando' : 'En movimiento';

  /** Si no se pudo activar, decimos por qué (antes solo quedaba en el registro de Herramientas). */
  const activar = async () => {
    setActivando(true);
    setErrorActivar('');
    const ok = await servicio.activar();
    setActivando(false);
    const ultimo = servicio.obtener().registros[0];
    if (!ok) setErrorActivar(ultimo?.tipo === 'error' ? ultimo.texto : 'No se pudo activar la protección. Intenta otra vez.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo }}>
      <MapaFondo alto={620}>
        <View style={{ position: 'absolute', left: ex(168), top: 286, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
          {estado.activa && <Onda tam={52} color="rgba(111,168,255,0.35)" duracionMs={3200} />}
          <View style={{ width: 16, height: 16, borderRadius: 99, backgroundColor: c.info, borderWidth: 3, borderColor: c.fondo }} />
        </View>
      </MapaFondo>

      <Pressable
        onPress={onCerca}
        accessibilityRole="button"
        style={{ position: 'absolute', left: 16, right: 16, top: 56, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: c.superficie, borderRadius: RADIO.m, borderTopWidth: 1, borderTopColor: c.brillo }}
      >
        <Icono nombre="ubicacion" tam={18} color={c.textoSuave} />
        <T v="cuerpo15Fuerte" style={{ flex: 1 }}>
          Cerca de ti
        </T>
        <T v="hora" suave>
          ver avisos de la zona
        </T>
      </Pressable>

      <View style={{ flex: 1 }} />
      <Hoja style={{ paddingTop: 20, paddingHorizontal: 16, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }} accessible accessibilityLabel={`${v.titulo}. ${v.apoyo}`}>
          <Respira activo={fase === 'protegida'}>
            <View style={{ width: 64, height: 64, borderRadius: RADIO.total, backgroundColor: v.fondo, alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre={v.icono} tam={30} color={v.color} />
            </View>
          </Respira>
          <View style={{ flex: 1, gap: 2 }}>
            {fase === 'protegida' && <Insignia tipo="protegido" texto="EN VIVO" punto parpadeo />}
            {fase === 'limitada' && <Insignia tipo="aviso" texto="MODO LIMITADO" />}
            <T v="titulo26">{v.titulo}</T>
            {!!v.apoyo && (
              <T v="apoyo" suave>
                {v.apoyo}
              </T>
            )}
          </View>
        </View>

        {estado.activa && (
          <Lecturas
            celdas={[
              { rotulo: 'VELOCIDAD', valor: velocidadKmh === null ? '—' : String(velocidadKmh), unidad: 'km/h', estado: andando, tono: velocidadKmh === null ? 'aviso' : 'protegido' },
              {
                rotulo: 'MOVIMIENTO',
                valor: tel ? tel.aceleracionLinealG.toFixed(1).replace('.', ',') : '—',
                unidad: 'g',
                extra: fase === 'protegida' ? <Barras color={c.protegido} /> : undefined,
                estado: fase === 'pausada' ? 'En pausa' : undefined,
              },
              {
                rotulo: 'GPS',
                valor: tel?.precisionGpsM != null ? `±${Math.round(tel.precisionGpsM)}` : '—',
                unidad: 'm',
                estado: tel?.precisionGpsM == null ? 'Sin señal' : tel.precisionGpsM <= 20 ? 'Buena señal' : 'Señal débil',
                tono: tel?.precisionGpsM != null && tel.precisionGpsM <= 20 ? 'protegido' : 'aviso',
              },
            ]}
          />
        )}

        {faltaBloqueo && (
          <Pressable
            onPress={() => onPestana('tu')}
            accessibilityRole="button"
            accessibilityLabel={`${Platform.OS === 'ios' ? 'Tus apps no se bloquearán' : 'El celular no se bloqueará'} si te lo roban. ${faltaBloqueo} Arreglar`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: RADIO.s, backgroundColor: c.avisoFondo }}
          >
            <Icono nombre="escudoAviso" tam={18} color={c.aviso} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="cuerpo15Fuerte" color={c.aviso}>
                {Platform.OS === 'ios' ? 'Tus apps no se bloquearán si te lo roban' : 'Tu celular no se bloqueará si te lo roban'}
              </T>
              <T v="apoyo13" color={c.aviso}>
                {faltaBloqueo}
              </T>
            </View>
            <View style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.aviso, justifyContent: 'center' }}>
              <T v="apoyo13" color="#1f1300">
                Arreglar
              </T>
            </View>
          </Pressable>
        )}

        {!estado.activa ? (
          <>
            <Boton texto={activando ? 'Activando…' : 'Activar protección'} icono="escudoCheck" onPress={activar} deshabilitado={activando} />
            {!!errorActivar && (
              <T v="apoyo" color={c.aviso}>
                {errorActivar}
              </T>
            )}
          </>
        ) : estado.pausadaHasta ? (
          <Boton texto="Reanudar ahora" icono="escudo" variante="secundario" principal={false} onPress={() => servicio.reanudar()} />
        ) : (
          // Grabar evidencia vive solo en su pestaña: un único lugar para grabar.
          <Boton texto="Pausar 30 min" icono="escudoPausa" variante="secundario" principal={false} onPress={() => setPedido('pausar')} />
        )}
        {estado.activa && <Boton texto="Apagar la protección (PIN)" variante="terciario" onPress={() => setPedido('apagar')} />}

        <View style={{ marginHorizontal: -16 }}>
          <BarraPestanas actual="inicio" onCambiar={onPestana} />
        </View>
      </Hoja>

      <PedirPin
        visible={pedido === 'pausar'}
        titulo="Pausar 30 minutos"
        explicacion="Escribe tu PIN. La protección vuelve sola al terminar la pausa."
        alConfirmar={(pin) => servicio.pausar(30, pin)}
        alCerrar={() => setPedido(null)}
      />
      <PedirPin
        visible={pedido === 'apagar'}
        titulo="Apagar la protección"
        explicacion="Escribe tu PIN. Quien tenga tu celular no puede apagarla sin él."
        alConfirmar={(pin) => servicio.desactivar(pin)}
        alCerrar={() => setPedido(null)}
      />
    </View>
  );
}

/** Barras que suben y bajan: "estamos leyendo el movimiento" (se quedan quietas con reducir movimiento). */
function Barras({ color }: { color: string }) {
  const retrasos = [0, 200, 400, 100, 300];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 14 }} accessibilityElementsHidden>
      {retrasos.map((r) => (
        <Barra key={r} color={color} retraso={r} />
      ))}
    </View>
  );
}

function Barra({ color, retraso }: { color: string; retraso: number }) {
  const v = useBucle(550, retraso, true);
  return <Animated.View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: color, transform: [{ scaleY: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }] }} />;
}
