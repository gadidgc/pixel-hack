# Viabilidad técnica: detectar el arrebato de celular desde una moto

> Investigación del sábado 17 de octubre de 2026 · Pedido de Gabriel.
> **Idea elegida:** una app móvil que, usando los sensores del celular (acelerómetro, giroscopio y GPS), detecta que un ladrón en moto le arranchó el celular a alguien y avisa al instante.
> **Alcance:** solo ese caso. No buscamos detectar todos los robos.
> Lo marcado como *estimación* son cálculos nuestros, no mediciones. Lo que viene de blogs o notas de prensa está marcado como fuente secundaria.

---

## Resumen (lo que hay que saber en 1 minuto)

1. **Sí se puede detectar, y ya hay precedente.** Google tiene desde 2024 el "Theft Detection Lock" en Android: usa sensores e IA para detectar cuando alguien arrancha el celular y se va "corriendo, en bici o en auto", y bloquea la pantalla. Un estudio de UC Berkeley (Liu, Wagner y Egelman, 2018) detectó **el 100% de los robos simulados con 1 falsa alarma por semana** usando solo el acelerómetro. Apple estaría preparando algo parecido (MacRumors, mayo de 2026, fuente secundaria).
2. **El caso de la moto es más fácil que el robo a pie**, porque deja una firma muy clara: el celular pasa de estar quieto (o a paso de peatón) a la velocidad de la moto **en menos de medio segundo**. Eso es un pico de aceleración enorme seguido de velocidad de vehículo sostenida.
3. **Lo que diferencia nuestra app de Google:** Google solo **bloquea** el celular. Nosotros **avisamos**: mandamos la ubicación en vivo y la ruta de huida a la familia (y a un panel), en los segundos antes de que el ladrón lo apague.
4. **Los tres problemas difíciles:** (a) que la app esté escuchando los sensores todo el tiempo sin que el sistema la mate; (b) no confundir el arrebato con caídas, subirse a un mototaxi o correr; (c) mandar la alerta antes de que el ladrón apague el celular o lo meta en una bolsa que bloquea la señal.
5. **Para el hackathon:** hacemos una **web app (PWA) con la pantalla prendida**. Encaja con el caso real: a la gente le arranchan el celular **justo cuando lo está usando** en la calle (mirando el mapa o escribiendo), o sea, con la pantalla prendida. La versión nativa que funciona en segundo plano queda en el roadmap.

---

## 1. La física del arrebato desde una moto

### 1.1 Qué le pasa al celular, paso a paso

| Fase | Duración aprox. | Qué miden los sensores |
|---|---|---|
| **Antes** | — | La víctima está parada o caminando. Velocidad GPS de **0 a 1,5 m/s** (0 a 5 km/h). Aceleración con el patrón suave de los pasos (~2 Hz). |
| **El jalón** | **0,1 a 0,5 s** | El ladrón ya viene en movimiento y arrancha el celular. El celular pasa de ~0 a la velocidad de la moto. Pico fuerte en el acelerómetro y giro brusco en el giroscopio (el celular da vueltas en la mano). |
| **La huida** | 5 a 60 s | Velocidad de vehículo: **más de 15 km/h** sostenida, con vibración del motor y cambios de dirección bruscos (zigzag entre carros). |
| **El apagado** | 1 a 5 min (*estimación*) | El ladrón apaga el celular, lo pone en modo avión o lo mete en una bolsa que bloquea la señal. Aquí perdemos el contacto. |

### 1.2 Cuánto mide el pico (*estimación*)
Si la moto va a 25 km/h (unos 7 m/s) y el jalón dura 0,3 s:

```
aceleración ≈ Δv / Δt = 7 m/s / 0,3 s ≈ 23 m/s² ≈ 2,4 g
```

Encima de eso se suma el golpe de la mano y el giro del celular, así que es razonable esperar picos de **3 g a 6 g** (*estimación*). Los acelerómetros de los celulares miden normalmente hasta ±8 g o ±16 g, así que **no se saturan** en el caso típico.

