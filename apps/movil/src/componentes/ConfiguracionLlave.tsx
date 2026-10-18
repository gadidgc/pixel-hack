import { CONFIG_LLAVE_DEMO, CONFIG_LLAVE_NORMAL } from '@pixel-hack/detector';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { codigoLlaveValido, consultarBluetooth } from '../llave';
import type { EstadoVigilanciaLlave } from '../servicio';
import { useProteccion, usePreferencias } from '../useProteccion';
import { Boton, Rotulo, T, Tarjeta } from '../ui/componentes';
import { FUENTES, RADIO, useTema } from '../ui/tema';
import { PedirPin } from './PedirPin';

/** Cómo está la llave ahora, en una frase (Tú y Herramientas). */
export function textoEstadoLlave(llave: EstadoVigilanciaLlave | null, activa: boolean): string {
  if (!activa) return 'La vigilamos cuando la protección está activa.';
  if (!llave) return 'Sin llave vinculada.';
  if (llave.modo !== 'vigilando') return llave.detalle;
  const t = llave.telemetria;
  if (!t || t.estado === 'buscando') return 'Buscando tu llave… Acércala para empezar a vigilar.';
  const d = t.distanciaM === null ? 'sin señal' : `~${t.distanciaM.toFixed(1)} m`;
  if (t.estado === 'cerca') return `Cerca de ti · ${d}`;
  if (t.estado === 'lejos') return `Se está alejando · ${d}`;
  return 'Tu celular se alejó de tu llave.';
}

/**
 * Tú › Llave (robo silencioso): vincular otro celular como llave, o usar este como llave de otro.
 * Solo Android compilado (módulo modules/llave-ble).
 */
export function ConfiguracionLlave({ onModoLlave }: { onModoLlave: () => void }) {
  const c = useTema();
  const prefs = usePreferencias();
  const { estado, servicio } = useProteccion();
  const [codigo, setCodigo] = useState('');
  const [vinculando, setVinculando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [quitar, setQuitar] = useState(false);
  if (!prefs) return null;
  const bt = consultarBluetooth();
  const config = estado.modoDemo ? CONFIG_LLAVE_DEMO : CONFIG_LLAVE_NORMAL;
  const llave = estado.llave;

  const vincular = async () => {
    setVinculando(true);
    setMensaje('Midiendo la señal… deja los dos celulares a 1 m.');
    const r = await servicio.vincularLlave(codigo).catch(() => ({ ok: false, detalle: 'No se pudo vincular la llave.' }));
    setVinculando(false);
    setMensaje(r.detalle);
    if (r.ok) setCodigo('');
  };

  return (
    <View style={{ gap: 10 }}>
      <Rotulo>LLAVE · ROBO SILENCIOSO</Rotulo>
      <Tarjeta style={{ gap: 12 }}>
        <T v="cuerpoFuerte">Si se llevan tu celular sin que te des cuenta</T>
        <T v="apoyo" suave>
          {`Usa otro celular como llave y llévalo contigo. Si tu celular se aleja más de ${config.distanciaMaxM} m de ella durante ${config.sostenidoMs / 1000} s (de tu mochila o de la mesa), lo bloqueamos y te preguntamos "¿Todo bien?". Si nadie responde, avisamos a tu red.`}
        </T>
        {!bt.disponible || !bt.encendido ? (
          <T v="apoyo" color={c.aviso}>
            {bt.detalle}
          </T>
        ) : prefs.llave ? (
          <View style={{ gap: 10 }}>
            <T v="apoyo13" color={llave?.modo === 'vigilando' && llave.telemetria?.estado === 'cerca' ? c.protegido : c.aviso}>
              {`Llave ${prefs.llave.codigo} · ${textoEstadoLlave(llave, estado.activa)}`}
            </T>
            {llave?.modo === 'ignorada' && <Boton texto="Ya tengo mi llave: volver a vigilarla" variante="secundario" principal={false} onPress={() => void servicio.volverAUsarLlave()} />}
            {llave?.modo === 'sin_bluetooth' && <Boton texto="Intentar otra vez" variante="secundario" principal={false} onPress={() => void servicio.volverAUsarLlave()} />}
            <Boton texto="Quitar la llave" variante="terciario" onPress={() => setQuitar(true)} />
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <T v="apoyo">En el otro celular abre la app y toca "Usar este celular como llave". Escribe aquí su código y pon los dos celulares a 1 m (un brazo).</T>
            <TextInput
              style={{ backgroundColor: c.superficie2, borderRadius: RADIO.s, minHeight: 56, color: c.texto, fontFamily: FUENTES.datosMedio, fontSize: 22, letterSpacing: 8, textAlign: 'center' }}
              value={codigo}
              onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              placeholder="Código"
              placeholderTextColor={c.textoSuave}
              accessibilityLabel="Código de la llave"
            />
            <Boton
              texto={vinculando ? 'Midiendo la señal…' : 'Vincular y calibrar'}
              variante="secundario"
              principal={false}
              deshabilitado={vinculando || !codigoLlaveValido(codigo)}
              onPress={() => void vincular()}
            />
          </View>
        )}
        {!!mensaje && (
          <T v="apoyo" suave>
            {mensaje}
          </T>
        )}
        {bt.puedeSerLlave && bt.encendido && !prefs.llave && <Boton texto="Usar este celular como llave" variante="terciario" onPress={onModoLlave} />}
        <T v="apoyo13" suave>
          La distancia se estima con la fuerza de la señal Bluetooth: falla por 2 a 3 m, y el cuerpo o la mochila la bajan. Por eso pedimos que la llave siga lejos unos segundos.
        </T>
      </Tarjeta>
      <PedirPin
        visible={quitar}
        titulo="Quitar la llave"
        explicacion="Escribe tu PIN: dejaremos de vigilar si tu celular se aleja de ella."
        textoConfirmar="Quitar"
        alConfirmar={(p) => servicio.desvincularLlave(p)}
        alCerrar={() => setQuitar(false)}
      />
    </View>
  );
}
