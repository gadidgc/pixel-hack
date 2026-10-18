import { useState } from 'react';
import { TextInput } from 'react-native';
import { PasoBienvenida, useEstiloCampo } from '../componentes/PasoBienvenida';
import { guardarPreferencias } from '../preferencias';
import { usePreferencias } from '../useProteccion';
import { Boton } from '../ui/componentes';
import { useTema } from '../ui/tema';

/** F1 · Paso 1: tu nombre (así te ve tu familia en el aviso). */
export function Nombre({ onSeguir, onVolver }: { onSeguir: () => void; onVolver: () => void }) {
  const c = useTema();
  const campo = useEstiloCampo();
  const prefs = usePreferencias();
  const [nombre, setNombre] = useState<string | null>(null);
  const valor = nombre ?? prefs?.nombre ?? '';
  const listo = valor.trim().length > 0;

  const seguir = async () => {
    if (!listo) return;
    await guardarPreferencias({ nombre: valor.trim() });
    onSeguir();
  };

  return (
    <PasoBienvenida
      paso={1}
      onVolver={onVolver}
      titulo="¿Cómo te llamas?"
      texto="Así te verá tu familia en el aviso."
      abajo={<Boton texto="Seguir" icono="flecha" onPress={seguir} deshabilitado={!listo} />}
    >
      <TextInput
        style={campo}
        value={valor}
        onChangeText={setNombre}
        placeholder="Tu nombre"
        placeholderTextColor={c.textoSuave}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="name"
        textContentType="givenName"
        autoFocus
        returnKeyType="next"
        onSubmitEditing={seguir}
        accessibilityLabel="Tu nombre"
      />
    </PasoBienvenida>
  );
}
