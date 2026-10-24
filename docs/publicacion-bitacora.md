# Bitácora de publicación en las tiendas

Cada avance de [publicacion-tiendas.md](publicacion-tiendas.md), el más nuevo arriba. La escribe el agente
`/publicar-tiendas` al terminar cada sesión, y cualquiera del equipo puede agregar una línea.

**Formato:** `### AAAA-MM-DD · quién` y debajo: qué se hizo, qué falta y si alguien está bloqueado.
No pongas claves, códigos 2FA, correos de testers ni datos personales.

## Estado de un vistazo

| | Android (Google Play) | iPhone (App Store) |
|---|---|---|
| Cuenta de desarrollador | ✅ personal "gadidgc" (gabrieldgc1999@gmail.com), comparte cuenta con ExamPrazol | ✅ individual "gabriel gonza" |
| App creada en la consola | ✅ "Vigía: alerta de arrebato" (es-419, gratis) | ✅ "Vigía: alerta de arrebato" (Apple ID 6826638823) |
| Build de tienda | ⏳ `.aab` versionCode 2 compilando en EAS (24 oct) | ⚠️ build 2 (18 oct) existe pero **no se subió**; falta `eas submit` |
| Política de privacidad publicada | ✅ https://alerta.gadidgc.com/privacidad/ (puesta en la consola) | ✅ misma URL (puesta en la consola) |
| Ficha (textos) | ❌ | ✅ subtítulo, categorías, descripción, palabras clave, URLs, notas para el revisor |
| Capturas | ❌ | ❌ |
| Formularios (datos, edad, permisos) | ❌ | ❌ privacidad de la app y clasificación por edad |
| Prueba cerrada / revisión | ❌ | ❌ |
| Publicada | ❌ | ❌ (lanzamiento **manual** después de aprobar) |

## Entradas

### 2026-10-24 (noche) · Claude
- Con el OK de Gabriel: aceptadas las declaraciones de Play (políticas del programa y leyes de exportación de EE. UU.) y
  **creada la app en Play Console**: "Vigía: alerta de arrebato", `pe.pixelhack.alertaarrebato`, español de Latinoamérica, gratis.
- **Política de privacidad publicada** en https://alerta.gadidgc.com/privacidad/ (dominio propio del Worker) y puesta en Play
  (Contenido de la app) y en App Store Connect (Privacidad de la app).
- `npm run desplegar` falló en el paso de migraciones de D1 (Cloudflare 7403: el token de `wrangler` no tiene permiso para D1;
  arreglo: `npx wrangler login`). Como esta vez no había migraciones nuevas, se publicó solo con `wrangler deploy`.
  Revisado después: /privacidad, /descargar y /api/reportes responden 200.
- Gabriel corre él mismo `eas submit -p ios`.
- Siguiente: subir el `.aab` a prueba interna en Play (a mano, es el primero), capturas, etiquetas de privacidad y
  clasificación por edad en las dos tiendas.

### 2026-10-24 (tarde) · Claude
- **Corrección:** la entrada anterior decía que la app de iPhone ya estaba creada en App Store Connect. No lo estaba:
  solo existía ExamPrazol. El build 2 de iOS nunca se subió.
- La cuenta de Google Play es la personal **gadidgc** (en gabrieldgc1999@gmail.com, no en gabrielito.xvr). Ya tiene ExamPrazol
  en prueba cerrada. Su nombre público de desarrollador lo comparten las dos apps: cambiarlo a "pixel-hack" también cambia ExamPrazol.
- App Store Connect: creada la app. **"Vigía" ya estaba tomado**, quedó **"Vigía: alerta de arrebato"** (se puede cambiar en
  otra versión). SKU `vigia-pixelhack`, idioma Spanish (Mexico). `ascAppId` 6826638823 en `eas.json`.
- Llenado y guardado (borrador): subtítulo "Avisa a tu familia al toque", categorías Utilidades + Estilo de vida, descripción,
  palabras clave, URL de soporte (repo) y de marketing (/descargar), copyright, notas para el revisor, sin inicio de sesión,
  lanzamiento manual.
- `eas submit -p ios` no corre solo: necesita una clave de API de App Store Connect, y EAS la crea solo si Gabriel inicia
  sesión de Apple una vez en su terminal.
- Android: lanzado el build `.aab` (versionCode 2). EAS creó la clave de firma (keystore) en la nube.
- **Bloqueado en Gabriel:** correr `npx eas-cli submit -p ios --latest --profile production` en `apps/movil` (Apple ID + 2FA),
  y decir si se aceptan las declaraciones de Play para crear la app y si se despliega la política de privacidad.
- Siguiente: capturas (iPhone 6,9" y Android), privacidad de la app y clasificación por edad en Apple, crear la app en Play
  y subir el `.aab` a prueba interna.

### 2026-10-24 · Claude (con Gabriel)
- Nueva fase: publicar en Google Play y App Store. Plan en `publicacion-tiendas.md`.
- Revisado el estado real:
  - EAS (Expo) con sesión iniciada como `gadidgc`. Último build de tienda: iOS 0.1.0 (build 2), 18 oct. No hay build de Android para tienda.
  - Play Console (Chrome, gabrielito.xvr@gmail.com): abre la pantalla de **crear cuenta de desarrollador** → no hay cuenta.
  - App Store Connect: Chrome **sin sesión iniciada**.
- Creado: este registro, la ficha de las tiendas (`apps/movil/tienda/ficha.md`), el borrador de política de privacidad
  (`apps/movil/public/privacidad/`), el envío de Android en `eas.json` y la skill `/publicar-tiendas`.
- **Bloqueado en Gabriel:** (1) crear la cuenta de Google Play (tipo "Yourself", nombre de desarrollador "pixel-hack");
  (2) iniciar sesión en App Store Connect en Chrome.
- Siguiente: publicar la política de privacidad (deploy del Worker), compilar el `.aab`, hacer capturas.
