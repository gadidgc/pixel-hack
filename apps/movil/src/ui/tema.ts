import { createContext, useContext } from 'react';

/**
 * Tokens del sistema de diseño "Alerta Arrebato" v2 (Negro cálido), copiados tal cual de
 * https://claude.ai/artifact/HW9kceGpSuZaAxxFtccVMj (project/tokens.json). Si cambian allá, se cambian aquí.
 *
 * - `noche`: tema por defecto de la app.
 * - `dia`: pleno sol y páginas web del contacto ("Me robaron", la ruta en vivo).
 * Un color, un significado: `protegido` = todo bajo control; `alerta` = robo o la acción de emergencia;
 * `aviso` = algo degradado; `info` = tu ubicación y enlaces. Nunca como decoración.
 */
export const COLORES = {
  noche: {
    fondo: '#0d0c0b',
    superficie: '#171513',
    superficie2: '#221f1b',
    brillo: 'rgba(255,236,214,0.16)',
    linea: '#302b26',
    texto: '#f2ece3',
    textoSuave: '#a59d92',
    protegido: '#8ee3c0',
    protegidoFondo: '#14271f',
    sobreProtegido: '#06140e',
    alerta: '#ff7a66',
    alertaFondo: '#361a15',
    sobreAlerta: '#1a0605',
    aviso: '#f2b544',
    avisoFondo: '#30240f',
    info: '#6fa8ff',
    // Mapa (derivados de los tokens, como en las pantallas)
    mapaFondo: '#0d0c0b',
    mapaCalle: '#221f1b',
    mapaCalleChica: '#1a1815',
    mapaParque: '#152019',
    sombraHoja: 'rgba(0,0,0,0.5)',
  },
  dia: {
    fondo: '#f6f2ec',
    superficie: '#fffdf9',
    superficie2: '#ece6dd',
    brillo: 'rgba(255,255,255,0.9)',
    linea: '#ddd3c6',
    texto: '#1b1814',
    textoSuave: '#5f564c',
    protegido: '#0b7a5c',
    protegidoFondo: '#dcf1e7',
    sobreProtegido: '#ffffff',
    alerta: '#c2412d',
    alertaFondo: '#fbe4dd',
    sobreAlerta: '#ffffff',
    aviso: '#8a5a00',
    avisoFondo: '#f8ecd3',
    info: '#1f5fc7',
    mapaFondo: '#ebe5dc',
    mapaCalle: '#ffffff',
    mapaCalleChica: '#fbf8f3',
    mapaParque: '#d6ece4',
    sombraHoja: 'rgba(26,23,20,0.12)',
  },
} as const;

export type Colores = { [K in keyof (typeof COLORES)['noche']]: string };

/** Familias cargadas con expo-font (@expo-google-fonts). En React Native el peso va en la familia. */
export const FUENTES = {
  titular: 'Lexend_600SemiBold',
  titularMedio: 'Lexend_500Medium',
  titularFino: 'Lexend_300Light',
  texto: 'Figtree_400Regular',
  textoMedio: 'Figtree_500Medium',
  textoFuerte: 'Figtree_600SemiBold',
  datos: 'IBMPlexMono_400Regular',
  datosMedio: 'IBMPlexMono_500Medium',
} as const;

export const ESPACIO = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 } as const;
export const RADIO = { s: 18, m: 22, l: 28, total: 999 } as const;
export const CONTROL = { toqueMin: 48, botonAlto: 56, iconoCirculo: 40 } as const;

/** Estilos de texto del sistema (tokens.json → type.groups). */
export const TIPO = {
  estado: { fontFamily: FUENTES.titular, fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  titulo: { fontFamily: FUENTES.titular, fontSize: 22, lineHeight: 28 },
  titulo26: { fontFamily: FUENTES.titular, fontSize: 26, lineHeight: 32 },
  subtitulo: { fontFamily: FUENTES.titularMedio, fontSize: 18, lineHeight: 24 },
  cuerpo: { fontFamily: FUENTES.texto, fontSize: 16, lineHeight: 24 },
  cuerpoFuerte: { fontFamily: FUENTES.textoFuerte, fontSize: 16, lineHeight: 24 },
  cuerpo15: { fontFamily: FUENTES.texto, fontSize: 15, lineHeight: 22 },
  cuerpo15Fuerte: { fontFamily: FUENTES.textoFuerte, fontSize: 15, lineHeight: 22 },
  apoyo: { fontFamily: FUENTES.texto, fontSize: 14, lineHeight: 20 },
  apoyo13: { fontFamily: FUENTES.texto, fontSize: 13, lineHeight: 18 },
  etiqueta: { fontFamily: FUENTES.textoFuerte, fontSize: 12, lineHeight: 16, letterSpacing: 0.96 },
  datoGrande: { fontFamily: FUENTES.datosMedio, fontSize: 28, lineHeight: 32 },
  dato20: { fontFamily: FUENTES.datosMedio, fontSize: 20, lineHeight: 24 },
  dato: { fontFamily: FUENTES.datosMedio, fontSize: 15, lineHeight: 20 },
  hora: { fontFamily: FUENTES.datos, fontSize: 13, lineHeight: 16 },
} as const;

export const TemaContexto = createContext<Colores>(COLORES.noche);

export function useTema(): Colores {
  return useContext(TemaContexto);
}