Para comparar: caminar da picos de ~1,2 a 1,5 g; una caída al piso da un pico de impacto alto, pero **después el celular se queda quieto**, que es justo lo contrario de una huida.

### 1.3 La firma que buscamos: dos condiciones juntas
La clave no es el pico solo (un golpe o una caída también dan picos), sino **el pico seguido de velocidad de vehículo**:

1. **Jalón:** magnitud de aceleración > umbral (ej. 2,5 g) **y** giro brusco (ej. > 5 rad/s) dentro de la misma ventana de ~0,5 s.
2. **Antes del jalón:** velocidad baja (peatón) durante los 10 s previos.
3. **Huida:** en los siguientes 3 a 10 s, velocidad > 15 km/h sostenida (por GPS) **o** aceleración horizontal sostenida en una dirección (por acelerómetro, si el GPS todavía no responde).
4. **Sin tiempo de "subida":** quien se sube a un taxi o mototaxi pasa 10 a 30 s sentado y quieto antes de arrancar. En el arrebato, el pico y la velocidad llegan **casi al mismo tiempo**.

Esto lo podemos programar como una **máquina de estados** sencilla (reposo → posible jalón → confirmando huida → alerta), fácil de explicar al jurado y de ajustar con datos.

---

## 2. Los sensores: qué da cada uno y sus límites

| Sensor | Para qué lo usamos | Frecuencia típica | Límites |
|---|---|---|---|
| **Acelerómetro** | El jalón (pico) y la vibración de la moto | 50 a 100 Hz en apps nativas; ~60 Hz en el navegador | Incluye la gravedad: hay que restarla o usar la magnitud. Ruido distinto según el modelo de celular. |
| **Giroscopio** | El giro brusco del celular al arrancharlo | Igual que el acelerómetro | No todos los celulares baratos lo tienen (*verificar* en los modelos de gama baja comunes en el Perú). |
| **GPS** | Confirmar velocidad de vehículo y la ruta de huida | 1 vez por segundo (1 Hz) | **Lento y con retraso** de 1 a 3 s. En calles con edificios altos el error puede ser de decenas de metros (fuente: estudios de "cañones urbanos"). Puede devolver la velocidad vacía en algunos celulares: hay que calcularla con dos posiciones. |
| **Wi-Fi / Bluetooth** | Señal extra: el celular se aleja de los dispositivos del dueño (reloj, audífonos) | — | Google usa esta señal (fuente secundaria). En la web no tenemos acceso. |

**Conclusión:** el acelerómetro y el giroscopio detectan el jalón al instante; el GPS solo sirve para **confirmar** unos segundos después y para **seguir** la ruta. No podemos depender del GPS para el momento exacto.

---

## 3. Problema difícil #1: escuchar los sensores todo el tiempo

### 3.1 Android (app nativa)
- Para leer sensores con la app en segundo plano y la pantalla apagada se necesita un **servicio en primer plano** (una notificación fija tipo "Protección activa") y un *wake lock* (permiso para que el procesador no se duerma).
- Android 12 prohíbe iniciar ese servicio desde el segundo plano y Android 14 obliga a declarar su tipo; Google Play revisa que el tipo esté justificado.
- **Las marcas son el problema real:** Samsung, Xiaomi, Huawei y otras matan apps en segundo plano de forma agresiva para ahorrar batería (ver dontkillmyapp.com). Lo que funciona en un Pixel puede fallar en un Xiaomi, que es muy común en el Perú. Hay que pedirle al usuario que quite la app de la "optimización de batería".
- **Batería:** leer el acelerómetro a 50 Hz todo el día gasta poco si se hace bien (el chip de sensores trabaja aparte del procesador), pero el GPS encendido todo el tiempo sí gasta mucho. Por eso el GPS **solo se prende después de un posible jalón**.

