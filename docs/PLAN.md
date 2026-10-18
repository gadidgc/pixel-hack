# Plan de construcción: Vigía

> Sábado 17 de octubre de 2026, ~17:30 (hora de Lima) · Preparado por Claude a pedido de Gabriel.
> **Entrega: domingo 18, 09:00.** Quedan unas 15 horas.
> Este documento es para que **cada integrante sepa qué está hecho, cómo funciona y qué le toca**.
> Lo marcado como *estimación* no es una medición. Los resultados del detector vienen de un **simulador**, no de robos reales.

---

## 0. Resumen en 1 minuto

1. **Qué hacemos:** una app (iPhone, Android y web) que detecta cuando un ladrón **en moto** te arrancha el celular y **avisa en segundos** con la ubicación y la ruta de huida, antes de que lo apaguen. Google solo bloquea el celular; nosotros avisamos.
2. **Ya está construido y probado** (ver §9): el algoritmo, un simulador físico, 64 pruebas automáticas (3 con datos reales), la app Expo con sensores reales, modo demo, modo para grabar datos y un botón para simular casos sin moverse.
3. **Resultados con DATOS REALES** ([validacion-datos-reales.md](validacion-datos-reales.md)):
   - Detecta el jalón en **23 de 24** robos escenificados reales.
   - **9 falsas alarmas en 93 horas** reales de 3 personas con el celular en la mano (≈ 1 cada 10 h). La familia solo se entera a los 10 s; el dueño cancela con su PIN.
   - Arrebato completo semi-real (caminar real + jalón real + huida real en vehículo): **85–94%** detectado, alerta a los **~4,5–6 s**; en casos difíciles, **65–89%**.
   - Una **auditoría independiente** mostró que nuestras primeras pruebas eran optimistas; corregimos detector y app ([validacion §7](validacion-datos-reales.md)).
   - El simulador nos engañaba en varias cosas; lo corregimos con estos datos.
4. **Lo que falta para ganar:** (a) **grabaciones reales** para confirmar los umbrales, (b) **backend + panel con mapa** (y WhatsApp con Zavu), (c) **URL pública con HTTPS**, (d) **un usuario real** que confirme el problema, (e) el pitch y la demo en vivo.
5. **Reparto:** Gabriel → integración, despliegue y builds. Mauricio → grabaciones reales y ajuste de umbrales. Piero → backend, panel y WhatsApp. Cesar → usuarios reales, cifras, pitch y demo. Detalle en §8.

---

## 1. Alcance

| Sí | No (por ahora) |
|---|---|
| Arrebato desde **moto o bici** (huida a más de 15 km/h) | Ladrón a pie (solo en **modo demo**) |
| Celular **en la mano o en uso**, también con otra app abierta o la pantalla apagada (app compilada, §5) | Expo Go y la web: solo con la app abierta |
| Avisar con ubicación y ruta de huida | Bloquear el celular, sonar alarma, foto del ladrón |
| iPhone, Android y web (misma base de código) | Relojes, Bluetooth, Wi-Fi |

**Por qué solo la moto:** deja una firma física muy clara (pico fuerte + velocidad de vehículo casi al mismo tiempo) y es el caso que más se repite en Lima (casos de prensa, no estadística; ver la [investigación](viabilidad-deteccion-arrebato-moto.md)).

**Por qué la alerta es silenciosa:** hacer sonar el celular puede provocar violencia contra la víctima.

---

## 2. Arquitectura

```
┌────────────────────── Celular (Expo / React Native) ──────────────────────┐
│                                                                          │
│  Acelerómetro + giroscopio (50 Hz)  ──┐                                  │
│  GPS (1 lectura/s)  ──────────────────┼──▶  @pixel-hack/detector  ──▶  eventos
│                                       │     (TypeScript puro)            │   │
│  Modo grabar → CSV  ◀─────────────────┘                                  │   │
└──────────────────────────────────────────────────────────────────────────┘   │
                                                                               ▼
                       alerta · notificar_familia · ubicacion · cancelada (JSON por HTTPS)
                                                                               │
                         ┌─────────────── Backend (pendiente, Piero) ──────────┴──┐
                         │  POST /alertas  →  guarda y reenvía en tiempo real      │
                         └──────┬──────────────────────────────┬──────────────────┘
                                ▼                              ▼
                     Panel web con mapa            WhatsApp / SMS al contacto
                     (ruta de huida en vivo)       (Zavu, disponible el domingo)
```

