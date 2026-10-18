import { useRef, useState, type ElementRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { PasoBienvenida } from '../componentes/PasoBienvenida';
import { guardarPin } from '../pin';
import { T } from '../ui/componentes';
import { RADIO, useTema } from '../ui/tema';

const LARGO = 4;

/**
 * F1 · Paso 4: crear el PIN como una pantalla propia (antes salía en una ventana encima de la prueba).
 * 4 cajas, el teclado numérico del celular y avanza solo: primero se escribe, luego se repite.
 */
export function PinBienvenida({ onSeguir, onVolver }: { onSeguir: () => void; onVolver: () => void }) {
  const c = useTema();
  const campo = useRef<ElementRef<typeof TextInput>>(null);
  const [primero, setPrimero] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  // En Android "atrás" cierra el teclado pero el campo sigue con el foco, y focus() no hace nada:
  // hay que soltarlo y volver a tomarlo para que el teclado aparezca otra vez.
  const abrirTeclado = () => {
    campo.current?.blur();
    setTimeout(() => campo.current?.focus(), 0);
  };

  const cambiar = async (texto: string) => {
    const v = texto.replace(/\D/g, '').slice(0, LARGO);
    setPin(v);
    if (v.length > 0) setError('');
    if (v.length < LARGO) return;
    if (primero === null) {
      setPrimero(v);
      setPin('');
      return;
    }
    if (v !== primero) {
      setPrimero(null);
      setPin('');
      setError('No coinciden. Escríbelo otra vez.');
      return;
    }
    try {
      await guardarPin(v);
      onSeguir();
    } catch {
      setPin('');
      setError('No se pudo guardar el PIN. Inténtalo otra vez.');
    }
  };

  return (
    <PasoBienvenida
      paso={4}
      onVolver={onVolver}
      titulo={primero === null ? 'Crea tu PIN' : 'Repite tu PIN'}
      texto={primero === null ? '4 números. Con él cancelas una falsa alarma; el ladrón no puede.' : 'Para confirmar que lo recuerdas.'}
      abajo={null}
    >
      <Pressable onPress={abrirTeclado} accessibilityLabel={`${pin.length} de ${LARGO} números escritos`} style={{ flexDirection: 'row', gap: 12, justifyContent: 'center', paddingTop: 16 }}>
        {Array.from({ length: LARGO }, (_, i) => (
          <View
            key={i}
            style={{
              width: 56,
              height: 64,
              borderRadius: RADIO.s,
              backgroundColor: c.superficie2,
              borderWidth: 2,
              borderColor: i === pin.length ? c.info : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {i < pin.length && <View style={{ width: 14, height: 14, borderRadius: RADIO.total, backgroundColor: c.texto }} />}
          </View>
        ))}
      </Pressable>
      {/* El campo real queda invisible: las cajas de arriba muestran lo escrito. */}
      <TextInput
        ref={campo}
        value={pin}
        onChangeText={(t) => void cambiar(t)}
        keyboardType="number-pad"
        maxLength={LARGO}
        autoFocus
        secureTextEntry
        textContentType="oneTimeCode"
        autoComplete="off"
        caretHidden
        accessibilityLabel={primero === null ? 'Crea tu PIN' : 'Repite tu PIN'}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      <T v="apoyo" color={error ? c.alerta : c.textoSuave} style={{ textAlign: 'center' }}>
        {error || (primero === null ? 'Luego te lo pedimos otra vez para confirmar.' : 'Escríbelo otra vez.')}
      </T>
    </PasoBienvenida>
  );
}