### 3.2 iPhone (app nativa)
- iOS **no permite** leer el acelerómetro en tiempo real con la app suspendida. Un ingeniero de Apple lo confirmó en sus foros.
- `CMSensorRecorder` graba el acelerómetro en segundo plano, pero **para leerlo después**, no para reaccionar al momento.
- Hay reportes de desarrolladores de que los datos de movimiento siguen llegando si la app tiene una sesión de ubicación activa en segundo plano (fuente: un solo desarrollador, no documentado por Apple, y Apple podría rechazar la app). **Riesgoso.**

### 3.3 Web (PWA, lo que podemos mostrar con una URL pública)
- `DeviceMotionEvent` da acelerómetro y giroscopio; `navigator.geolocation.watchPosition` da posición y velocidad. Requiere **HTTPS**.
- En iPhone hay que pedir permiso con `DeviceMotionEvent.requestPermission()`, y **solo funciona si se llama al tocar un botón**. En Android no pide permiso.
- **Con la pantalla apagada o la pestaña en segundo plano, los eventos se detienen.** Por eso la PWA solo protege con la pantalla prendida. Usamos la **Wake Lock API** para que la pantalla no se apague sola mientras la protección está activa.
- Reporte de octubre de 2025: en iOS 26, los eventos de movimiento no llegan si la página corre dentro de un iframe. **La app tiene que abrirse directo, no incrustada.**

### 3.4 Qué elegimos y por qué (tradeoff para explicarle al jurado)
| Opción | Pros | Contras | Decisión |
|---|---|---|---|
| PWA (web) | URL pública, el jurado la prueba en su celular sin instalar nada, un solo código para Android e iPhone | Solo con la pantalla prendida | **Hackathon** |
| App nativa Android | Funciona en segundo plano, acceso a Bluetooth y Wi-Fi | No cumple "URL pública" sola; problemas con las marcas | **Roadmap** |
| App nativa iPhone | — | iOS no deja leer sensores en tiempo real en segundo plano | Roadmap, con dudas |

El argumento clave: **el arrebato en la calle casi siempre pasa con el celular en la mano y la pantalla prendida**. La PWA cubre ese momento. *Esto hay que confirmarlo con víctimas reales en las entrevistas.*

---

## 4. Problema difícil #2: las falsas alarmas

Si la app avisa a la familia por cada caída, en dos días el usuario la desinstala. Liu et al. (2018) lo dicen claro: si clasificas una vez por segundo, hasta un 0,5% de error da cientos de falsas alarmas al día. Por eso pedimos **las dos condiciones juntas** (jalón + huida).

| Situación que puede confundirse | Cómo se ve | Cómo la descartamos |
|---|---|---|
| **Se cae el celular** | Caída libre (~0 g) y luego impacto | Después del impacto el celular queda quieto, no hay velocidad |
| **Lo tiras a la mochila o al asiento** | Pico corto | No hay velocidad de vehículo después |
| **Te subes a un mototaxi, taxi o combi** | Velocidad de vehículo | No hay jalón justo antes; hay 10 a 30 s de "subida" quieto |
| **Vas en tu propia moto o bici y te cae un bache** | Pico + velocidad | La velocidad **ya era alta antes** del pico |
| **Sales corriendo a tomar el bus** | Velocidad sube | Correr llega a ~3 a 5 m/s; usamos umbral de vehículo (>15 km/h ≈ 4,2 m/s) y pasos de carrera visibles en el acelerómetro |
| **Ladrón a pie o en bici lenta** | Pico + velocidad baja | **Fuera de alcance** por ahora (Google sí lo cubre) |

**Plan de reducción:** ventana de cancelación corta (ver §5), umbrales ajustados con datos reales que grabemos hoy y, si alcanza el tiempo, un modelo pequeño (árbol de decisión o random forest) entrenado sobre esas grabaciones.

---

## 5. Problema difícil #3: avisar antes de que lo apaguen

