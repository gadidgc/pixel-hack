# Publicar Vigía en Google Play y App Store

**Fase actual (desde el 24 de octubre de 2026):** el hackatón terminó. El objetivo ahora es que Vigía esté
publicada en **Google Play** (Android) y en la **App Store** (iPhone), con el equipo pixel-hack como autor.

- **Cómo vamos:** [publicacion-bitacora.md](publicacion-bitacora.md) (la bitácora: cada avance, con fecha).
- **Textos de la ficha y respuestas de los formularios:** [apps/movil/tienda/ficha.md](../apps/movil/tienda/ficha.md).
- **El agente que hace el trabajo:** la skill `/publicar-tiendas` ([.claude/skills/publicar-tiendas](../.claude/skills/publicar-tiendas/SKILL.md)).
  Lee la bitácora, mira el estado real (EAS, consolas en el navegador), hace el siguiente paso que pueda hacer solo
  y le pide a Gabriel solo lo que exige una persona (pagar, iniciar sesión, 2FA, aceptar contratos).

## Lo que solo puede hacer una persona (Gabriel)

Claude no crea cuentas, no escribe contraseñas, no paga y no acepta contratos por nadie. Eso queda para Gabriel:

| Qué | Dónde | Costo |
|---|---|---|
| Crear la cuenta de desarrollador de Google Play | play.google.com/console/signup | US$ 25, una vez |
| Verificar identidad en Google (DNI/pasaporte) y el teléfono | Play Console | — |
| Iniciar sesión en App Store Connect y dar el código 2FA | appstoreconnect.apple.com | (cuenta de Apple ya pagada: US$ 99/año) |
| Aceptar acuerdos nuevos de Apple o Google cuando aparezcan | cada consola | — |
| Crear la clave de servicio de Google para subir builds solo (`eas submit`) | Google Cloud | — |
| Conseguir 12 testers para la prueba cerrada de Google (ver abajo) | familia y amigos | — |

## Android (Google Play)

1. **Cuenta de desarrollador.** Tipo **"Yourself"** (personal) es lo más rápido. Una **organización** necesita un
   número D-U-N-S y una empresa registrada; no la tenemos.
2. **Regla de las cuentas personales nuevas** (fuentes secundarias, confirmar en la ayuda de Google): antes de pasar a
   producción hace falta una **prueba cerrada con al menos 12 testers inscritos durante 14 días seguidos**. Si baja de 12,
   el conteo vuelve a empezar. Los 4 del equipo + familia y amigos con Android.
   **Esto marca el calendario:** lo más pronto que Vigía sale al público en Play es ~15 días después de abrir la prueba cerrada.
3. **Crear la app** en Play Console: nombre "Vigía", idioma es-419 (español de Latinoamérica), app gratuita.
4. **Primer build (AAB).** `eas build -p android --profile production` genera un `.aab`. **La primera subida es a mano**
   en la consola (Google no deja crear la ficha por API); las siguientes van con `eas submit -p android`.
5. **Formularios obligatorios** (las respuestas están en `tienda/ficha.md`): política de privacidad (URL), acceso a la app,
   anuncios (no), clasificación de contenido, público objetivo (18+), seguridad de los datos, app gubernamental (no),
   funciones financieras (no), salud (no).
6. **Permisos sensibles, los que más riesgo de rechazo tienen:**
   - **Ubicación en segundo plano:** Google pide una declaración y **un video corto** (YouTube, puede ser no listado)
     que muestre la pantalla que explica el uso antes del permiso y la función en marcha.
   - **Servicio en primer plano de tipo ubicación** (`FOREGROUND_SERVICE_LOCATION`): otra declaración con video.
   - `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`: Google lo limita; hay que justificar que la detección debe seguir con la
     pantalla apagada. Si lo rechazan, lo sacamos y llevamos al usuario a los ajustes de batería.
   - **Permisos restringidos que trae el build** (revisados en el emulador): `USE_FULL_SCREEN_INTENT` (Google lo limita a
     alarmas y llamadas; hay que declararlo o quitarlo), `SYSTEM_ALERT_WINDOW` y el **administrador del dispositivo**
     para bloquear la pantalla. Si Google los rechaza, el plan B es quitarlos y dejar el bloqueo de Google (Protección antirrobo).
