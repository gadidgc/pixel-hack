import { View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * La onda de un audio dibujada con barras: un dígito (0 a 9) por barra, ver onda.ts. Con `avance`
 * (de 0 a 1), las barras ya escuchadas van en `colorAvance`.
 */
export function BarrasOnda({
  onda,
  alto,
  color,
  colorAvance,
  avance = 0,
  style,
}: {
  onda: string;
  alto: number;
  color: string;
  colorAvance?: string;
  avance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const niveles = onda.split('').map(Number);
  return (
    <View style={[{ height: alto, flexDirection: 'row', alignItems: 'center', gap: 2 }, style]} pointerEvents="none">
      {niveles.map((n, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: Math.max(3, ((n + 1) / 10) * alto),
            borderRadius: 99,
            backgroundColor: colorAvance && (i + 0.5) / niveles.length <= avance ? colorAvance : color,
          }}
        />
      ))}
    </View>
  );
}