- **Hay poco tiempo.** El ladrón suele apagar el celular, ponerlo en modo avión o meterlo en una bolsa que bloquea la señal (bolsa de Faraday; documentado en robos en festivales de EE. UU.). No encontramos datos del Perú sobre cuánto tardan: **hay que preguntarlo en las entrevistas**.
- **Por eso la alerta sale en segundos, no en minutos:**
  1. Al detectar el jalón, la app ya empieza a mandar la ubicación cada 1 a 2 s (sin esperar confirmación).
  2. Cuando se confirma la huida, se manda la **alerta completa**: hora, punto del jalón, ruta de huida y velocidad.
  3. Si el dueño fue una falsa alarma, la **cancela después** con su PIN y se manda un "falsa alarma, todo bien". Es mejor avisar y corregir que esperar a que el ladrón lo apague.
- **¿Alarma sonora?** No. Hacer sonar el celular puede provocar violencia contra la víctima o que el ladrón lo tire. La alerta es **silenciosa**.
- **¿Foto del ladrón con la cámara frontal?** Tentador, pero tiene problemas legales (datos personales) y en la web no se puede tomar sin que la pantalla muestre la cámara. Queda como pregunta abierta, no entra en la demo.
- **Sin internet:** en la PWA no hay plan B. En nativo, un SMS de respaldo (roadmap; Zavu podría servir, ver CONTEXT §4).

---

## 6. Datos: lo que tenemos que grabar hoy

No existe un dataset público de arrebatos desde moto (no lo encontramos; Liu et al. usaron simulaciones y no queda claro si publicaron sus datos). **Tenemos que grabar los nuestros**, y eso además sube "Complejidad técnica" y "Funciona con datos reales".

| Grabación | Cuántas (*meta*) | Cómo |
|---|---|---|
| Caminar con el celular en la mano | 10 | Normal, por la calle |
| Caídas y lanzamientos a la mochila | 10 | Sobre una superficie blanda |
| Subirse a un taxi, mototaxi o bus | 5 | Viajes normales |
| **Arrebato simulado** | 10 a 20 | **Con bici o caminando rápido en un lugar vacío**, el celular dentro de una funda, con consentimiento. **No hacer pruebas en moto en la calle.** |

Cada grabación: CSV con tiempo, aceleración (x, y, z), giro (x, y, z), latitud, longitud, velocidad, y una etiqueta. La misma PWA puede tener un **modo "grabar"** para esto.

⚠️ **Seguridad:** nadie se pone delante de una moto para probar. Las simulaciones se hacen a baja velocidad, en un lugar cerrado, y se ajustan los umbrales para la demo (ver §7).

---

## 7. Cómo se ve en la demo (propuesta)

1. **App de la víctima (PWA):** botón "Activar protección" → pide permiso de sensores y ubicación → pantalla prendida con un indicador en vivo de aceleración y estado.
2. **Panel de alertas (web):** mapa en vivo con el punto del jalón, la ruta de huida y la línea de tiempo del evento. Es lo que vería la familia o el serenazgo.
3. **En vivo frente al jurado:** un integrante sostiene el celular, otro lo arrancha y se va corriendo. Para que funcione corriendo, la demo usa un **"modo demo"** con umbral de velocidad bajo (de correr, no de moto). **Hay que decirlo con honestidad** en el pitch.
4. **Repetición con datos reales:** se reproduce una grabación real de arrebato simulado en bici, y el detector corre sobre ella paso a paso.

**Arquitectura mínima:** PWA (sensores + máquina de estados en el celular) → backend con WebSocket o tiempo real (Supabase, Firebase o Cloudflare Durable Objects) → panel web con mapa. Opcional: aviso por WhatsApp a un contacto con Zavu (disponible el domingo 18).

---

## 8. Preguntas abiertas (para las entrevistas)

- ¿Con la pantalla prendida o apagada? ¿Lo tenía en la mano, en el bolsillo o en un soporte?
- ¿Cuánto tardó el celular en dejar de aparecer en "Encontrar mi dispositivo"?
- ¿Qué habría querido que pase en ese momento? ¿Avisar a alguien? ¿A quién?
- ¿Usa mototaxi o moto seguido? (para medir el riesgo de falsas alarmas)
- ¿Qué modelo de celular tiene? (gama baja y marcas comunes en el Perú)

