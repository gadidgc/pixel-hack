import { Platform, View } from 'react-native';
import { Boton, Onda, Pantalla, Pasos, Respira, T } from '../ui/componentes';
import { MarcaGlifo } from '../ui/iconos';
import { RADIO, TIPO, useTema } from '../ui/tema';

/** F1 · 1/4 Bienvenida. */
export function Bienvenida({ onSeguir }: { onSeguir: () => void }) {
  const c = useTema();
  return (
    <Pantalla>
      <Pasos paso={1} total={4} />
      <View style={{ flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center' }}>
        <Onda tam={128} color={c.protegido} borde duracionMs={2800} />
        <Onda tam={128} color={c.protegido} borde duracionMs={2800} retrasoMs={1400} />
        <View style={{ width: 248, height: 248, borderRadius: RADIO.total, backgroundColor: c.superficie2, alignItems: 'center', justifyContent: 'center' }}>
          <Respira>
            <View style={{ width: 128, height: 128, borderRadius: RADIO.total, backgroundColor: c.protegidoFondo, alignItems: 'center', justifyContent: 'center' }}>
              <MarcaGlifo tam={64} color={c.protegido} />
            </View>
          </Respira>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T v="estado" accessibilityRole="header">
          Si te arranchan el celular, tu familia lo sabe en segundos.
        </T>
        <T suave>Funciona en silencio mientras caminas. Sin crear cuenta ni contraseña.</T>
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.linea }}>
        {[
          ['1', 'contacto'],
          [Platform.OS === 'web' ? '2' : '3', 'permisos'],
          ['~2', 'min en total'],
        ].map(([n, t]) => (
          <View key={t} style={{ flex: 1, paddingVertical: 14, gap: 2 }}>
            <T v="datoGrande">{n!}</T>
            <T v="apoyo13" suave>
              {t!}
            </T>
          </View>
        ))}
      </View>
      <Boton texto="Empezar" icono="flecha" onPress={onSeguir} />
      <T v="apoyo13" suave style={[TIPO.apoyo13, { textAlign: 'center' }]}>
        Alerta Arrebato no reemplaza a la Policía. Si estás en peligro, llama al 105.
      </T>
    </Pantalla>
  );
}
