# Alerta Arrebato · pixel-hack · Hack the Andes 2026 (track Seguridad)

App para iPhone, Android y web que, con los sensores del celular (acelerómetro, giroscopio y GPS),
**detecta cuando un ladrón en moto te arrancha el celular y avisa al instante** con la ubicación
y la ruta de huida, en los segundos antes de que lo apaguen.

Lima, 17 y 18 de octubre de 2026 · Equipo: Gabriel, Cesar, Mauricio, Piero.

- **Plan detallado y tareas por integrante:** [docs/PLAN.md](docs/PLAN.md)
- Investigación técnica: [docs/viabilidad-deteccion-arrebato-moto.md](docs/viabilidad-deteccion-arrebato-moto.md)
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
- **5 falsas alarmas en 93 horas** reales de 3 personas con el celular en la mano; **0 en 24 h de prueba a ciegas** (dataset SHL).
- **81–87%** de arrebatos completos semi-reales detectados, alerta a los ~4,5 s.
- Detalle, fuentes y limitaciones: [docs/validacion-datos-reales.md](docs/validacion-datos-reales.md). Todavía faltan grabaciones nuestras de arrebatos en bici.

Todo vive en [`packages/detector`](packages/detector), TypeScript puro sin dependencias, probado con un simulador físico.

## Estructura
```
packages/detector/   Algoritmo + simulador + pruebas + banco de pruebas (Node)
apps/movil/          App Expo / React Native (iOS, Android, web)
docs/                Plan, investigación y rúbrica (docs/fase-1/ = lluvia de ideas archivada)
```

## Cómo correrlo
Necesitas Node 20 o más nuevo.
```bash
npm install                   # en la raíz del repo
npm test                      # pruebas del detector
npm run evaluar               # banco de pruebas → packages/detector/reportes/evaluacion.md
npm run movil                 # app: w = web, a = Android (emulador o Expo Go), i = iPhone
```
Para probar con sensores reales abre la app en tu celular (Expo Go o `npx expo run:android|ios` dentro de `apps/movil`).
En la web, los sensores solo funcionan con **HTTPS** y abriendo la página directo (no dentro de un iframe).

## Lo que ya funciona
- Detector con máquina de estados, filtro de gravedad con giroscopio, velocidad GPS calculada cuando el celular no la da, modo sin GPS y modo demo.
- Simulador físico con 26 escenarios (arrebatos y trampas: caídas, mototaxi, bache, frenazo, correr al bus…), recalibrado con datos reales.
- Validación con datasets reales de terceros (SHL, SPU) y pruebas automáticas (vitest), algunas con datos reales.
- App Expo: activar protección, lecturas en vivo, alerta con botón de "falsa alarma", modo demo, **modo grabar** (exporta CSV) y **simular** casos sin moverse.
- Reproductor de grabaciones CSV reales en la terminal.

## Ideas pendientes (todavía no funciona)
- Backend en tiempo real y panel con mapa de la ruta de huida (el envío ya está listo en la app: `EXPO_PUBLIC_URL_ALERTAS`).
- Aviso por WhatsApp o SMS a un contacto (Zavu, disponible el domingo 18).
- Protección con la pantalla apagada / app en segundo plano (requiere módulo nativo; ver PLAN §5).
- Arrebatos simulados en bici **con GPS**, grabados por nosotros (no existen datos públicos de arrebatos desde moto).
- Veto por Bluetooth del auto o Wi-Fi conocido (para las falsas alarmas en auto que quedan).
- Diseño de la interfaz.

## Reglas del repo
- Todo cambio entra por **Pull Request** y lo aprueba otro integrante. Nadie hace push directo a `main`.
- Todo en español. Nunca subas claves, códigos de créditos ni datos personales.
