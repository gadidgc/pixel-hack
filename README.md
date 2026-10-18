# Vigía · pixel-hack · Hack the Andes 2026 (track Seguridad)

> **Vigía** se llamaba antes *Alerta Arrebato*. Cambiamos solo el nombre visible: la URL (`alerta-arrebato…workers.dev`),
> la base de datos, el bundle ID y las plantillas de WhatsApp siguen con el nombre anterior para no romper nada.

App para iPhone, Android y web que, con los sensores del celular (acelerómetro, giroscopio y GPS),
**detecta cuando un ladrón en moto te arrancha el celular y avisa al instante** con la ubicación
y la ruta de huida, en los segundos antes de que lo apaguen.

Lima, 17 y 18 de octubre de 2026 · Equipo: Gabriel, Cesar, Mauricio, Piero.

- **Plan detallado y tareas por integrante:** [docs/PLAN.md](docs/PLAN.md)
- Investigación técnica: [docs/viabilidad-deteccion-arrebato-moto.md](docs/viabilidad-deteccion-arrebato-moto.md)
- Funcionalidades de la app (propuesta de Cesar): [docs/funcionalidades-app.md](docs/funcionalidades-app.md)
- ¿Y Google? Límites de su bloqueo y apps parecidas: [docs/limites-google-y-apps-parecidas.md](docs/limites-google-y-apps-parecidas.md)
- Resultados del banco de pruebas: [packages/detector/reportes/evaluacion.md](packages/detector/reportes/evaluacion.md)
- Rúbrica y contexto del evento: [CONTEXT.md](CONTEXT.md)
- **Presentación de la demo** (láminas + vista de presentador con guion y cronómetro): publicada en **https://vigia.gadidgc.com** (se abre desde cualquier computadora del evento, sin conectar una laptop nuestra). Código en [docs/presentacion/](docs/presentacion/index.html); para verla en local, `python3 -m http.server` en la raíz y entra a `/docs/presentacion/`. Tecla **P** = vista de presentador. Para volver a publicarla: `npm run publicar:presentacion`.

## Cómo funciona (en 20 segundos)
1. **Jalón:** pico de aceleración (≥ 1,5 g sin gravedad) y giro brusco (≥ 4 rad/s) en menos de medio segundo.
2. **No íbamos en un vehículo:** según el GPS, ni ahora ni en los últimos 2 minutos (auto en un semáforo).
3. **Huida inmediata:** empieza en ≤ 7 s y se confirma con 2 lecturas GPS seguidas a más de 15 km/h.
4. **Descartes:** si queda quieto y el GPS no se mueve (se cayó), si ya íbamos en vehículo, si la velocidad
   sube de a poco (auto que arranca) o si seguimos caminando, no hay alerta. Sin GPS no se alerta solo.

## Validado con datos reales
- **23/24** robos escenificados reales: jalón detectado (dataset SPU).
- **9 falsas alarmas en 93 horas** reales de 3 personas con el celular en la mano (≈ 1 cada 10 h; dataset SHL). La familia solo se entera a los 10 s, y el dueño puede cancelar con su PIN.
- **85–94%** de arrebatos completos semi-reales detectados (alerta a los ~4,5–6 s); **65–89%** en casos difíciles (ladrón lento, GPS lento, recién bajó del bus).
- Una **auditoría independiente** encontró que nuestras primeras pruebas eran optimistas; corregimos el detector y la app (ver el documento).
- Detalle, fuentes y limitaciones: [docs/validacion-datos-reales.md](docs/validacion-datos-reales.md). Todavía faltan grabaciones nuestras de arrebatos en bici.

Todo vive en [`packages/detector`](packages/detector), TypeScript puro sin dependencias, probado con un simulador físico.

## Estructura
```
packages/detector/   Algoritmo + simulador + pruebas + banco de pruebas (Node)
apps/movil/          App Expo / React Native (iOS, Android, web)
apps/api/            Backend: Cloudflare Workers + base de datos D1 (alertas, ruta en vivo, WhatsApp con Meta y SMS con Zavu)
docs/                Plan, investigación y rúbrica (docs/fase-1/ = lluvia de ideas archivada)
```

## Cómo correrlo
Necesitas Node 20 o más nuevo.
```bash
npm install                   # en la raíz del repo
npm test                      # pruebas del detector
npm run evaluar               # banco de pruebas → packages/detector/reportes/evaluacion.md
npm run movil                 # app: w = web, a = Android (emulador o Expo Go), i = iPhone
npm run dev -w @pixel-hack/api        # backend local en http://localhost:8787 (antes: npm run migrar:local -w @pixel-hack/api)
npm run desplegar -w @pixel-hack/api  # exporta la web, migra la base y publica todo en una URL con HTTPS
```
Para probar con sensores reales abre la app en tu celular (Expo Go o `npx expo run:android|ios` dentro de `apps/movil`).
En la web, los sensores solo funcionan con **HTTPS** y abriendo la página directo (no dentro de un iframe).