**Decisiones clave:**
- **El algoritmo es un paquete aparte, sin dependencias** (`packages/detector`). La misma lógica corre en las pruebas (Node), en el celular y en la web. Así se prueba en la terminal sin celular y nadie "arregla" el detector dentro de la pantalla.
- **El detector no usa el reloj del sistema**, solo el tiempo de cada muestra. Una grabación da exactamente el mismo resultado en la terminal y en el celular. Esto hace que los errores se puedan reproducir.
- **Expo (React Native)**: es lo más usado para apps de iPhone y Android con un solo código, y además exporta la **web**, que necesitamos para la **URL pública** (requisito del evento). Versión: **Expo SDK 58** (React Native 0.88), la estable actual.
- **Sensores:** `expo-sensors` en iPhone y Android. En la web **no** lo usamos porque su `Accelerometer` web entrega ángulos y su `Gyroscope` web entrega aceleración (lo revisamos en el código de expo-sensors 58); leemos el evento `devicemotion` directo ([src/sensores.web.ts](../apps/movil/src/sensores.web.ts)).
- **GPS:** `expo-location` con `watchPositionAsync`, máxima precisión, 1 lectura por segundo.

### 2.1 Estructura del repo
```
packages/detector/
  src/detector.ts          Máquina de estados (el corazón)
  src/filtro-gravedad.ts   Filtro complementario: separa gravedad y aceleración usando el giroscopio
  src/config.ts            Todos los umbrales (modo normal y modo demo)
  src/csv.ts               Formato de grabaciones + reproductor
  src/simulador/           Física del celular, comportamientos, 26 escenarios, "día normal", evaluación
  test/                    64 pruebas (vitest), 3 con datos reales
  scripts/validar-reales.ts  Datasets reales de terceros (SHL, SPU) → falsas alarmas y jalones
  scripts/empalme-real.ts    Prueba semi-real de arrebato completo
  datos/reales/            Recortes reales de SHL (dominio público con cita) para las pruebas
  scripts/evaluar.ts       Banco de pruebas → reportes/evaluacion.md
  scripts/reproducir.ts    Pasa grabaciones CSV reales por el detector
  datos/ejemplos/          3 grabaciones simuladas de ejemplo
  datos/grabaciones/       Aquí van las grabaciones REALES
apps/movil/
  App.tsx                  Pantalla única (la UI se mejora después)
  src/useProteccion.ts     Conecta sensores + GPS → detector → alertas
  src/sensores.ts          iPhone y Android (expo-sensors; convierte g → m/s²)
  src/sensores.web.ts      Web (devicemotion directo)
  src/ubicacion.ts         GPS
  src/alertas.ts           Envío al backend (EXPO_PUBLIC_URL_ALERTAS)
  src/grabadora.ts         Modo grabar → CSV
  src/simulacion.ts        Botón "Simular" (usa el simulador dentro de la app)
```

---

## 3. El algoritmo

### 3.1 Señales
| Señal | De dónde sale | Para qué |
|---|---|---|
| **Aceleración lineal** (g) | Acelerómetro menos la gravedad estimada | El jalón |
| **Giro** (rad/s) | Giroscopio | El celular da vueltas al arrancharlo |
| **Magnitud total** (g) | Acelerómetro | Quietud (caída), energía y ritmo de pasos |
| **Velocidad** (m/s) | GPS; si el celular no la da, se calcula con posiciones de hace 2–6 s, restando el error | Confirmar la huida y saber si ya íbamos en vehículo (ahora o en los últimos 2 min) |

**Filtro de gravedad (complementario):** primero gira la gravedad estimada con el giroscopio (fórmula de Rodrigues) y luego la acerca un poco a la lectura del acelerómetro. Así, cuando el celular da vueltas en la mano del ladrón, el giro no se confunde con un empujón. Una prueba lo verifica ([test/utilidades.test.ts](../packages/detector/test/utilidades.test.ts)). Durante la iteración encontramos que la integración simple (Euler) fallaba a 10+ rad/s; se cambió a rotación exacta.

### 3.2 Máquina de estados
```
            pico ≥ 1,5 g + giro ≥ 4 rad/s (en 0,5 s)
            y NO íbamos en vehículo (GPS ahora ni en los últimos 2 min)
  REPOSO ──────────────────────────────────────▶ POSIBLE JALÓN ──▶ (manda ubicación en vivo)
     ▲                                               │  un pico nuevo reinicia la cuenta
     │  quieto y el GPS no se mueve en 4 s (caída)   │  (si el GPS aún no mostró movimiento)
     │  ya íbamos en vehículo (bache, semáforo)      │
     │  la huida no empezó en ≤ 7 s (auto que arranca)│ 2 lecturas GPS > 15 km/h
     │  no hubo huida en 10 s / sin GPS              │ o > 40 m a velocidad de huida
     │                                               ▼
     └───────────────────────────────────────── ALERTA ──▶ el dueño puede cancelar ("falsa alarma")
```
Sin GPS, en modo normal **no se alerta** (con datos reales daba decenas de falsas alarmas por día): queda el "posible jalón" y se empieza a mandar la ubicación apenas aparezca.

