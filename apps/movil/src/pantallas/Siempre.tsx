import { useEffect } from 'react';
import { AppState, Linking, View } from 'react-native';
import { PasoBienvenida } from '../componentes/PasoBienvenida';
import { revisarPermisosUbicacion } from '../ubicacion';
import { Boton, T } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { RADIO, useTema } from '../ui/tema';

/**
 * F1 · Paso 3b (solo si falta): la ubicación quedó en "Mientras se usa". Sin "Siempre" la protección no se
 * puede encender (servicio.activar), así que lo explicamos en 3 pasos y abrimos Ajustes. Al volver a la app
 * revisamos solos: si ya eligió "Siempre", seguimos sin que tenga que tocar nada.
 */
export function Siempre({ onSeguir, onVolver }: { onSeguir: () => void; onVolver: () => void }) {
  const c = useTema();

  useEffect(() => {
    // La revisión es asíncrona: si la persona tocó Volver mientras tanto, ya no hay que avanzar.
    let vivo = true;
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') return;
      revisarPermisosUbicacion()
        .then((p) => {
          if (vivo && p.segundoPlano) onSeguir();
        })
        .catch(() => undefined);
    });
    return () => {
      vivo = false;
      sub.remove();
    };
  }, [onSeguir]);

  const pasos = [
    ['Toca ', 'Abrir Ajustes'],
    ['Entra a ', 'Ubicación'],
    ['Elige ', 'Siempre', ' y vuelve aquí'],
  ];

  return (
    <PasoBienvenida
      paso={3}
      onVolver={onVolver}
      titulo="Falta un paso"
      texto="Para que funcione con la pantalla apagada, la ubicación tiene que estar en «Siempre»."
      abajo={
        <>
          <Boton texto="Abrir Ajustes" icono="ajustes" onPress={() => void Linking.openSettings()} />
          <Boton texto="Lo hago después" variante="terciario" onPress={onSeguir} />
        </>
      }
      icono={
        <View style={{ width: 64, height: 64, borderRadius: RADIO.total, backgroundColor: c.avisoFondo, alignItems: 'center', justifyContent: 'center' }}>
          <Icono nombre="ubicacion" tam={30} color={c.aviso} />
        </View>
      }
    >
      <View>
        {pasos.map(([antes, fuerte, despues], i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 14, alignItems: 'center', paddingVertical: 12, borderBottomWidth: i < pasos.length - 1 ? 1 : 0, borderBottomColor: c.linea }}>
            <T v="dato" color={c.protegido} style={{ width: 16 }}>
              {String(i + 1)}
            </T>
            <T>
              {antes}
              <T v="cuerpoFuerte">{fuerte!}</T>
              {despues ?? ''}
            </T>
          </View>
        ))}
      </View>
    </PasoBienvenida>
  );
}
