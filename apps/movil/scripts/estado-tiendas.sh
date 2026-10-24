#!/bin/sh
# Resumen del estado de la publicación en las tiendas: lo que se puede saber sin abrir el navegador.
# Lo usa la skill /publicar-tiendas al empezar; también sirve a mano: `sh scripts/estado-tiendas.sh` desde apps/movil.
cd "$(dirname "$0")/.." || exit 1

echo "== Sesión de Expo (EAS)"
npx --yes eas-cli whoami 2>/dev/null | head -1 || echo "sin sesión: correr 'npx eas-cli login'"

echo
echo "== Últimos builds (tienda e internos)"
npx --yes eas-cli build:list --limit 6 --non-interactive --json 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    try {
      for (const b of JSON.parse(s)) {
        console.log([b.platform, b.status, b.buildProfile, `v${b.appVersion} (${b.appBuildVersion})`,
          b.createdAt.slice(0, 16), b.artifacts?.buildUrl ?? ""].join("  "));
      }
    } catch { console.log("no se pudo leer la lista de builds"); }
  });'

echo
echo "== Envíos a las tiendas (eas submit)"
npx --yes eas-cli submission:list --limit 4 --non-interactive 2>/dev/null || echo "sin envíos o comando no disponible"

echo
echo "== Archivos que tienen que existir"
for f in tienda/ficha.md public/privacidad/index.html; do
  [ -f "$f" ] && echo "ok     $f" || echo "FALTA  $f"
done
[ -f google-play-servicio.json ] && echo "ok     google-play-servicio.json (clave local, no va al repo)" \
  || echo "falta  google-play-servicio.json (solo hace falta para eas submit de Android)"
if [ -d tienda/capturas ]; then ls tienda/capturas | sed 's/^/captura: /'; else echo "falta  tienda/capturas (capturas para las fichas)"; fi