### 3.3 Umbrales ([src/config.ts](../packages/detector/src/config.ts))
| Umbral | Normal | Demo | Por qué |
|---|---|---|---|
| Pico de aceleración (con giroscopio) | 1,5 g | 1,2 g | Física: moto a 25 km/h en 0,3 s ≈ 2,4 g; bajamos para no perder jalones suaves |
| Pico sin giroscopio (gama baja) | 1,8 g | 1,8 g | Sin giro pedimos más fuerza |
| Giro mínimo | 4 rad/s | 4 rad/s | Un golpe en la mesa sin giro no es arrebato |
| Velocidad "de peatón" antes del jalón | < 2,5 m/s (9 km/h) | < 1,6 m/s | Si ya íbamos más rápido, era un bache o un frenazo |
| **Historial de vehículo** | ≥ 3 m/s (11 km/h) en los últimos 2 min | ≥ 6 m/s | **Datos reales:** auto parado en un semáforo que arranca (22 falsas alarmas en un día) |
| Velocidad de huida | ≥ 4,2 m/s (15 km/h) ×2 lecturas | ≥ 2 m/s (correr) | Vehículo vs. persona. Subirla no ayudó con datos reales y perdía los robos en bici |
| **Huida inmediata** | primera señal en ≤ 7 s | sin límite | **Datos reales:** el ladrón ya viene rápido; un auto que arranca de cero es más lento |
| Desplazamiento de huida | 40 m y a velocidad de huida | 25 m | Respaldo cuando no hay velocidad. **Datos reales:** en bici se hacen 40 m en 10 s |
| Tiempo para confirmar | 10 s | 10 s | El ladrón apaga el celular en minutos (*estimación*) |
| Quietud (caída) | desviación < 0,035 g por 1,5 s y el GPS no se mueve en 4 s | igual | **Datos reales:** en un auto el celular en la mano también se ve quieto |
| Alerta sin GPS | **no** | sí (solo para la demo bajo techo) | **Datos reales:** 18 falsas alarmas en 3,3 h sin GPS |

### 3.4 Cómo descarta las falsas alarmas
| Situación | Cómo se ve | Regla que la descarta |
|---|---|---|
| Se cae el celular | Caída libre + golpe + quieto | `quieto_despues` |
| Lo tiras a la mochila | Pico + quieto o caminata | `quieto_despues` / `sin_huida` / `ritmo_de_pasos` |
| Bache en tu moto, frenazo en la combi | Pico con velocidad alta antes | `ya_en_vehiculo` (por GPS) |
| Auto parado en un semáforo que arranca | Pico, quieto, la velocidad sube de a poco | `ya_en_vehiculo` (historial de 2 min) o `arranque_gradual` |
| Subir a un mototaxi | No hay pico fuerte con giro; luego quieto y recién arranca | no hay jalón |
| Sacar el celular del bolsillo | Pico + giro, luego caminas | `sin_huida` / `ritmo_de_pasos` |
| Correr al bus | Pasos fuertes, < 15 km/h | no hay jalón o `sin_huida` |

### 3.5 Modo demo
Para la demo en vivo **sin moto**: un integrante arrancha el celular y sale corriendo. Bajamos la velocidad de huida a la de una persona corriendo y aceptamos la huida a pie. **Hay que decirlo con honestidad en el pitch** ("en la demo usamos el umbral de una persona corriendo; en la calle es el de una moto").

---

## 4. Banco de pruebas (cómo sabemos que funciona)

> **Lo más importante está en [validacion-datos-reales.md](validacion-datos-reales.md):** pruebas con 93 h de datos reales de 3 personas (SHL), 24 robos escenificados reales (SPU) y empalmes semi-reales. Lo de esta sección es el simulador, que **ya no es la medida principal**.

### 4.1 Simulador físico
[src/simulador/](../packages/detector/src/simulador/) simula un celular: posición y velocidad, orientación 3D (matrices de rotación), y lo que leerían sus sensores: acelerómetro con gravedad, ruido y saturación; giroscopio con ruido; GPS con error que cambia despacio, 0,5–1,5 s de retraso y lecturas sin velocidad. Encima, comportamientos: caminar, correr, quieto, ir en vehículo (vibración, baches, zigzag), jalón, caída libre con golpe, tirar a la mochila, sacar del bolsillo, sacudir, sentarse, frenazo, bache.

⚠️ **Limitación honesta:** los parámetros del simulador (fuerza del jalón, vibración de la moto, error del GPS) son **estimaciones nuestras**. Ajustar umbrales con un simulador hecho por nosotros puede dar números optimistas. Por eso: (1) probamos con un "mundo peor" (§4.4) y (2) las **grabaciones reales mandan** (§4.5).

### 4.2 Escenarios (26)
- **Deben alertar (7):** arrebato en moto · ladrón que guarda el celular en el bolsillo · GPS sin velocidad · GPS impreciso (20–30 m) · sin GPS · celular sin giroscopio · arrebato en bici.
- **Solo modo demo (2):** ladrón a pie · demo bajo techo sin GPS.
- **No deben alertar (17):** caminar · caída (con y sin GPS) · tirar a la mochila (con y sin GPS, sin giroscopio) · sacar del bolsillo (con y sin GPS, sin giroscopio) · sacudir · subir a mototaxi (normal y rápido) · bache en moto (con y sin GPS) · frenazo en combi · combi sin GPS · correr al bus.