---

## Fuentes

- Liu, Wagner y Egelman (2018), *Detecting Phone Theft Using Machine Learning*, UC Berkeley: [PDF](https://jasonxyliu.github.io/paper/phone-theft_iciss18.pdf) · [eScholarship](https://escholarship.org/uc/item/5bh3n3bt)
- Theft Detection Lock de Android (fuentes secundarias): [BGR](https://bgr.com/tech/how-to-use-googles-ai-powered-theft-detection-lock-in-android/) · [Engadget](https://engadget.com/mobile/smartphones/googles-theft-protection-features-have-started-showing-up-for-some-android-users-210634941.html) · [nextpit](https://nextpit.com/google-android-theft-detection-remote-offline-lock-how-works) · [Droid Life](https://www.droid-life.com/2024/10/07/androids-theft-protection-and-remote-lock-start-rolling-out/amp/)
- Apple y su función contra arrebatos (fuente secundaria): [MacRumors, mayo de 2026](https://www.macrumors.com/2026/05/27/apple-anti-theft-iphone-feature/)
- Prototipo LSTM con sensores del celular (proyecto de estudiantes): [GitHub](https://github.com/collinlojane05-cloud/Capstone-Project-SPU-)
- Android en segundo plano: [dontkillmyapp.com](https://dontkillmyapp.com/google) · [ProAndroidDev: restricciones de servicios en primer plano](https://proandroiddev.com/android-foreground-service-restrictions-d3baa93b2f70) · [ProAndroidDev: más allá de Doze](https://proandroiddev.com/beyond-doze-building-reliable-background-execution-on-modern-android-including-oem-realities-5fa0a6e05672) · [Issue tracker de Google](https://issuetracker.google.com/issues/202561926)
- iOS en segundo plano: [Foro de Apple: acelerómetro en segundo plano](https://developer.apple.com/forums/thread/841616) · [Foro de Apple: movimiento y Core Location](https://developer.apple.com/forums/thread/841001) · [CMSensorRecorder](https://developer.apple.com/documentation/coremotion/cmsensorrecorder.md)
- Web: [WebKit bug 301294 (iOS 26, iframes)](https://bugs.webkit.org/show_bug.cgi?id=301294) · [Foro Defold: permiso de movimiento en Safari](https://forum.defold.com/t/how-to-force-safari-browser-to-allow-deviceorientation-permission-solved/75641)
- GPS en ciudad: [PolyU, posicionamiento urbano](https://www.polyu.edu.hk/rio/research-highlight/impact-stories/im0073/) · [SPIE 2024, velocidad con GNSS del celular](https://journals.spiedigitallibrary.org/conference-proceedings-of-spie/13253/132531H/Smartphone-velocity-estimation-with-raw-GNSS-data/10.1117/12.3041282.full)
- Bolsas de Faraday y modo avión en robos (EE. UU.): [KTNV](https://www.ktnv.com/news/crime/three-men-arrested-for-stealing-phones-at-edc-las-vegas) · [Local10](https://local10.com/news/local/2023/10/25/2-accused-of-stealing-cellphones-from-partiers-at-iii-points-music-festival-in-wynwood)
- Robos en moto en Lima (casos, no estadística): [Panamericana, Av. Arequipa](https://panamericana.pe/buenosdiasperu/locales/460407-detienen-banda-motociclistas-robaban-celulares-avenida-arequipa) · [Panamericana, moteros](https://panamericana.pe/buenosdiasperu/locales/461289-moteros-robaban-celulares-valorizados-s-5-mil-escondian-cajas-zapatillas) · [RPP](https://rpp.pe/lima/actualidad/detienen-a-cinco-integrantes-de-una-banda-delincuencial-dedicada-al-robo-de-celulares-en-varios-distritos-de-lima-noticia-1612310)
- **Falta:** una cifra oficial de robos de celular "al paso" en moto en Lima (buscar en INEI-ENAPRES, Osiptel o la PNP). Las cifras de prensa que encontramos se contradicen.
