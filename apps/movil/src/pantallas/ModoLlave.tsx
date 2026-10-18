import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { anunciarComoLlave, dejarDeSerLlave, nuevoCodigoLlave } from '../llave';
import { guardarPreferencias } from '../preferencias';
import { usePreferencias } from '../useProteccion';
import { Boton, Insignia, Pantalla, T, Tarjeta } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { FUENTES, useTema } from '../ui/tema';

const ETIQUETA_PANTALLA = 'modo-llave';

/**
 * "Este celular es tu llave": anuncia por Bluetooth su código para que el celular protegido mida la
 * distancia (robo silencioso). Por ahora tiene que quedarse en esta pantalla: si la cierras, deja de
 * anunciar (que siga en segundo plano necesita su propio servicio en primer plano; ver README).
 */
export function ModoLlave({ onSalir }: { onSalir: () => void }) {
  const c = useTema();
  const prefs = usePreferencias();
  const [estado, setEstado] = useState<'iniciando' | 'anunciando' | 'error'>('iniciando');
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);
  const codigo = prefs?.codigoComoLlave ?? null;

  useEffect(() => {
    if (!prefs) return;
    // El código se crea una vez y queda guardado: así no hay que volver a vincular cada vez.
    if (!codigo) {
      void guardarPreferencias({ codigoComoLlave: nuevoCodigoLlave() });
      return;
    }
    let vivo = true;
    setEstado('iniciando');
    void activateKeepAwakeAsync(ETIQUETA_PANTALLA).catch(() => undefined);
    anunciarComoLlave(codigo).then(
      () => vivo && setEstado('anunciando'),
      (e: unknown) => {
        if (!vivo) return;
        setEstado('error');
        setError(e instanceof Error ? e.message : 'No se pudo anunciar la llave por Bluetooth.');
      },
    );
    return () => {
      vivo = false;
      dejarDeSerLlave();
      Promise.resolve(deactivateKeepAwake(ETIQUETA_PANTALLA)).catch(() => undefined);
    };
    // `prefs` cambia de objeto con cada guardado; solo importa el código.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, intento, Boolean(prefs)]);

  return (
    <Pantalla style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={onSalir} accessibilityRole="button" accessibilityLabel="Volver" style={{ width: 48, height: 48, marginLeft: -12, alignItems: 'center', justifyContent: 'center' }}>
          <Icono nombre="volver" color={c.texto} />
        </Pressable>
        <T v="titulo">Este celular es tu llave</T>
      </View>

      {estado === 'anunciando' ? (
        <Insignia tipo="protegido" texto="ANUNCIANDO POR BLUETOOTH" punto parpadeo />
      ) : estado === 'error' ? (
        <Insignia tipo="alerta" texto="NO ESTÁ FUNCIONANDO" />
      ) : (
        <Insignia tipo="neutra" texto="PREPARANDO…" />
      )}

      <Tarjeta style={{ gap: 6, alignItems: 'center', paddingVertical: 24 }}>
        <T v="apoyo13" suave>
          CÓDIGO DE LA LLAVE
        </T>
        <View accessible accessibilityLabel={`Código ${codigo?.split('').join(' ') ?? ''}`}>
          <T style={{ fontFamily: FUENTES.datosMedio, fontSize: 56, letterSpacing: 12, color: c.texto }}>{codigo ?? '····'}</T>
        </View>
      </Tarjeta>

      {estado === 'error' && (
        <View style={{ gap: 10 }}>
          <T v="apoyo" color={c.alerta}>
            {error}
          </T>
          <Boton texto="Intentar otra vez" variante="secundario" principal={false} onPress={() => setIntento((n) => n + 1)} />
        </View>
      )}

      <View style={{ gap: 8 }}>
        {[
          'En tu celular protegido, ve a Tú › Llave, escribe este código y pon los dos celulares a 1 m (un brazo) para calibrar.',
          'Lleva este celular contigo, en el bolsillo. Si tu celular protegido se aleja de él (de la mochila o de la mesa), lo bloqueamos.',
          'Deja la app abierta en esta pantalla: si la cierras, deja de ser llave. La pantalla no se apaga sola.',
        ].map((paso, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
            <T v="apoyo" color={c.protegido}>
              {i + 1}.
            </T>
            <T v="apoyo" style={{ flex: 1 }}>
              {paso}
            </T>
          </View>
        ))}
      </View>

      <View style={{ flex: 1 }} />
      <Boton texto="Dejar de ser llave" variante="secundario" onPress={onSalir} />
    </Pantalla>
  );
}
