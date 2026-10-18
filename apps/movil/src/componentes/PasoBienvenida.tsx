import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { FUENTES, RADIO, useTema } from '../ui/tema';
import { Pantalla, Pasos, T } from '../ui/componentes';

/**
 * Pasos con barra de progreso (la bienvenida no cuenta): nombre, contacto, permisos, PIN y prueba.
 * En iPhone se suma el bloqueo con Atajos (Apple no deja que la app bloquee la pantalla sola).
 */
export const CON_ATAJOS = Platform.OS === 'ios';
export const TOTAL_PASOS = CON_ATAJOS ? 6 : 5;

/**
 * Esqueleto de un paso de la bienvenida (diseño: lienzo "Onboarding nuevo"): barra de progreso, un título
 * grande, UNA línea de apoyo, el contenido y la acción principal abajo, al alcance del pulgar.
 * Una idea por pantalla y sin scroll: si hace falta explicar más, va después de la bienvenida.
 */
export function PasoBienvenida({
  paso,
  onVolver,
  titulo,
  texto,
  icono,
  children,
  abajo,
}: {
  paso: number;
  onVolver: () => void;
  titulo: string;
  texto?: string;
  /** Ícono grande arriba del título (pantallas de aviso o de éxito). */
  icono?: ReactNode;
  children?: ReactNode;
  /** Botones de abajo. Con teclado abierto suben con él. */
  abajo: ReactNode;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pantalla>
        <Pasos paso={paso} total={TOTAL_PASOS} onVolver={onVolver} />
        {icono}
        <View style={{ gap: 8 }}>
          <T v="estado" accessibilityRole="header">
            {titulo}
          </T>
          {!!texto && <T suave>{texto}</T>}
        </View>
        {children}
        <View style={{ flex: 1 }} />
        <View style={{ gap: 4 }}>{abajo}</View>
      </Pantalla>
    </KeyboardAvoidingView>
  );
}

/** Campo de texto de la bienvenida: 56 px, superficie-2, sin borde. */
export function useEstiloCampo() {
  const c = useTema();
  return {
    backgroundColor: c.superficie2,
    borderRadius: RADIO.s,
    paddingHorizontal: 16,
    minHeight: 56,
    color: c.texto,
    fontFamily: FUENTES.texto,
    fontSize: 18,
  };
}
