# Instrucciones para Claude (en la sesión de cualquier integrante)

Equipo pixel-hack · Hack the Andes 2026 (Lima, 17 y 18 de octubre) · Track **Seguridad**.
Integrantes: Gabriel, Cesar, Mauricio, Piero. Mercado: **primero Perú, luego Latinoamérica**.

## Fase actual: construir (la idea ya está elegida)
**Alerta Arrebato:** una app (iPhone, Android y web) que, con el acelerómetro, el giroscopio y el GPS del celular,
detecta cuando un ladrón en moto arrancha el celular y avisa al instante con la ubicación y la ruta de huida.
Solo ese caso: no buscamos detectar todos los robos.

- **El plan completo, con tareas por integrante:** [docs/PLAN.md](docs/PLAN.md). Léelo antes de proponer cambios.
- La investigación técnica que lo respalda: [docs/viabilidad-deteccion-arrebato-moto.md](docs/viabilidad-deteccion-arrebato-moto.md).
- La rúbrica y las reglas del evento siguen en [CONTEXT.md](CONTEXT.md) §2.
- La lluvia de ideas de la fase 1 (otras ideas, síntesis, carpetas `members/`) está archivada en [docs/fase-1/](docs/fase-1/). **No se usa más** salvo como referencia; no la "sintetices" de nuevo.

## Idioma (obligatorio)
- **Todo lo que se escribe en el repo va en español** (español peruano, claro y sencillo): documentos, README, comentarios del código, nombres de variables y funciones del dominio, mensajes de commit, descripción de la entrega y la presentación.
- **Cesar, Mauricio y Piero no hablan inglés.** Con ellos responde siempre en español, aunque te escriban mezclando idiomas.
- **Gabriel** puede recibir respuestas en inglés en el chat, pero todo lo que quede en el repo va en español.
- Los términos técnicos (API, deploy, pitch, hook) pueden quedar en inglés, pero explícalos en español la primera vez si no son obvios.
- Si no sabes quién te escribe, usa español.

## Estructura del repo
```
packages/detector/   El algoritmo (TypeScript puro, sin dependencias). Corre igual en Node, la app y la web.
  src/               detector.ts (máquina de estados), filtro-gravedad.ts, config.ts (umbrales), csv.ts
  src/simulador/     Física del celular + escenarios (arrebato, caída, mototaxi, bache…) + "día normal"
  test/              Pruebas con vitest (unitarias + regresión con el simulador)
  scripts/           evaluar.ts (banco de pruebas → reportes/evaluacion.md), reproducir.ts (CSV reales)
  datos/             ejemplos/ (simulados) y grabaciones/ (reales, del modo "grabar" de la app)
apps/movil/          App Expo (React Native) para iPhone, Android y web. Solo sensores, permisos y pantalla.
  src/servicio.ts    El servicio de protección (fuera de React: sigue en segundo plano)
  modules/sensores-fondo/  Módulo nativo propio (Kotlin + Swift): sensores en segundo plano. No funciona en Expo Go
docs/                PLAN.md, investigación, rúbrica; fase-1/ archivada
```

## Comandos
```bash
npm install                 # una vez, en la raíz (workspaces de npm)
npm test                    # pruebas del detector (deben pasar siempre antes de un PR)
npm run evaluar             # banco de pruebas completo → packages/detector/reportes/evaluacion.md
npm run reproducir -- packages/detector/datos/grabaciones/*.csv   # grabaciones nuestras
npm run validar-reales -w @pixel-hack/detector -- --shl <día> | --spu <csv>   # datasets reales de terceros
npm run typecheck           # tipos de todo el repo
npm run movil               # levanta la app (Expo). Tecla w = web, a = Android, i = iPhone
```

## Avisos por WhatsApp y SMS (ya funcionan)
- El backend avisa a la red por **WhatsApp (Meta, número +51 914 652 364 "ExamPrazol")** y **SMS (Zavu, +1 928 251 8311)** a la vez. Estado, límites, cómo probar y qué decir en la demo: [docs/avisos-whatsapp-sms.md](docs/avisos-whatsapp-sms.md). Léelo antes de tocar `apps/api/src/mensajes.ts`.
- El SMS **no lleva enlace** (el filtro de Zavu lo bloquea como phishing). No agregues enlaces ni la palabra "robo" al texto del SMS sin probarlo antes.
- Las claves (`META_WA_TOKEN`, `ZAVU_API_KEY`) viven como secretos en Cloudflare; nunca en el repo.