## Lo que ya funciona
- Detector con máquina de estados, filtro de gravedad con giroscopio, velocidad GPS calculada cuando el celular no la da, modo sin GPS y modo demo.
- Simulador físico con 26 escenarios (arrebatos y trampas: caídas, mototaxi, bache, frenazo, correr al bus…), recalibrado con datos reales.
- Validación con datasets reales de terceros (SHL, SPU) y pruebas automáticas (vitest), algunas con datos reales.
- App Expo: protección **en segundo plano** en iPhone y Android (módulo nativo propio + GPS en segundo plano; exige ubicación "Permitir siempre"), **PIN** para cancelar o apagar, estado real de la alerta (panel y familia), modo demo, **captura de sensores** (exporta CSV) y **simular** casos sin moverse.
- **Interfaz completa** con el sistema de diseño "Negro cálido": onboarding con prueba guiada, "¿Todo bien?" con cuenta regresiva, falsa alarma con PIN, página del contacto, "Me robaron", grabar evidencia, Cerca y ajustes (ver "Pantallas").
- **Backend** ([apps/api](apps/api)): recibe la alerta, guarda la ruta en vivo en la base de datos (Cloudflare D1), arma el enlace `/a/<id>` para cada contacto, avisa por **WhatsApp (Meta) y SMS (Zavu) a la vez**, avisa "está bien" si el dueño cancela y "X se encarga" al resto de la red. Borra los teléfonos al cancelar o a las 24 h. Publicado y probado en **https://alerta-arrebato.gabrieldgc1999.workers.dev** (la web de la app también vive ahí). **Probado en un celular real el 17 de octubre:** llegaron la alerta por WhatsApp (con la ruta) y por SMS, y el "está bien" al cancelar. Estado, límites y cómo probarlo: [docs/avisos-whatsapp-sms.md](docs/avisos-whatsapp-sms.md).
- **Página del contacto en vivo** (`/a/<id>`): dibuja la ruta real, se actualiza cada 2 s, dice hacia dónde va y a qué velocidad, botón a Google Maps y "Yo me encargo".
- **Kit de bloqueo de cuentas:** en la página del contacto, "Fue un robo: bloquear sus cuentas" (con un "¿seguro?" antes). Al confirmar aparece una lista guiada: el **1820** (ASBANC, conecta con el área de bloqueo de 17 bancos; El Comercio lo recomienda para Yape, y para Plin es una deducción nuestra porque Plin va sobre esos bancos), la operadora (para suspender la línea y bloquear el IMEI), la denuncia digital de la PNP y "Checa tu IMEI". Cada paso se marca y **toda la red ve quién ya lo hizo**. Confirmar y marcar exigen el enlace personal del contacto (`?c=<n>`); la dueña puede anular la confirmación con su PIN durante 24 h. La dueña guarda antes en "Tú → Para bloquear tus cuentas" sus bancos, su operadora, su número, su IMEI y, **si quiere, su DNI**; nadie los ve hasta que alguien confirme el robo, y se borran al cancelar o a las 24 h. **La app no bloquea nada sola**: no existe un formulario y los bancos verifican al titular por teléfono. Los números son fijos y con su fuente ([apps/api/src/bloqueo.ts](apps/api/src/bloqueo.ts)), nunca se buscan en internet durante un robo. **Probado en local** (backend con `wrangler dev` y la vista `/a/ejemplo`); falta probarlo publicado y con una alerta real.
- **Bloqueo al confirmar el arrebato (Android):** bloquea el celular al instante y abre el "¿Todo bien?" encima de la pantalla de bloqueo, para cancelar con el PIN de la app sin desbloquear Android. Inicio avisa si falta algún permiso. **Probado en un Samsung Galaxy A17 (Android 16) el 18 de octubre** con el ensayo de Herramientas: se bloqueó, apareció la pregunta encima del bloqueo y, al cancelar con el PIN, no llegó ningún mensaje a la red. En iPhone Apple no deja bloquear la pantalla (requeriría MDM). Detalle: [bloqueo por arrebato](docs/bloqueo-por-arrebato.md).
- Reproductor de grabaciones CSV reales en la terminal.
- **Página de descarga** publicada en **https://alerta.gadidgc.com/descargar** ([apps/movil/public/descargar](apps/movil/public/descargar)): botón y QR para Android (descarga directa del APK). El QR de las láminas lleva aquí, y la raíz del sitio también. **No hay versión web de la app** (la quitamos: confundía); en la web solo quedan las páginas del contacto (`/a/<id>` con el mapa en vivo y `/aviso` para el código del SMS). **El iPhone todavía no tiene app instalable:** cuando esté en TestFlight, agregar su botón y su QR. Las fotos son generadas con Gemini (no son personas reales).

