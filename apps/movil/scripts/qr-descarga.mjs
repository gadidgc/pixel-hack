// Genera los QR de la página de descarga (public/descargar/img/).
// Uso:  npm run qr:descarga -w @pixel-hack/movil -- [enlace-iphone]
// Sin argumento, el QR de iPhone abre la versión web. Cuando haya TestFlight,
// pasa su enlace público y cambia también el href de #boton-iphone en index.html.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { toQR } from 'toqr';

const SITIO = 'https://alerta-arrebato.gabrieldgc1999.workers.dev';
const enlaces = {
  'qr-android.svg': `${SITIO}/api/descargar/android`,
  'qr-iphone.svg': process.argv[2] ?? `${SITIO}/`,
};

/** Dibuja el QR como SVG: módulos negro cálido sobre blanco, con 4 módulos de margen. */
function qrSvg(texto) {
  const modulos = toQR(texto, 3); // 3 = corrección de errores nivel Q
  const n = Math.round(Math.sqrt(modulos.length));
  const margen = 4;
  const total = n + 2 * margen;
  let trazo = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) if (modulos[y * n + x]) trazo += `M${x} ${y}h1v1h-1z`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><path transform="translate(${margen} ${margen})" fill="#0d0c0b" d="${trazo}"/></svg>`;
}

const carpeta = fileURLToPath(new URL('../public/descargar/img/', import.meta.url));
for (const [archivo, enlace] of Object.entries(enlaces)) {
  writeFileSync(carpeta + archivo, qrSvg(enlace));
  console.log(`${archivo} → ${enlace}`);
}