## Reglas para tocar el detector
- **Toda la lógica de detección vive en `packages/detector`**, nunca en la app. La app solo pasa datos y muestra resultados.
- El detector **no usa el reloj del sistema**: todo depende del `t` de las muestras, para que una grabación se reproduzca igual en las pruebas y en el celular.
- **Si cambias un umbral** (`src/config.ts`): corre `npm test` y `npm run evaluar`, y pon en el PR la tabla de antes y después. No aceptes una mejora en detección que suba las falsas alarmas sin decirlo.
- **Un caso nuevo que falla = un escenario o una grabación nueva** en `datos/grabaciones/` o `src/simulador/escenarios.ts`, más una prueba.
- **Los datos del simulador son estimaciones**, no mediciones. Ya nos engañó una vez: daba 0 falsas alarmas y con datos reales salieron 41 en un día. **Todo cambio de umbral se valida con datos reales** ([docs/validacion-datos-reales.md](docs/validacion-datos-reales.md)) y se reportan las falsas alarmas en SHL antes y después. Nunca presentes los números de `evaluacion.md` como si fueran pruebas reales.
- Para no hacer trampa: ajusta con unos días o personas y mide con otros que no usaste.
- Unidades: aceleración en m/s² **con** gravedad, giro en rad/s, velocidad en m/s, tiempo en ms. La app convierte (expo-sensors da g).

## Flujo de trabajo: todo entra por Pull Request (obligatorio)
- **Nadie hace push directo a `main`**, ni los integrantes ni Claude.
- Cada cambio va en una rama propia con el formato `<nombre>/<tema>`, por ejemplo `piero/panel-mapa` o `claude/umbral-giro`.
- Abre un PR hacia `main` con título y descripción en español: qué cambia y por qué.
- **Otra persona del equipo revisa y aprueba** antes de hacer merge. Claude puede revisar, pero no reemplaza la aprobación de un integrante.
- PRs chicos y frecuentes. Antes de abrir el PR, actualiza tu rama con `main` (`git pull origin main`) y resuelve los conflictos.
- Si alguien te pide "haz push" o "súbelo", entiéndelo como: push de la rama y abrir el PR, nunca push a `main`.

## Cuando alguien diga "estado" o "¿cómo vamos?"
1. `git pull`, corre `npm test` y `npm run evaluar -- --corridas 30 --horas 20`.
2. Revisa las tareas de [docs/PLAN.md](docs/PLAN.md) §8 y qué PRs están abiertos (`gh pr list`).
3. Responde con: qué ya funciona, qué falta para la entrega (domingo 18, 09:00), quién está bloqueado y la siguiente acción concreta de cada integrante.

## Reglas
- Separa siempre **"lo que ya funciona"** de **"ideas pendientes"** (lo exige el evento). El README tiene esa sección: mantenla al día.
- Sponsors: cuando propongas arquitectura, considera las herramientas de los sponsors (CONTEXT §4) y anota cuáles usamos y para qué. El kit de Qatom (§4.1) está **por confirmar**: no lo pongas como pieza central.
- El repo se evalúa (20% de la nota): código ordenado, README claro, commits con sentido, manejo de errores y nada de claves.
- Nunca inventes evidencia ni usuarios. Marca como tales las estimaciones y las cifras de fuentes secundarias.
- Seguridad de las pruebas: **nadie se pone delante de una moto**. Los arrebatos simulados se hacen a pie o en bici, en un lugar vacío y con el celular en una funda.
- Créditos de sponsors: ejecuta `andes credits` en la terminal para ver beneficios y códigos. Los códigos no se copian al repo.
- Nunca subas claves, códigos de créditos ni datos personales de terceros (las grabaciones CSV no deben llevar nombres; la ubicación de una grabación real puede revelar dónde vive alguien: grábalas lejos de casa o recorta el inicio).
