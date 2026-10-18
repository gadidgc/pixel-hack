# Alerta Arrebato · pixel-hack · Hack the Andes 2026 (track Seguridad)

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
- App Expo: protección **en segundo plano** en iPhone y Android (módulo nativo propio + GPS en segundo plano; exige ubicación "Permitir siempre"), **PIN** para cancelar o apagar, estado real de la alerta (panel y familia), modo demo, **modo grabar** (exporta CSV) y **simular** casos sin moverse.
- **Interfaz completa** con el sistema de diseño "Negro cálido": onboarding con prueba guiada, "¿Todo bien?" con cuenta regresiva, falsa alarma con PIN, página del contacto, "Me robaron", grabar evidencia, Cerca y ajustes (ver "Pantallas").
- **Backend** ([apps/api](apps/api)): recibe la alerta, guarda la ruta en vivo en la base de datos (Cloudflare D1), arma el enlace `/a/<id>` para cada contacto, avisa por **WhatsApp (Meta) y SMS (Zavu) a la vez**, avisa "está bien" si el dueño cancela y "X se encarga" al resto de la red. Borra los teléfonos al cancelar o a las 24 h. Publicado y probado en **https://alerta-arrebato.gabrieldgc1999.workers.dev** (la web de la app también vive ahí). **Probado en un celular real el 17 de octubre:** llegaron la alerta por WhatsApp (con la ruta) y por SMS, y el "está bien" al cancelar. Estado, límites y cómo probarlo: [docs/avisos-whatsapp-sms.md](docs/avisos-whatsapp-sms.md).
- **Página del contacto en vivo** (`/a/<id>`): dibuja la ruta real, se actualiza cada 2 s, dice hacia dónde va y a qué velocidad, botón a Google Maps y "Yo me encargo".
- Reproductor de grabaciones CSV reales en la terminal.

## Ideas pendientes (todavía no funciona)
- **Bloqueo al confirmar el arrebato:** implementado para Android con autorización de administrador y clave del sistema, pendiente de validación física. En iPhone no está disponible en esta app: requeriría MDM. Detalle y protocolo en [bloqueo por arrebato](docs/bloqueo-por-arrebato.md).
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
- **Grabar (F7)** evidencia en video o audio; **Cerca (F8)** mapa con reportes reales de la comunidad a 1 km (backend `/api/reportes`) y "Reportar algo"; la evidencia grabada se sube a R2 (`/api/evidencias`) y queda unida a la alerta abierta; **Tú**: ajustes y herramientas del equipo.

## Reglas del repo
- Todo cambio entra por **Pull Request** y lo aprueba otro integrante. Nadie hace push directo a `main`.
- Todo en español. Nunca subas claves, códigos de créditos ni datos personales.
