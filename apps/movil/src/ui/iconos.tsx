import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

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
  mensaje: [{ d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }],
  enviar: [{ d: 'M22 2L11 13' }, { d: 'M22 2l-7 20-4-9-9-4z' }],
  ajustes: [{ circulo: [12, 12, 3] }, { d: 'M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1' }],
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

/**
 * Glifo de la marca: un celular inclinado que "sale volando" con dos ondas de aviso, en una cuadrícula
 * de 24. Es el mismo dibujo de assets/marca/*.svg (íconos de la app) y de la landing; si cambia, cambia en los tres.
 */
export const MARCA_GLIFO = {
  celular: { x: 5.5, y: 7.5, ancho: 8, alto: 14, radio: 2.2, giro: 'rotate(14 9.5 14.5)' },
  ondas: ['M15.8 5.98A2.8 2.8 0 0 1 17.86 8.44', 'M16.52 3.27A5.6 5.6 0 0 1 20.65 8.19'],
  centrado: 'translate(-0.3 -0.3)',
} as const;

function GlifoMarca({ color }: { color: string }) {
  const g = MARCA_GLIFO;
  return (
    <G transform={g.centrado}>
      <Rect x={g.celular.x} y={g.celular.y} width={g.celular.ancho} height={g.celular.alto} rx={g.celular.radio} transform={g.celular.giro} fill={color} />
      {g.ondas.map((d) => (
        <Path key={d} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      ))}
    </G>
  );
}

/** Logo de Alerta Arrebato: ficha redondeada con el glifo. Para tamaños chicos (encabezados, íconos). */
export function Marca({ tam = 32, ficha, glifo }: { tam?: number; ficha: string; glifo: string }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24" accessibilityLabel="Alerta Arrebato">
      <Rect width={24} height={24} rx={6.75} fill={ficha} />
      <G transform="translate(12 12) scale(0.7) translate(-12 -12)">
        <GlifoMarca color={glifo} />
      </G>
    </Svg>
  );
}

/** Solo el glifo, sin ficha: para ilustraciones grandes (la bienvenida), donde una ficha clara encandila. */
export function MarcaGlifo({ tam = 24, color }: { tam?: number; color: string }) {
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      <GlifoMarca color={color} />
    </Svg>
  );
}
