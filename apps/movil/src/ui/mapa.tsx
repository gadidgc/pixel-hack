import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTema } from './tema';

/**
 * Fondo de mapa estilizado, de bajo contraste (README del sistema: "Mapa"). Es decorativo: lo usan las
 * pantallas de ejemplo. La ruta real del contacto va sobre calles de verdad (`mapa-calles.tsx`).
 * Coordenadas de dibujo en una caja de 390 × alto (como las pantallas del diseño), escalada al ancho real.
 */
export function MapaFondo({ alto, children }: { alto: number; children?: ReactNode }) {
  const c = useTema();
  const { width } = useWindowDimensions();
  const ancho = Math.min(width, 560);
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: alto, backgroundColor: c.mapaFondo, overflow: 'hidden' }} pointerEvents="box-none">
      <Svg width="100%" height={alto} viewBox={`0 0 390 ${alto}`} preserveAspectRatio="xMidYMin slice" pointerEvents="none">
        <Rect width={390} height={alto} fill={c.mapaFondo} />
        <Path d={`M-20 ${alto * 0.3} L420 ${alto * 0.2}`} stroke={c.mapaCalle} strokeWidth={18} />
        <Path d={`M140 -20 L215 ${alto + 20}`} stroke={c.mapaCalle} strokeWidth={22} />
        <Path d={`M-20 ${alto * 0.5} L420 ${alto * 0.42}`} stroke={c.mapaCalleChica} strokeWidth={10} />
        <Path d={`M40 -20 L80 ${alto + 20}`} stroke={c.mapaCalleChica} strokeWidth={8} />
        <Path d={`M320 -20 L350 ${alto + 20}`} stroke={c.mapaCalleChica} strokeWidth={8} />
        <Path d={`M-20 ${alto * 0.13} L420 ${alto * 0.07}`} stroke={c.mapaCalleChica} strokeWidth={6} />
        <Rect x={240} y={alto * 0.3} width={64} height={80} rx={10} fill={c.mapaParque} />
      </Svg>
      {/* Los hijos se ubican con coordenadas del diseño (390 de ancho) ya escaladas. */}
      <View style={{ position: 'absolute', left: 0, top: 0, width: ancho, height: alto }} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

/** Escala una coordenada x del diseño (390 de ancho) al ancho real. */
export function useEscalaX(): (x: number) => number {
  const { width } = useWindowDimensions();
  const ancho = Math.min(width, 560);
  return (x: number) => (x / 390) * ancho;
}