### 4.3 "Día normal"
Simula horas de la vida de alguien en Lima **sin robos**: caminar, esperar, combis con frenazos, mototaxis, moto propia con baches, correr al bus, tirar el celular a la mochila, caídas, ratos sin GPS. Cuenta cuántas falsas alarmas habría por día.

### 4.4 Resultados

**Con datos reales (la medida principal):**
| Medida | Resultado |
|---|---|
| Jalón detectado en robos escenificados reales (SPU) | **23/24** |
| Falsas alarmas en 93 h reales con el celular en la mano (SHL) | **9** (≈ 1 cada 10 h; User3: 0 en 24 h) |
| Prueba a ciegas (User3, 24 h nunca usadas para ajustar) | **0** falsas alarmas |
| Arrebato completo semi-real (130 empalmes, 13 jalones distintos) | **84,6–93,8%**, alerta a los ~4,5–6 s |
| Casos difíciles (ladrón lento, GPS cada 2–5 s, sin GPS al inicio, recién bajó del bus) | **65–89%** (antes de la auditoría: 0–80%) |

**Simulación** ([reportes/evaluacion.md](../packages/detector/reportes/evaluacion.md), 100 corridas por escenario): 98,8% de detección, 0% de falsas alarmas en escenarios trampa, 0,24 falsas alarmas por día simulado. Robustez (más ruido, GPS lento, saturación, GPS malo): 95–99%.

**Cómo iteramos (registro honesto):**
1. **Simulación:** 82% de detección y 12 falsas alarmas por día → 99% y 0.
2. **Datos reales:** ese mismo detector dio **41 falsas alarmas en un solo día real**, y una regla descartaba 7 de 7 robos de bolsillo reales. El simulador nos estaba engañando.
3. Corregimos 8 cosas con evidencia real (tabla en [validacion-datos-reales.md §3](validacion-datos-reales.md)).
4. Volvimos a medir con días que no usamos para ajustar.

### 4.5 Grabaciones reales (lo más importante que falta)
La app tiene un **modo grabar**: eliges la etiqueta, grabas y compartes el CSV. Luego:
```bash
npm run reproducir -- packages/detector/datos/grabaciones/*.csv          # modo normal
npm run reproducir -- --demo packages/detector/datos/grabaciones/*.csv   # modo demo
```
Muestra los eventos y si coincide con la etiqueta (`arrebato-…` debe alertar; el resto no).

**Protocolo (Mauricio, con ayuda de todos):**
| Grabación | Cuántas (*meta*) | Cómo |
|---|---|---|
| `caminar`, `parado-mirando` | 5 c/u | Normal, con el celular en la mano |
| `caida` | 5 | Sobre una superficie blanda (cama, cojín), celular con funda |
| `lanzar-a-mochila`, `sacar-del-bolsillo` | 5 c/u | Como lo harías normalmente |
| `mototaxi`, `combi`, `moto-propia` | 2–3 c/u | Viajes reales; el celular en la mano o el bolsillo |
| `correr` | 3 | Corriendo de verdad 10–20 s |
| `arrebato-simulado-bici` | 10 | **Lugar vacío**, a baja velocidad, el "ladrón" en bici arrancha el celular (con funda) de la mano de alguien parado |
| `demo-a-pie` | 10 | Exactamente como será la demo frente al jurado |

⚠️ **Seguridad:** nadie se pone delante de una moto. Las simulaciones van a pie o en bici, en un lugar vacío.
🔒 **Privacidad:** las grabaciones llevan la ubicación. No grabes empezando en tu casa; no pongas nombres en el archivo.

**Probar en varios celulares:** al menos un iPhone, un Samsung gama A y un Xiaomi/Redmi (los más comunes en el Perú). Anotar si tienen giroscopio.

### 4.6 Pruebas automáticas
`npm test` corre 64 pruebas en ~3 s:
- matemática y filtros;
- cada regla de la máquina de estados, con señales hechas a mano;
- el formato CSV;
- una regresión con el simulador;
- **3 pruebas con datos reales de SHL**: el auto en el semáforo y una caminata, en `packages/detector/datos/reales/`.

**Deben pasar antes de cada PR.**

---

## 5. Plataformas y segundo plano

**La protección funciona en segundo plano** (usando WhatsApp o Maps, o con la pantalla apagada) en la **app compilada** de iPhone y Android. Para eso exigimos permisos privilegiados; si el usuario no los da, la protección no se activa (se lo explicamos).

