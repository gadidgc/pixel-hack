import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { pinValido } from '../pin';

interface Props {
  visible: boolean;
  titulo: string;
  explicacion: string;
  /** Devuelve `true` si el PIN sirvió (para cerrar) o `false` para mostrar error. */
  alConfirmar: (pin: string) => Promise<boolean>;
  alCerrar: () => void;
  /** Al crear el PIN se pide dos veces. */
  crear?: boolean;
}

/** Ventana para escribir (o crear) el PIN del dueño. */
export function PedirPin({ visible, titulo, explicacion, alConfirmar, alCerrar, crear = false }: Props) {
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
    else setError(crear ? 'No se pudo guardar el PIN.' : 'PIN incorrecto.');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <View style={e.fondo}>
        <View style={e.caja}>
          <Text style={e.titulo}>{titulo}</Text>
          <Text style={e.texto}>{explicacion}</Text>
          <TextInput
            style={e.campo}
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="PIN"
            autoFocus
            accessibilityLabel="PIN"
          />
          {crear && (
            <TextInput
              style={e.campo}
              value={repetir}
              onChangeText={(v) => setRepetir(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="Repite el PIN"
              accessibilityLabel="Repite el PIN"
            />
          )}
          {!!error && <Text style={e.error}>{error}</Text>}
          <View style={e.fila}>
            <Pressable style={[e.boton, e.secundario]} onPress={cerrar}>
              <Text style={e.textoSecundario}>Volver</Text>
            </Pressable>
            <Pressable style={[e.boton, ocupado && e.deshabilitado]} disabled={ocupado} onPress={confirmar}>
              <Text style={e.textoBoton}>{crear ? 'Guardar PIN' : 'Confirmar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const e = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  caja: { backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 10, maxWidth: 420, width: '100%', alignSelf: 'center' },
  titulo: { fontSize: 19, fontWeight: '700', color: '#111' },
  texto: { fontSize: 14, color: '#444' },
  campo: { borderWidth: 1, borderColor: '#c5ccd4', borderRadius: 10, padding: 12, fontSize: 20, letterSpacing: 6, textAlign: 'center' },
  error: { color: '#c62828', fontWeight: '600' },
  fila: { flexDirection: 'row', gap: 10, marginTop: 4 },
  boton: { flex: 1, backgroundColor: '#1565c0', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  secundario: { backgroundColor: '#eef1f4' },
  deshabilitado: { backgroundColor: '#9aa4b0' },
  textoBoton: { color: '#fff', fontWeight: '700', fontSize: 16 },
  textoSecundario: { color: '#222', fontWeight: '600', fontSize: 16 },
});
