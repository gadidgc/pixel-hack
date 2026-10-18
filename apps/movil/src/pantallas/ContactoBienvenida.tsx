import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { PasoBienvenida, useEstiloCampo } from '../componentes/PasoBienvenida';
import { guardarPreferencias } from '../preferencias';
import { usePreferencias } from '../useProteccion';
import { Boton, T } from '../ui/componentes';
import { Icono } from '../ui/iconos';
import { FUENTES, RADIO, useTema } from '../ui/tema';

/**
 * F1 · Paso 2: UNA persona de confianza (nombre y celular). Un solo botón guarda y sigue.
 * Más personas y la invitación por WhatsApp quedan en Tú › Tu red (pantalla Contacto).
 */
export function ContactoBienvenida({ onSeguir, onVolver }: { onSeguir: () => void; onVolver: () => void }) {
  const c = useTema();
  const campo = useEstiloCampo();
  const prefs = usePreferencias();
  const primero = prefs?.contactos[0];
  const [nombre, setNombre] = useState(primero?.nombre ?? '');
  const [telefono, setTelefono] = useState(primero?.telefono ?? '');
  const [error, setError] = useState('');
  if (!prefs) return null;

  const digitos = telefono.replace(/\D/g, '');
  const listo = nombre.trim().length > 0 && digitos.length >= 9;

  const seguir = async () => {
    if (!nombre.trim()) return setError('Escribe cómo se llama.');
    if (digitos.length < 9) return setError('El celular debe tener 9 números.');
    setError('');
    // Volver atrás y cambiar el contacto lo reemplaza; los demás (si los agregó en Tu red) se quedan.
    const nuevo = { nombre: nombre.trim(), telefono: telefono.replace(/[^\d+]/g, '') };
    await guardarPreferencias({ contactos: [nuevo, ...prefs.contactos.slice(1)] });
    onSeguir();
  };

  return (
    <PasoBienvenida
      paso={2}
      onVolver={onVolver}
      titulo="¿A quién avisamos?"
      texto="Alguien que siempre tenga el celular a la mano."
      abajo={<Boton texto="Guardar y seguir" icono="flecha" onPress={seguir} deshabilitado={!listo} />}
    >
      <View style={{ gap: 12 }}>
        <View style={{ gap: 6 }}>
          <T v="apoyo" suave>
            Nombre
          </T>
          <TextInput style={campo} value={nombre} onChangeText={setNombre} placeholder="Mamá" placeholderTextColor={c.textoSuave} autoCapitalize="words" autoCorrect={false} autoFocus returnKeyType="next" accessibilityLabel="Nombre de tu contacto" />
        </View>
        <View style={{ gap: 6 }}>
          <T v="apoyo" suave>
            Celular
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.superficie2, borderRadius: RADIO.s, paddingLeft: 16, minHeight: 56 }}>
            <T v="dato" suave>
              +51
            </T>
            <TextInput
              style={[campo, { flex: 1, paddingHorizontal: 0, backgroundColor: 'transparent', fontFamily: FUENTES.datosMedio }]}
              value={telefono}
              onChangeText={setTelefono}
              placeholder="987 654 321"
              placeholderTextColor={c.textoSuave}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              onSubmitEditing={seguir}
              accessibilityLabel="Celular de tu contacto"
            />
          </View>
        </View>
        {!!error && (
          <T v="apoyo" color={c.alerta}>
            {error}
          </T>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Icono nombre="mensaje" tam={18} color={c.textoSuave} />
        <T v="apoyo" suave style={{ flex: 1 }}>
          Solo le escribimos si te arranchan el celular. Puedes agregar a más personas después.
        </T>
      </View>
    </PasoBienvenida>
  );
}
