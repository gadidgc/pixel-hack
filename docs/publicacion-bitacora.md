# Bitácora de publicación en las tiendas

Cada avance de [publicacion-tiendas.md](publicacion-tiendas.md), el más nuevo arriba. La escribe el agente
`/publicar-tiendas` al terminar cada sesión, y cualquiera del equipo puede agregar una línea.

**Formato:** `### AAAA-MM-DD · quién` y debajo: qué se hizo, qué falta y si alguien está bloqueado.
No pongas claves, códigos 2FA, correos de testers ni datos personales.

## Estado de un vistazo

| | Android (Google Play) | iPhone (App Store) |
|---|---|---|
| Cuenta de desarrollador | ✅ personal "gadidgc" (comparte cuenta con ExamPrazol) | ✅ individual |
| App creada en la consola | ✅ "Vigía: alerta de arrebato" (es-419, gratis) | ✅ "Vigía: alerta de arrebato" (Apple ID 6826638823) |
| Build de tienda | ✅ `.aab` versionCode 2 subido a prueba interna (borrador) | ✅ build 5 subido (eas submit con la clave de API existente) y asociado a la versión 1.0 |
| Política de privacidad | ✅ https://alerta.gadidgc.com/privacidad/ | ✅ misma URL |
| Ficha (textos) | ✅ descripción corta y completa | ✅ subtítulo, descripción, palabras clave, URLs, notas |
| Gráficos | ✅ ícono 512, gráfico 1024×500, 4 capturas | ✅ 5 capturas (6,3", Apple las usa para todos los iPhone) |
| Clasificación por edad | ✅ cuestionario IARC enviado (Gabriel puso el correo y aceptó los términos) | ✅ 18+ |
| Privacidad / seguridad de datos | ✅ 7 tipos, nada compartido, sin anuncios | ✅ publicada (7 tipos, sin rastreo) |
| Otras declaraciones | ✅ anuncios, acceso, público 18+, ID de publicidad, gobierno, finanzas, salud | — |
| Prueba cerrada / revisión | ❌ falta invitar 12 testers | ❌ falta subir el build y enviar a revisión |
| Publicada | ❌ | ❌ (lanzamiento **manual** después de aprobar) |

## Entradas

### 2026-10-24 (noche, 4) · Claude
- Gabriel corrió `eas submit -p ios`: usó la clave de API de App Store Connect que ya existía (C4L44LS6R7, del equipo).
  Apple procesó el build 5 y quedó asociado a la versión 1.0.
- Precio: **gratis**. Disponibilidad: **solo Perú** (la app usa +51, Yape, operadoras peruanas; además evita el trámite de
  la Unión Europea). Se pueden sumar países de Latinoamérica después.
- **Falta (Gabriel):** contacto para el revisor de Apple (nombre, apellido, teléfono, correo) y apretar "Add for Review" →
  "Submit to App Review".

### 2026-10-24 (noche, 3) · Claude
- Builds 3 y 4 de iOS fallaron: EAS buscaba el target **'Viga'** (borra la "í"). El arreglo de `app.config.js` solo corría en
  los servidores; ahora la variable `NOMBRE_SIN_TILDE=1` va en la parte `ios.env` de los perfiles de `eas.json`, que EAS usa en
  la Mac y en la nube. **Build 5 terminó bien.**
- Play: Gabriel puso el correo y aceptó los términos de IARC; Claude respondió el resto. Respuestas: contenido de usuarios sí
  (reportes y videos en "Cerca"), comparte ubicación precisa con otros sí (el aviso a la familia), sin compras, sin desnudos ni
  violencia gráfica. **Play Console: todas las declaraciones completas.**
- **Pendiente para la app (riesgo en la revisión de Google):** no hay forma de **reportar ni bloquear** un reporte o video de la
  comunidad. La política de contenido generado por usuarios de Google lo pide. Hay que agregar un botón "Reportar" en el detalle.
- Siguiente: Gabriel corre `eas submit -p ios`; luego enviar a revisión de Apple; en Play, invitar testers a la prueba cerrada.

### 2026-10-24 (noche, 2) · Claude
- Play: subido el `.aab` (lo arrastró Gabriel) a **prueba interna**, guardado como borrador con notas de la versión.
- Clasificación por edad en Apple: sin violencia, sin contenido sexual, contenido de usuarios = sí. Calculó 4+; la subimos a
  **18+** porque la política de privacidad dice que la app no es para menores de 18. Play: público objetivo 18+.
- Etiquetas de privacidad de Apple publicadas y "Seguridad de los datos" de Play guardada: ubicación precisa, nombre,
  contactos, videos, audio, reportes de la comunidad e identificador de la instalación; todo para que la app funcione,
  nada para publicidad ni rastreo, nada compartido con terceros.
- Play: declaraciones de anuncios (no), acceso sin inicio de sesión, ID de publicidad (no; el build no pide `AD_ID`),
  app de gobierno (no), funciones financieras (ninguna), salud (ninguna).
- **Capturas:** iPhone en el simulador iPhone 17 Pro Max (1320×2868; Apple ahora pide 6,3" = 1206×2622 y las escala);
  Android en el emulador (1080×1920). Datos de ejemplo: "Carmen", contacto "Rosa" 999 999 999 (no son personas reales).
  En las dos se compiló sin servidor (`EXPO_PUBLIC_URL_ALERTAS=ninguno`): no salió ningún mensaje.
- El simulador de iPhone no tiene acelerómetro: agregué el **modo capturas** (`EXPO_PUBLIC_MODO_CAPTURAS=1`, perfil
  `capturas` de `eas.json`) que, solo sin acelerómetro, simula un celular quieto para mostrar "Estás protegida". El detector
  no cambia. En Android se usó el sensor del emulador y el ensayo de alerta real ("¿Todo bien?").
- Gráfico de funciones de Play generado con `apps/movil/scripts/grafico-tienda.py` (foto de /descargar + fuente Lexend).
- `ios.supportsTablet` pasa a `false`: si no, Apple exige capturas de iPad. En iPad la app igual corre en modo iPhone.
- **Build 3 de iOS falló**: "Could not find target 'Vigia'". La tilde de "Vigía" rompe el nombre del proyecto de Xcode.
  Arreglo en `app.config.js`: en builds de iOS el proyecto se llama "Vigia" y el nombre visible sigue "Vigía". Build 4 en marcha.
- **Riesgos para la revisión de Google** (anotados en el plan): `USE_FULL_SCREEN_INTENT` y `SYSTEM_ALERT_WINDOW` están
  restringidos; la app pide administrador del dispositivo para bloquear la pantalla.
- **Pendiente de Gabriel:** (1) clasificación de contenido de Play: correo de contacto + aceptar términos de IARC;
  (2) correr `npx eas-cli submit -p ios --latest --profile production` cuando termine el build 4; (3) juntar 12 testers.

### 2026-10-24 (noche) · Claude
- Con el OK de Gabriel: aceptadas las declaraciones de Play (políticas del programa y leyes de exportación de EE. UU.) y
  **creada la app en Play Console**: "Vigía: alerta de arrebato", `pe.pixelhack.alertaarrebato`, español de Latinoamérica, gratis.
- **Política de privacidad publicada** en https://alerta.gadidgc.com/privacidad/ (dominio propio del Worker) y puesta en Play
  (Contenido de la app) y en App Store Connect (Privacidad de la app).
- `npm run desplegar` falló en el paso de migraciones de D1 (Cloudflare 7403: el token de `wrangler` no tiene permiso para D1;
  arreglo: `npx wrangler login`). Como esta vez no había migraciones nuevas, se publicó solo con `wrangler deploy`.
  Revisado después: /privacidad, /descargar y /api/reportes responden 200.
- Gabriel corre él mismo `eas submit -p ios`.
- El `.aab` terminó (versionCode 2, 68 MB). Pesa más que el límite de 10 MB de la herramienta del navegador, así que la
  primera subida la hace Gabriel: dejé abierta la página "Crear versión de prueba interna" en Play Console.
- Siguiente: capturas, etiquetas de privacidad y
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
