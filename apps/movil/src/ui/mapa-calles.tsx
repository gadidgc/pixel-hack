import { Image, Linking, Platform, Pressable, View } from 'react-native';
import { T } from './componentes';
import { useTema } from './tema';

/**
 * Mapa con calles reales: teselas (tiles, imágenes de 256 × 256 px) de OpenStreetMap, ubicadas con la
 * proyección Web Mercator, la misma que usan Google Maps y OSM. La ruta y los puntos se proyectan con
 * las mismas cuentas, así que caen exactos sobre las calles. Sin dependencias ni claves.
 *
 * Política de uso de las teselas de OSM (https://operations.osmfoundation.org/policies/tiles/): pedimos
 * solo las que se ven (unas 12 a 20 por pantalla), sin descargas masivas, y mostramos "© OpenStreetMap".
 */

export interface Coordenada {
  lat: number;
  lon: number;
}

export interface Punto {
  x: number;
  y: number;
}

/** Cómo se ve el mundo en pantalla: nivel de zoom y qué píxel del mundo cae en la esquina (0, 0). */
export interface Encuadre {
  zoom: number;
  origenX: number;
  origenY: number;
}

export interface Zona {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

const TAM_TESELA = 256;
const LAT_MAX = 85.05112878; // Web Mercator no llega a los polos
export const ZOOM_MIN = 3;
/** Zoom 17 ≈ 1,1 m por píxel en Lima: una ruta cortita no se agranda más que eso. */
export const ZOOM_MAX = 17;

/** Píxel del mundo (Web Mercator) de una coordenada, en el nivel de zoom dado. */
export function aMundo(p: Coordenada, zoom: number): Punto {
  const lado = TAM_TESELA * 2 ** zoom;
  const lat = Math.max(-LAT_MAX, Math.min(LAT_MAX, p.lat));
  const seno = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((p.lon + 180) / 360) * lado,
    y: (0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI)) * lado,
  };
}

/**
 * Elige el zoom más cercano que deja todos los puntos dentro de la zona libre de la pantalla (entre la
 * cabecera y la hoja) y los centra en ella.
 */
export function encuadrar(puntos: Coordenada[], zona: Zona, zoomMax = ZOOM_MAX): Encuadre {
  if (puntos.length === 0) return { zoom: ZOOM_MIN, origenX: 0, origenY: 0 };
  const base = puntos.map((p) => aMundo(p, 0));
  const xs = base.map((p) => p.x);
  const ys = base.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const escala = Math.min(zona.ancho / Math.max(x1 - x0, 1e-12), zona.alto / Math.max(y1 - y0, 1e-12));
  const zoom = Math.max(ZOOM_MIN, Math.min(zoomMax, Math.floor(Math.log2(escala))));
  const f = 2 ** zoom;
  return {
    zoom,
    origenX: ((x0 + x1) / 2) * f - (zona.x + zona.ancho / 2),
    origenY: ((y0 + y1) / 2) * f - (zona.y + zona.alto / 2),
  };
}

/** Dónde cae una coordenada en la pantalla, con el encuadre dado. */
export function aPantalla(p: Coordenada, e: Encuadre): Punto {
  const m = aMundo(p, e.zoom);
  return { x: m.x - e.origenX, y: m.y - e.origenY };
}

export interface Tesela {
  url: string;
  izquierda: number;
  arriba: number;
}

/** Las teselas que cubren una pantalla de ancho × alto, nada más. */
export function teselasVisibles(e: Encuadre, ancho: number, alto: number): Tesela[] {
  const n = 2 ** e.zoom;
  const [c0, c1] = [Math.floor(e.origenX / TAM_TESELA), Math.floor((e.origenX + ancho) / TAM_TESELA)];
  const [f0, f1] = [Math.floor(e.origenY / TAM_TESELA), Math.floor((e.origenY + alto) / TAM_TESELA)];
  const teselas: Tesela[] = [];
  for (let fila = Math.max(0, f0); fila <= Math.min(n - 1, f1); fila++) {
    for (let col = c0; col <= c1; col++) {
      const x = ((col % n) + n) % n; // la longitud da la vuelta al mundo
      teselas.push({
        url: `https://tile.openstreetmap.org/${e.zoom}/${x}/${fila}.png`,
        izquierda: col * TAM_TESELA - e.origenX,
        arriba: fila * TAM_TESELA - e.origenY,
      });
    }
  }
  return teselas;
}

// En el celular la política de OSM pide identificarse; en la web el navegador ya manda el Referer.
const CABECERAS = Platform.OS === 'web' ? undefined : { 'User-Agent': 'AlertaArrebato/1.0 (Hack the Andes 2026)' };
// Calles un poco apagadas para que la ruta coral se lea bien (en la web con filtro; en todos, con un velo).
const FILTRO_WEB = Platform.OS === 'web' ? ({ filter: 'saturate(0.35) contrast(0.92)' } as object) : null;

/**
 * Fondo de mapa real que llena a su padre. `ancho` y `alto` son los del lienzo (medidos con onLayout).
 * `arribaCredito` ubica el "© OpenStreetMap" justo debajo de la cabecera, para que siempre se vea.
 */
export function MapaCalles({ encuadre, ancho, alto, arribaCredito }: { encuadre: Encuadre; ancho: number; alto: number; arribaCredito: number }) {
  const c = useTema();
  const teselas = ancho > 0 && alto > 0 ? teselasVisibles(encuadre, ancho, alto) : [];
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: c.mapaFondo, overflow: 'hidden' }} pointerEvents="box-none">
      <View style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }, FILTRO_WEB]} pointerEvents="none">
        {teselas.map((t) => (
          <Image
            key={t.url}
            source={{ uri: t.url, headers: CABECERAS }}
            style={{ position: 'absolute', left: t.izquierda, top: t.arriba, width: TAM_TESELA, height: TAM_TESELA }}
            accessibilityIgnoresInvertColors
          />
        ))}
      </View>
      <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: c.mapaFondo, opacity: 0.28 }} pointerEvents="none" />
      <Pressable
        onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')}
        accessibilityRole="link"
        accessibilityLabel="Datos del mapa: © colaboradores de OpenStreetMap"
        style={{ position: 'absolute', right: 6, top: arribaCredito + 6, backgroundColor: c.superficie, opacity: 0.9, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}
      >
        <T v="apoyo13" suave>
          © OpenStreetMap
        </T>
      </Pressable>
    </View>
  );
}