## Ideas pendientes (todavía no funciona)
- **iPhone: bloqueo de verdad con Atajos.** Al confirmar el arrebato el backend manda un SMS con una palabra al número de la propia dueña, y su automatización de Atajos (guiada en el primer uso) bloquea la pantalla. Programado, sin probar en un iPhone físico. Ver [bloqueo por arrebato](docs/bloqueo-por-arrebato.md).
- **iPhone: tapar las apps con Tiempo de uso** al confirmar el arrebato (WhatsApp, banca, Safari; Teléfono y Ajustes no se pueden tapar), destaparlas al cancelar con el PIN, y guía a la Protección en caso de robo de Apple. **Programado y compila, sin probar en un iPhone físico.** Para TestFlight o App Store falta que Apple apruebe el permiso de Tiempo de uso.
- **Kit de bloqueo:** el enlace personal usa `?c=<n>` (un número), no un secreto por contacto: alguien que reciba el enlace reenviado podría confirmar cambiando ese número. Avisar por WhatsApp al resto de la red cuando alguien confirma el robo (hoy solo se ve en la página; falta una plantilla de Meta). Agregar los números directos de cada banco cuando los confirmemos en sus webs oficiales. Un agente programado que revise cada semana que los números sigan vigentes y abra un PR si cambian.
- **Bloqueo: falta probar** que la ruta GPS siga enviándose con el celular bloqueado, en la calle y con la red avisada.
- WhatsApp a cualquier persona sin que escriba antes: falta que Meta apruebe las plantillas (en revisión). El SMS ya llega a cualquiera, pero sin enlace (filtro antifraude de Zavu). Ver [docs/avisos-whatsapp-sms.md](docs/avisos-whatsapp-sms.md).
- Mapa con calles reales en la página del contacto (hoy la ruta real se dibuja sobre un mapa esquemático; el botón abre Google Maps).
- Probar en celulares reales la protección en segundo plano (ya está programada: módulo nativo + GPS en segundo plano; ver PLAN §5). Límites conocidos: si la persona **cierra la app deslizándola**, la protección se apaga (iPhone y Android); en Xiaomi, Redmi, POCO y Huawei hay que activar "Inicio automático" y "Sin restricciones" de batería (la app lleva a esa pantalla desde "Tú"). Para la demo: un Pixel, Samsung o iPhone.
- Arrebatos simulados en bici **con GPS**, grabados por nosotros (no existen datos públicos de arrebatos desde moto).
- Veto por Bluetooth del auto o Wi-Fi conocido (para las falsas alarmas en auto que quedan).
- Activarse sola al salir de casa o de lugares conocidos, reporte en PDF para la denuncia y huella digital (hoy se usa PIN).

## Pantallas
Diseño: [sistema de diseño](https://claude.ai/artifact/HW9kceGpSuZaAxxFtccVMj) y [14 pantallas](https://claude.ai/artifact/3kUXLiWYpeJsixzCv4dpZp). Detalle por flujo (F1–F8) en [PLAN §7](docs/PLAN.md#7-interfaz).
- **Onboarding (F1):** Bienvenida → Permisos → Contacto (red de confianza, invitación por WhatsApp) → Prueba (un arrebato grabado pasa por el detector real) y PIN.
- **Inicio (F2):** estado de la protección, lecturas en vivo, pausa de 30 min y apagar con PIN.
- **Alerta (F4):** "¿Todo bien?" en silencio antes de avisar a tu red; falsa alarma con motivo y PIN.
- **Contacto (F5)** y **Me robaron (F6):** páginas web, `?ver=contacto` y `?ver=yo`.
- **Grabar (F7)** evidencia en video o audio (el audio sigue grabando si cambias de pestaña; el video se detiene y se guarda); **Cerca (F8)** mapa con reportes reales de la comunidad a 1 km (backend `/api/reportes`) y "Reportar algo"; la evidencia grabada se sube a R2 (`/api/evidencias`) y se publica en Cerca con tu ubicación aproximada, con un cuadro del video como miniatura; un audio muestra su onda real (el volumen medido mientras grababa) y un reporte sin grabación, un mapa chico con tu posición. Al tocar una tarjeta se abre su detalle: el audio suena ahí y el video se abre en el reproductor del celular (videos del mismo lugar en 10 min se juntan en una tarjeta; probado en la web con datos de prueba, falta probarlo en celular); **Tú**: ajustes y herramientas del equipo.

## Reglas del repo
- Todo cambio entra por **Pull Request** y lo aprueba otro integrante. Nadie hace push directo a `main`.
- Todo en español. Nunca subas claves, códigos de créditos ni datos personales.
