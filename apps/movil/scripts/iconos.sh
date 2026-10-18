#!/bin/sh
# Genera los PNG de los íconos de la app a partir de assets/marca/*.svg.
# Necesita rsvg-convert (macOS: brew install librsvg). Uso: npm run iconos -w @pixel-hack/movil
set -e
cd "$(dirname "$0")/../assets"
command -v rsvg-convert >/dev/null || { echo "Falta rsvg-convert: brew install librsvg" >&2; exit 1; }
rsvg-convert -w 1024 -h 1024 -b '#f2ece3' marca/icono.svg -o icon.png
rsvg-convert -w 512 -h 512 marca/android-frente.svg -o android-icon-foreground.png
rsvg-convert -w 512 -h 512 marca/android-fondo.svg -o android-icon-background.png
rsvg-convert -w 432 -h 432 marca/android-monocromo.svg -o android-icon-monochrome.png
rsvg-convert -w 1024 -h 1024 marca/splash.svg -o splash-icon.png
rsvg-convert -w 48 -h 48 marca/logo.svg -o favicon.png
echo "Íconos generados en apps/movil/assets/"
