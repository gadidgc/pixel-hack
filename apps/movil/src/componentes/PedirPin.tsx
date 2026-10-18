import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { pinValido } from '../pin';
import { Boton, T } from '../ui/componentes';
import { FUENTES, RADIO, TIPO, useTema } from '../ui/tema';

interface Props {
  visible: boolean;
  titulo: string;
  explicacion: string;
  /** Devuelve `true` si el PIN sirvió (para cerrar) o `false` para mostrar error. */
  alConfirmar: (pin: string) => Promise<boolean>;
  alCerrar: () => void;
  /** Al crear el PIN se pide dos veces. */
  crear?: boolean;
  textoConfirmar?: string;
  /** Si el PIN no sirvió por otra razón (por ejemplo, demasiados intentos), el mensaje a mostrar. */
  mensajeError?: () => string | null;
}

/**
 * Ventana para escribir (o crear) el PIN del dueño. Cancelar una alerta, pausar o apagar la protección
 * nunca es un botón simple: pide el PIN (components/Boton y components/AvisoDiscreto).
 */
export function PedirPin({ visible, titulo, explicacion, alConfirmar, alCerrar, crear = false, textoConfirmar, mensajeError }: Props) {
  const c = useTema();
  const [pin, setPin] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const cerrar = () => {
    setPin('');
    setRepetir('');
    setError('');
    alCerrar();
  };

  const confirmar = async () => {
    if (!pinValido(pin)) return setError('El PIN tiene de 4 a 6 números.');
    if (crear && pin !== repetir) return setError('Los dos PIN no coinciden.');
    setOcupado(true);
    const ok = await alConfirmar(pin).catch(() => false);
    setOcupado(false);
    if (ok) cerrar();
    else setError(crear ? 'No se pudo guardar el PIN.' : (mensajeError?.() ?? 'PIN incorrecto.'));
  };

  const campo = {
    backgroundColor: c.superficie2,
    borderRadius: RADIO.s,
    paddingHorizontal: 16,
    minHeight: 56,
    color: c.texto,
    fontFamily: FUENTES.datosMedio,
    fontSize: 22,
    letterSpacing: 8,
    textAlign: 'center' as const,
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 }}>
        <View style={{ backgroundColor: c.superficie, borderRadius: RADIO.l, borderTopWidth: 1, borderTopColor: c.brillo, padding: 20, gap: 14, maxWidth: 420, width: '100%', alignSelf: 'center' }}>
          <T v="titulo">{titulo}</T>
          <T v="apoyo" suave>
            {explicacion}
          </T>
          <TextInput
            style={campo}
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="PIN"
            placeholderTextColor={c.textoSuave}
            autoFocus
            accessibilityLabel="PIN"
            onSubmitEditing={crear ? undefined : confirmar}
          />
          {crear && (
            <TextInput
              style={campo}
              value={repetir}
              onChangeText={(v) => setRepetir(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="Repite el PIN"
              placeholderTextColor={c.textoSuave}
              accessibilityLabel="Repite el PIN"
              onSubmitEditing={confirmar}
            />
          )}
          {!!error && <Text style={[TIPO.apoyo, { color: c.alerta, fontFamily: FUENTES.textoFuerte }]}>{error}</Text>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={cerrar} accessibilityRole="button" style={{ flex: 1, minHeight: 52, borderRadius: RADIO.total, backgroundColor: c.superficie2, alignItems: 'center', justifyContent: 'center' }}>
              <T v="cuerpo15Fuerte">Volver</T>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Boton texto={textoConfirmar ?? (crear ? 'Guardar PIN' : 'Confirmar')} onPress={confirmar} deshabilitado={ocupado} principal={false} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
