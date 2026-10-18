import { View } from 'react-native';
import { Boton, Onda, Pantalla, Pasos, Respira, T } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { RADIO, TIPO, useTema } from '../ui/tema';

/**
 * F1 · Bienvenida. Una sola idea: qué hace la app. Los pasos que siguen (nombre, contacto, permisos, PIN,
 * prueba) van uno por pantalla y sin scroll (diseño: lienzo "Onboarding nuevo").
 */
export function Bienvenida({ onSeguir }: { onSeguir: () => void }) {
  const c = useTema();
  return (
    <Pantalla>
      <Pasos paso={1} total={1} />
      <View style={{ flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center' }}>
        <Onda tam={128} color={c.protegido} borde duracionMs={2800} />
        <View style={{ width: 248, height: 248, borderRadius: RADIO.total, backgroundColor: c.superficie, alignItems: 'center', justifyContent: 'center' }}>
          <Respira>
            <View style={{ width: 200, height: 200, borderRadius: RADIO.total, backgroundColor: c.protegidoFondo, alignItems: 'center', justifyContent: 'center' }}>
              <Icono nombre="escudoCheck" tam={72} color={c.protegido} grosor={1.8} />
            </View>
          </Respira>
        </View>
      </View>
      <View style={{ gap: 12 }}>
        <T v="estado" accessibilityRole="header">
          Si te arranchan el celular, tu familia lo sabe en segundos.
        </T>
        <T suave>Se configura en 2 minutos. Sin cuenta ni contraseña.</T>
      </View>
      <Boton texto="Empezar" icono="flecha" onPress={onSeguir} />
      <T v="apoyo13" suave style={[TIPO.apoyo13, { textAlign: 'center' }]}>
        No reemplaza a la Policía. Si estás en peligro, llama al 105.
      </T>
    </Pantalla>
  );
}