| Plataforma | Cómo sigue funcionando en segundo plano | Permisos que exigimos | Límite |
|---|---|---|---|
| **Android** | Servicio en primer plano de `expo-location` (notificación fija "Protección activa") + nuestro **módulo nativo** [`modules/sensores-fondo`](../apps/movil/modules/sensores-fondo) (Kotlin: SensorManager sin atarse a la pantalla + *wake lock* parcial) | Ubicación **"Permitir siempre"**, movimiento, PIN. Botón para quitar la optimización de batería | Algunas marcas (Xiaomi, Samsung) igual matan apps: hay que quitar la optimización de batería ([dontkillmyapp.com](https://dontkillmyapp.com/)) |
| **iPhone** | Modo de fondo `location` (indicador azul) + módulo nativo (Swift: CoreMotion en su propia cola) | Ubicación **"Permitir siempre"**, movimiento, PIN | Apple no documenta que CoreMotion siga llegando en segundo plano solo con la ubicación activa: **hay que probarlo en un iPhone real**. Apple podría objetarlo al publicar en la App Store |
| **Web (URL pública)** | No puede: el navegador detiene los sensores | Movimiento y ubicación | Solo con la página abierta; la app lo dice en pantalla |
| **Expo Go** | No puede (no incluye nuestro módulo nativo) | — | Usa `npx expo run:android` / `run:ios` o un build de EAS |

**Probado:**
- **Web, con un "celular falso"** que inyecta movimiento y GPS en el navegador. Flujo completo: crear PIN → activar → jalón → alerta a 1,2 s → estado real ("Panel: NO enviada, sin backend") → cuenta regresiva de 10 s → PIN incorrecto rechazado → PIN correcto cancela.
- **iPhone:** la app nativa, **con el módulo Swift**, compila y abre en el simulador (iPhone 17 Pro, iOS 26.5). El simulador no tiene acelerómetro, así que los sensores en segundo plano **no se pudieron probar ahí**.
- **Android:** ver el resultado del build en el PR.

**Falta (lo más importante):** probar en **celulares reales** que la protección sigue con la pantalla apagada y con otra app abierta (§8, Gabriel y Mauricio).

---

## 6. Backend, panel y aviso

**Ya está construido** en [apps/api](../apps/api) (Cloudflare Workers + D1; ver su README). La app manda todo ahí ([src/alertas.ts](../apps/movil/src/alertas.ts)); `EXPO_PUBLIC_URL_ALERTAS` sirve para apuntar a otro backend (por ejemplo, el local). Si el backend no responde, la alerta queda solo en la app y **la pantalla lo dice**. Publicado en https://alerta-arrebato.gabrieldgc1999.workers.dev. Avisa por **WhatsApp (Meta) y SMS (Zavu)** a la vez: estado, límites y cómo probarlo en [avisos-whatsapp-sms.md](avisos-whatsapp-sms.md).

### 6.1 Contrato (lo que manda la app)
`POST <EXPO_PUBLIC_URL_ALERTAS>` con JSON:
```jsonc
{ "dispositivo": "android-k3j9x2ab", "enviadoEn": 1760740000000, "tipo": "alerta", "evento": { "tJalon": ..., "via": "velocidad_gps", "confianza": "alta",
  "velocidadMs": 9.1, "posicionJalon": { "lat": -12.04, "lon": -77.04, "precision": 8, "t": ... }, "ultimaPosicion": { ... } },
  "ruta": [ { "t": ..., "lat": ..., "lon": ..., "velocidad": 1.2, "precision": 6 }, ... ],
  "nombre": "Lucía", "contactos": [ { "nombre": "Mamá", "telefono": "+51..." }, ... ] }
{ "dispositivo": "...", "enviadoEn": ..., "tipo": "notificar_familia", "evento": { ... }, "nombre": "...", "contactos": [ ... ] }
{ "dispositivo": "...", "enviadoEn": ..., "tipo": "ubicacion", "lectura": { "t": ..., "lat": ..., "lon": ..., "velocidad": 8.7, "precision": 6 } }
{ "dispositivo": "...", "enviadoEn": ..., "tipo": "cancelada", "evento": { "motivo": "cancelado", ... } }
{ "dispositivo": "...", "enviadoEn": ..., "tipo": "prueba", "nombre": "...", "contactos": [ ... ] }
{ "dispositivo": "...", "enviadoEn": ..., "tipo": "motivo_falsa_alarma", "motivo": "Iba en auto" }
```
- `alerta`: al instante. El backend la muestra en el panel **sin avisar todavía a la familia**. `ruta` = los últimos 60 s.
- `notificar_familia`: pasado el tiempo de espera (10, 15 o 20 s, lo elige la persona en "Tú"; 10 s por defecto), si no la canceló con su PIN. **Recién ahí** se manda el WhatsApp/SMS a `contactos`.
- `ubicacion`: cada segundo **solo mientras dura la alerta** (la ruta de huida).
- `prueba`: la prueba guiada del onboarding. El backend manda a la red un mensaje marcado como **PRUEBA**.
- `motivo_falsa_alarma`: opcional, lo que la persona marcó al cancelar ("Iba en auto", "Se me cayó"…). Sirve para mejorar el detector.
- `nombre` y `contactos` viajan **solo** en `alerta`, `notificar_familia` y `prueba`, para saber a quién escribir. Fuera de eso, quedan guardados solo en el celular.
- La pausa (30 min con PIN) no se envía: mientras dura, el detector no corre.
- Un "posible jalón" **no** se envía: caminando hay cientos por hora (auditoría).

### 6.2 Lo que se construyó
- **Cloudflare Worker + D1**: recibe el POST, guarda la alerta y la ruta, y sirve la web de la app en la misma URL (**una sola URL pública con HTTPS**). La página del contacto lee la alerta cada 2 s (sin WebSocket: más simple y suficiente).
- **Página del contacto** `/a/<id>?c=<n>`: ruta real sobre un mapa esquemático, rumbo y velocidad, Google Maps, 105 y "Yo me encargo". Pendiente: mapa con calles reales (Leaflet + OpenStreetMap).
- **WhatsApp con Meta** (plantillas aprobadas; llega a cualquiera) y **SMS con Zavu** (plan Pro con el cupón del evento; sin enlace por el filtro antifraude). Detalle en [avisos-whatsapp-sms.md](avisos-whatsapp-sms.md).
- Opcional: **n8n** (1 mes de Pro gratis) para enrutar alertas sin código.
- **CORS:** la web de la app y el backend en el mismo dominio evita problemas.

### 6.3 Sponsors que usamos (para el pitch y la entrega)
| Sponsor | Para qué | Estado |
|---|---|---|
| Zavu | SMS al contacto (a cualquier número de Perú) | Funcionando (plan Pro con el cupón) |
| Cloudflare (Workers + D1) | Web, API y base de datos en una URL | Publicado |
| n8n | Enrutar alertas (opcional) | Opcional |
| IALABS / Maritime | Hosting (si lo confirman) | Por confirmar |
Solo los nombramos si de verdad los usamos.

---

## 7. Interfaz

**Propuesta de funcionalidades (Cesar):** [funcionalidades-app.md](funcionalidades-app.md), flujos F1 a F8. El detector de este plan es su funcionalidad ⭐.
**Diseño:** sistema de diseño "Vigía" v2 "Negro cálido" ([artifact](https://claude.ai/artifact/HW9kceGpSuZaAxxFtccVMj)) y 14 pantallas diseñadas ([artifact](https://claude.ai/artifact/3kUXLiWYpeJsixzCv4dpZp)). Ya están implementadas en `apps/movil`.

**Base visual** ([src/ui/](../apps/movil/src/ui)): colores y medidas en `tema.ts` (tema **noche** por defecto; tema **día** para las páginas del contacto y "Me robaron"), íconos propios, componentes (botón, insignia, lecturas, tarjeta, hoja, línea de tiempo, barra de pestañas y animaciones que respetan "reducir movimiento"), un mapa estilizado y las fuentes Lexend, Figtree e IBM Plex Mono.

**Pantallas implementadas** ([src/pantallas/](../apps/movil/src/pantallas), navegación en [App.tsx](../apps/movil/App.tsx)):

| Flujo | Pantalla | Qué hace |
|---|---|---|
| F1 Onboarding | Bienvenida, Permisos, Contacto, Prueba | Nombre; permisos; red de confianza con invitación por WhatsApp (link `wa.me`); prueba guiada que pasa un arrebato grabado por **el mismo detector**; creación del PIN |
| F2 Protección | Inicio | Estado (protegida, en pausa, limitada, apagada), lecturas en vivo, pausa de 30 min con PIN, grabar, apagar con PIN |
| F4 Alerta | TodoBien | "¿Todo bien?" en silencio con cuenta regresiva antes de avisar a la red; también llega como notificación del sistema (expo-notifications) |
| F4 Falsa alarma | FalsaAlarma | Línea de tiempo, motivo con chips y cancelar con PIN |
| F5 Contacto | WebContacto | Lo que ve el contacto (tema día). En la web: `?ver=contacto`. **Datos de ejemplo, marcados como tales**, hasta que exista el backend |
| F6 Me robaron | MeRobaron | Lista de la primera hora (bloquear línea, cuentas, IMEI…). En la web: `?ver=yo` |
| F7 Evidencia | Grabar | Video (expo-camera) o audio (expo-audio), guardado en el celular y subido a R2 (`POST /api/evidencias`); si hay una alerta abierta, queda unido a ella. Si la subida falla, lo dice y queda la copia local. No graba en la web |
| F8 Cerca | Cerca | Mapa primero con puntos y carrusel. **Reportes reales** a 1 km de tu ubicación (`GET/POST /api/reportes`, últimos 30 días, ubicación redondeada a ~100 m) y "Reportar algo". Una alerta avisada a la red aparece sola, anónima; si se cancela, se borra |
| Ajustes | Tú | Red, tiempo de espera (10/15/20 s), cambiar PIN, permisos y batería, estado del backend, guía de la primera hora, herramientas del equipo |
| Equipo | Herramientas | Modo demo, grabar sensores en CSV, simulaciones y registro |

Las preferencias (nombre, red, tiempo de espera) se guardan **solo en el celular** ([src/preferencias.ts](../apps/movil/src/preferencias.ts), SecureStore o localStorage en la web).

**No son pantallas, son contenido del sistema:**
- **Notificación fija de Android:** "Estás protegida · Desde las HH:MM. Usa tu celular normal."
- **Mensaje de WhatsApp:** el texto está en el diseño; lo manda el backend: WhatsApp con Meta y SMS con Zavu (§6.2).

**Pendiente a propósito (no lo hicimos):**
- Activarse sola al salir de casa o de lugares conocidos.
- Reporte en PDF para la denuncia policial.
- Huella digital: usamos PIN.

---

## 8. Tareas por integrante (hasta el domingo 09:00)

Cada uno trabaja en su rama `<nombre>/<tema>` y abre PR. `npm test` debe pasar.

### Gabriel: integración, despliegue y builds
1. **(Ahora)** Revisar y aprobar este PR con otro integrante. Probar la app en **su celular** (`npm run movil`, Expo Go o `npx expo run:android|ios`).
2. **Desplegar la web con HTTPS** (requisito: URL pública). `npm run exportar:web -w @pixel-hack/movil` genera `apps/movil/dist/`; subir a Cloudflare Pages/Workers (o Maritime). Probar la URL en un iPhone y un Android: el permiso de movimiento y que lleguen datos.
3. Conectar `EXPO_PUBLIC_URL_ALERTAS` cuando Piero tenga el backend.
4. Si hay tiempo: build instalable de Android (EAS Build) para mostrar la app nativa.
5. Mantener el README al día (sección "lo que ya funciona" vs "pendiente").

### Mauricio: datos reales y ajuste del detector
1. **(Hoy en la noche)** Sesión de grabaciones con el protocolo de §4.5, en al menos 3 celulares distintos. Subir los CSV a `packages/detector/datos/grabaciones/` (sin nombres). **Lo que más falta son arrebatos simulados en bici CON GPS al aire libre**: es lo único que no pudimos validar con datos públicos.
2. Correr `npm run reproducir` sobre todo. Por cada grabación que falle: anotar por qué (pico muy bajo, GPS lento, etc.).
3. Ajustar umbrales en `src/config.ts` **solo con evidencia** y poner en el PR la tabla de antes/después de `npm run evaluar` y de las grabaciones.
4. Ensayar la demo `demo-a-pie` 10 veces: ¿cuántas alertan? Meta ≥ 9/10.

### Piero: backend, panel y WhatsApp
1. Backend con el contrato de §6.1 (Cloudflare Worker + Durable Object o Supabase).
2. Panel web con mapa (Leaflet): punto del jalón, ruta en vivo, línea de tiempo.
3. **Domingo temprano:** WhatsApp/SMS con Zavu al contacto de confianza.
4. Probar el flujo completo: botón "Simular arrebato" en la app → alerta en el panel → mensaje.

### Cesar: problema, usuarios reales y pitch (15% + 10% de la nota)
1. **Entrevistar al menos a 2 víctimas reales** de arrebato (preguntas en la [investigación §8](viabilidad-deteccion-arrebato-moto.md)): ¿pantalla prendida? ¿en la mano? ¿cuánto tardó en apagarse? ¿a quién habría avisado? Notas sin nombres en `docs/entrevistas/`.
2. Buscar la **cifra oficial** de robos de celular al paso (INEI-ENAPRES, Osiptel, PNP).
3. Revisar lo legal de compartir ubicación (Ley 29733 de datos personales) y escribir 3 líneas para el pitch.
4. **Guion del pitch (3 min) y de la demo en vivo**, con el tradeoff del modo demo y "qué quedó fuera".
5. **Tracción (+0,25 / +0,5):** conseguir que gente de fuera del equipo use la URL y se vea en los registros del backend (Piero).

### Cronograma sugerido
| Hora | Hito |
|---|---|
| Sáb 19:00 | Este PR aprobado. Todos tienen la app corriendo en su celular. |
| Sáb 22:00 | Primeras grabaciones reales subidas. Backend recibe alertas. Web desplegada con HTTPS. |
| Dom 01:00 | Umbrales revisados con datos reales. Panel con mapa. 2 entrevistas hechas. |
| Dom 05:00 | Flujo completo: celular → backend → panel (→ WhatsApp si Zavu está). Ensayo de la demo. |
| Dom 07:30 | Congelar código. README final, descripción de la entrega, slides. |
| **Dom 09:00** | **Entrega:** URL de la app, URL de la presentación, repo, descripción. |

---

## 9. Lo que ya funciona vs. lo pendiente

| Ya funciona (probado) | Pendiente |
|---|---|
| Detector con máquina de estados, filtro complementario, velocidad derivada, modo sin GPS, modo demo | Ajuste con grabaciones reales |
| Simulador físico, 26 escenarios, día normal, robustez | Probar en celulares reales (iPhone, Samsung, Xiaomi) |
| 64 pruebas automáticas, reporte reproducible | Backend + panel con mapa |
| **Validado con datos reales:** 93 h de SHL, 24 robos de SPU, 130 empalmes semi-reales | Arrebatos simulados en bici con GPS (grabaciones nuestras) |
| App Expo SDK 58 (iPhone, Android, web): protección, alerta, cancelar, grabar CSV, simular | WhatsApp/SMS con Zavu (el texto del mensaje ya está diseñado) |
| Flujo en vivo probado en el navegador con un "celular falso" | URL pública con HTTPS |
| Segundo plano programado (módulo nativo Kotlin + Swift, GPS en segundo plano, permisos obligatorios), PIN, estado real de la alerta; app de iPhone con el módulo compila y abre | **Probar el segundo plano en celulares reales** (pantalla apagada, otra app abierta) |
| Reproductor de grabaciones en la terminal | Datos reales en Cerca y en la página del contacto (hoy son de ejemplo) |
| **Interfaz implementada** (§7): sistema de diseño "Negro cálido", onboarding con prueba guiada, Inicio, "¿Todo bien?", falsa alarma, página del contacto, "Me robaron", grabar evidencia, Cerca, Tú | Activarse sola al salir de casa, reporte PDF, huella |

---

## 10. Cómo suma en la rúbrica (CONTEXT §2)
| Criterio | Peso | Qué mostramos |
|---|---|---|
| Complejidad técnica | 30% | Validación con datasets reales de terceros (SHL, SPU) y prueba a ciegas, fusión de sensores (filtro complementario con rotación exacta), máquina de estados, autocorrelación para ritmo de pasos, simulador físico propio, banco de pruebas con robustez, app multiplataforma, backend en tiempo real |
| Funciona | 25% | Demo en vivo desde la URL pública: arranchan el celular → alerta en el panel en ~3 s. Botón "Simular" para preguntas fuera del guion. **Datos reales** (grabaciones) para llegar a 5 |
| Calidad técnica | 20% | Paquete sin dependencias, tipado estricto, 64 pruebas (algunas con datos reales), errores manejados (permisos, sin GPS, sin giroscopio, backend caído), nada de claves |
| Problema e impacto | 15% | Entrevistas a víctimas reales + cifra oficial |
| Claridad | 10% | Este plan: decisiones, tradeoffs (modo demo, pantalla prendida) y qué quedó fuera |

## 11. Riesgos
| Riesgo | Mitigación |
|---|---|
| Falsas alarmas al subir a un vehículo o cuando arranca (la mayoría de las 9 reales en 93 h) | La familia recién se entera a los 10 s y el dueño cancela con su PIN. Siguiente paso: veto por Bluetooth del auto o Wi-Fi conocido (lo que hace Google) |
| El sistema mata la app en segundo plano (Xiaomi, Samsung) o iOS deja de mandar el movimiento | Botón para quitar la optimización de batería; probar en celulares reales antes de la demo |
| El ladrón apaga el celular antes de que se confirme (~5 s) | La alerta sale apenas se confirma; el PIN impide apagar la protección desde la app (no impide apagar el celular) |
| No hay datos públicos de arrebatos desde moto | Nuestras grabaciones en bici + empalmes semi-reales; decirlo en el pitch |
| Los umbrales no sirven con celulares reales | Ya validados con 93 h reales (SHL) y 24 robos reales (SPU); faltan celulares peruanos de gama baja |
| La demo en vivo no alerta | Modo demo + ensayo 10 veces + botón "Simular" como respaldo + reproducir una grabación real |
| El navegador del jurado no da sensores (laptop) | La demo se hace con nuestro celular; en la laptop, "Simular" corre el mismo detector |
| GPS bajo techo en el local | Modo demo: sin GPS decide con sensores (energía de correr) |
| El backend falla en vivo | La app muestra la alerta igual (solo local) |
| Celulares sin giroscopio | Umbral propio (1,8 g); 95% de detección en simulación |

## Fuentes
- Investigación técnica completa y fuentes: [viabilidad-deteccion-arrebato-moto.md](viabilidad-deteccion-arrebato-moto.md).
- Expo SDK 58: [DeviceMotion](https://docs.expo.dev/versions/v58.0.0/sdk/devicemotion/) · [Accelerometer](https://docs.expo.dev/versions/v58.0.0/sdk/accelerometer/) · [Location](https://docs.expo.dev/versions/v58.0.0/sdk/location/) · [TaskManager](https://docs.expo.dev/versions/v58.0.0/sdk/task-manager/) · [FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/)
- Segundo plano en Android: [react-native-background-actions](https://github.com/Rapsssito/react-native-background-actions) · [dontkillmyapp.com](https://dontkillmyapp.com/)
