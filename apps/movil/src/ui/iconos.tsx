import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Íconos de trazo de 2 px con puntas redondeadas en una cuadrícula de 24 px (estilo Lucide),
 * con los mismos trazos que las pantallas del diseño. Toman el color del texto que acompañan.
 * Prohibido (README del sistema): miras, sirenas, calaveras, siluetas de "sospechosos", emojis.
 */
type Forma = { d: string } | { circulo: [number, number, number] } | { rect: [number, number, number, number, number] };

const ESCUDO = 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z';

export const ICONOS = {
  escudo: [{ d: ESCUDO }],
  escudoCheck: [{ d: ESCUDO }, { d: 'M9 12l2 2 4-4' }],
  escudoPausa: [{ d: ESCUDO }, { d: 'M10 9v6' }, { d: 'M14 9v6' }],
  escudoAviso: [{ d: ESCUDO }, { d: 'M12 9v4' }, { d: 'M12 16h.01' }],
  flecha: [{ d: 'M5 12h14' }, { d: 'M13 6l6 6-6 6' }],
  volver: [{ d: 'M15 6l-6 6 6 6' }],
  cerrar: [{ d: 'M6 6l12 12' }, { d: 'M18 6L6 18' }],
  telefono: [{ d: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2' }],
  ubicacion: [{ d: 'M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z' }, { circulo: [12, 10, 2.5] }],
  movimiento: [{ d: 'M3 12h4l3-8 4 16 3-8h4' }],
  candado: [{ rect: [5, 11, 14, 10, 2] }, { d: 'M8 11V8a4 4 0 0 1 8 0v3' }],
  mapa: [{ d: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z' }, { d: 'M9 4v14' }, { d: 'M15 6v14' }],
  grabar: [{ circulo: [12, 12, 8] }, { circulo: [12, 12, 3] }],
  persona: [{ circulo: [12, 8, 4] }, { d: 'M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6' }],
  huella: [{ d: 'M12 11c0 3-1 5-2 7' }, { d: 'M8 7a5 5 0 0 1 9 3c0 3-.5 5-1.5 7' }, { d: 'M5 10a7 7 0 0 1 1-3' }],
  check: [{ d: 'M5 12l5 5 9-10' }],
  mas: [{ d: 'M12 5v14' }, { d: 'M5 12h14' }],
  documento: [{ d: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z' }, { d: 'M14 3v6h6' }],
  celularSacudido: [{ rect: [7, 2, 10, 20, 2] }, { d: 'M11 18h2' }, { d: 'M2 8l3 2' }, { d: 'M22 8l-3 2' }],
  arrebato: [{ d: 'M8 3h7a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z' }, { d: 'M11 18h1' }, { d: 'M17 8l4-3' }, { d: 'M21 5v3' }],
  ojo: [{ d: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z' }, { circulo: [12, 12, 2.5] }],
  bolso: [{ d: 'M6 8h12l-1 12H7z' }, { d: 'M9 8V6a3 3 0 0 1 6 0v2' }],
  herramienta: [{ d: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z' }],
  bateria: [{ rect: [3, 7, 16, 10, 2] }, { d: 'M22 11v2' }, { d: 'M7 10v4' }],
  compartir: [{ d: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7' }, { d: 'M12 3v12' }, { d: 'M8 7l4-4 4 4' }],
  campana: [{ d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }, { d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' }],
  microfono: [{ rect: [9, 3, 6, 11, 3] }, { d: 'M5 11a7 7 0 0 0 14 0' }, { d: 'M12 18v3' }],
} satisfies Record<string, Forma[]>;

export type NombreIcono = keyof typeof ICONOS;

export function Icono({
  nombre,
  tam = 22,
  color,
  grosor = 2,
}: {
  nombre: NombreIcono;
  tam?: number;
  color: string;
  grosor?: number;
}) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round">
      {(ICONOS[nombre] as Forma[]).map((f, i) =>
        'd' in f ? (
          <Path key={i} d={f.d} />
        ) : 'circulo' in f ? (
          <Circle key={i} cx={f.circulo[0]} cy={f.circulo[1]} r={f.circulo[2]} />
        ) : (
          <Rect key={i} x={f.rect[0]} y={f.rect[1]} width={f.rect[2]} height={f.rect[3]} rx={f.rect[4]} />
        ),
      )}
    </Svg>
  );
}