7. **Ficha:** ícono 512×512, gráfico de funciones 1024×500, al menos 2 capturas de celular, descripciones.
8. **Prueba interna → prueba cerrada (12 testers, 14 días) → pedir acceso a producción** (Google hace preguntas sobre
   la prueba) → **producción** en Perú primero.

## iPhone (App Store)

1. La cuenta de Apple Developer ya existe y ya hay un build en TestFlight (ver [testflight-iphone.md](testflight-iphone.md)).
2. **Ficha en App Store Connect:** renombrar la app a "Vigía", subtítulo, descripción, palabras clave, URL de soporte y
   de privacidad, categoría (Utilidades o Estilo de vida), clasificación por edad.
3. **Capturas:** App Store Connect pide el tamaño de 6,3" (1206×2622) y lo usa para todos los iPhone. Ya están en
   `apps/movil/tienda/capturas/`. `ios.supportsTablet` quedó en `false` para que no pida capturas de iPad.
   Cómo se hicieron (simulador, emulador y modo capturas): ver la bitácora del 24 de octubre.
4. **Privacidad de la app** ("etiquetas nutricionales"): ubicación precisa, contactos (nombre y teléfono que el usuario
   escribe), audio y video (evidencia), identificador del dispositivo. Nada se usa para rastrear ni publicidad.
5. **Revisión de Apple:** notas para el revisor que expliquen la ubicación "siempre" y cómo probar sin robo real
   (el texto está en `tienda/ficha.md`). La primera revisión tarda de 1 a 3 días.
6. **Tiempo de uso** (`family-controls`): sigue fuera del build de tienda (`SIN_TIEMPO_DE_USO=1`) hasta que Apple
   apruebe el formulario aparte.

## Autoría: cómo aparece el equipo

Las tiendas muestran **un solo "desarrollador"**: el titular de la cuenta. No hay campo de coautores. Lo que sí se puede:

- **Google Play:** en una cuenta personal, el **nombre de desarrollador público** puede ser **"pixel-hack"** (no tiene que
  ser el nombre legal). Es lo que se ve bajo el nombre de la app.
- **App Store:** en una cuenta individual, Apple muestra el **nombre legal** de Gabriel como vendedor. Para que diga
  "pixel-hack" haría falta una cuenta de organización (D-U-N-S y empresa). Por ahora: nombre de Gabriel.
- **En la descripción de las dos tiendas**, al final: "Hecho en Lima por el equipo pixel-hack (Gabriel, Cesar,
  Mauricio y Piero) en Hack the Andes 2026." Si cada uno quiere su apellido, que lo confirme; no los adivinamos.
- **Dentro de la app** (pantalla "Tú" → Acerca de): los cuatro nombres con su enlace (LinkedIn o GitHub).
- **Acceso a las consolas:** invitar a Cesar, Mauricio y Piero en Play Console (Usuarios y permisos) y en App Store
  Connect (Usuarios y acceso) con permiso de solo lectura o de marketing, para que puedan mostrar que son parte.
- **Para la reputación de cada uno:** con la app publicada, cada integrante la agrega en LinkedIn (Proyectos, con el
  enlace a las dos tiendas y al repo) y el README tiene la sección "Equipo" con los enlaces.

## Calendario estimado

| Paso | Depende de | Tiempo |
|---|---|---|
| Ficha de App Store lista y enviada a revisión | capturas + política de privacidad publicada | 1–2 días de trabajo |
| Aprobación de Apple | revisión | 1–3 días (puede haber idas y vueltas) |
| Cuenta de Google Play verificada | Gabriel paga y verifica identidad | 1–3 días |
| Prueba cerrada en Play | 12 testers inscritos | 14 días seguidos |
| Acceso a producción en Play | respuesta de Google | ~7 días |

Estimación: **App Store a inicios de noviembre; Google Play a mediados o fines de noviembre.**
