# Límites del bloqueo de Google y apps parecidas

> Investigación del sábado 17 de octubre de 2026 · Pedido de Cesar, para la exposición.
> Responde la pregunta que hará el jurado: **"Si Google ya detecta el robo, ¿por qué usar lo de ustedes?"**
> La página de ayuda de Google es fuente oficial. Lo que viene de prensa, reseñas o foros está marcado como fuente secundaria.
> Las funciones y precios de las apps cambian seguido: **revisarlas en su tienda de apps antes de la exposición.**

---

## Resumen en 1 minuto

1. **Google ya detecta el arrebato**, pero **solo bloquea la pantalla**: nadie se entera y el dato del robo se pierde.
2. **Las apps de SOS sí avisan a la familia**, pero **hay que apretar un botón**, y en un arrebato no hay tiempo.
3. **Las apps antirrobo** (Prey, Cerberus, Lookout) **le avisan al dueño**, que ya no tiene el celular.
4. **No encontramos ninguna app que detecte sola el arrebato y avise sola a la familia** (búsqueda rápida en inglés y portugués). Ese es nuestro lugar.
5. **No competimos con Google, lo sumamos:** su bloqueo protege los datos; nuestra app avisa a la familia.

---

## 1. Qué es el bloqueo de Google

Se llama **Bloqueo por detección de robo** (*Theft Detection Lock*). Está en **Ajustes → Google → Todos los servicios → Protección antirrobo**, o en Samsung en **Protección contra robo**. Con los sensores detecta que alguien arranchó el celular y se fue (corriendo, en bici o en auto) y **bloquea la pantalla**. Nada más.

Viene junto con otras protecciones:

| Función | Qué hace |
|---|---|
| Bloqueo sin conexión | Se bloquea si el ladrón corta el internet o pone modo avión |
| Bloqueo por error de autenticación | Se bloquea tras varios intentos fallidos de PIN o huella |
| Bloqueo remoto | Se bloquea desde android.com/lock con solo el número (hay que activarlo antes) |
| Comprobación de identidad | Pide huella o cara para cambiar ajustes importantes fuera de lugares de confianza |

Un integrante del equipo lo tenía activado en su Galaxy **sin saberlo**.

---

## 2. Los 14 límites del bloqueo de Google

### 2.1 Los que reconoce Google en su página de ayuda (fuente oficial)
1. **No funciona con la pantalla bloqueada.** Solo actúa cuando el celular está en uso.
2. **Puede no activarse con Wi-Fi o Bluetooth estable.** Por ejemplo, en un café con su Wi-Fi o caminando con audífonos Bluetooth.
3. **Puede no activarse tras varios bloqueos en poco tiempo.** Google no dice cuántos ni en cuánto tiempo.
4. **No detecta todos los robos.**

### 2.2 Los que encontró la prensa en pruebas (fuente secundaria)
5. **Cuesta activarlo.** En la prueba de Android Authority lo intentaron docenas de veces sin que se bloqueara; solo funcionó con una carrera larga y rápida.
6. **Si te lo quitan de la mesa, no detecta nada** (Android Authority).
7. **A veces se activa por error.** A un periodista de Tom's Guide se le activó varias veces sin que lo robaran.

### 2.3 Los que vienen de cómo está diseñado
8. **Solo bloquea, no avisa a nadie.** La familia no se entera y nadie recibe la ubicación.
9. **El dato del robo se pierde.** No queda dónde fue, a qué hora ni hacia dónde se fue el ladrón: no sirve para la denuncia ni para saber qué zonas son peligrosas.
10. **No existe en iPhone** (~19% de los celulares en el Perú según StatCounter, julio de 2026). Apple no tiene detección de arrebato.
11. **No llega a los celulares viejos.** La prensa dice que pide Android 10 o más nuevo; Google no lo confirma en su página y solo dice que la opción aparece gris en los celulares que no lo soportan.
12. **En muchos celulares hay que activarlo.** Samsung publicó un comunicado pidiendo a sus usuarios que lo activen, y en México la prensa dice que pocos saben que existe.
13. **Necesita PIN o huella.** Sin bloqueo de pantalla no protege nada.
14. **Google no publica cifras** de cuántos robos detecta ni de sus falsas alarmas.

---

## 3. Apps que hacen lo mismo o más

| App | Qué hace | ¿Detecta sola el arrebato? | ¿Avisa sola a la familia? |
|---|---|---|---|
| **Google / Samsung** (Protección contra robo) | Bloquea la pantalla al detectar el arrebato | ✅ | ❌ |
| **Apple** (Protección de dispositivo robado) | Pide Face ID para cambiar ajustes importantes fuera de lugares conocidos. Según AppleInsider, desde iOS 26.4 viene activada para todos | ❌ | ❌ |
| **Encontrar mi dispositivo / Find Hub** (Google) | Ubicar, hacer sonar, bloquear y borrar desde otro celular | ❌ | ❌ |
| **SOS del celular** (Android y iPhone) | Si aprietas el botón de encendido varias veces, manda la ubicación por SMS a tus contactos | ❌ Hay que apretarlo | 🟡 Solo si lo aprietas |
| **Prey** (nació en Chile) | Ubicación, alarma, fotos del ladrón, bloqueo. Gratis y de pago | ❌ | ❌ Avisa al dueño |
| **Cerberus** | Fotos y audio del ladrón, aviso de cambio de chip, pantalla falsa de apagado. Una reseña dice que no está en Google Play por la regla de permisos | ❌ | ❌ Avisa al dueño |
| **Lookout** | Correo al dueño si cambian el chip o apagan el celular, foto de quien lo tiene (casi todo de pago) | ❌ | ❌ |
| **Bitdefender** (antirrobo) | Manda el número del chip nuevo a un contacto | ❌ | 🟡 Solo si cambian el chip |
| **PhoneShield** | Foto del intruso y aviso de cambio de chip | ❌ | ❌ |
| **bSafe** | SOS por voz o toque, con video y audio en vivo para tus contactos | ❌ Hay que activarlo | 🟡 Manual |
| **Life360** | Ubicación de la familia y botón de ayuda | ❌ | 🟡 Manual |
| **Celular Seguro** (Brasil, gobierno) | Un botón bloquea la línea, el celular y las apps del banco | ❌ | ❌ |

Para la lista de apps de seguridad del Perú y de la región (Lima Segura, Reach, SOSAFE), ver [funcionalidades-app.md](funcionalidades-app.md) §2.3.

---

## 4. El hueco que nadie cubre

```
        DETECTA SOLO                  AVISA A LA FAMILIA
   ┌──────────────────┐          ┌──────────────────────┐
   │  Google/Samsung  │          │  SOS, bSafe, Life360  │
   │  (solo bloquea)  │          │  (hay que apretarlo)  │
   └────────┬─────────┘          └──────────┬───────────┘
            └────────────┬──────────────────┘
                         ▼
               🟢 VIGÍA
         detecta solo + avisa sola a la familia
```

- Google **detecta solo**, pero **no avisa**.
- Las apps de SOS **avisan**, pero **hay que apretar el botón**.
- Las apps antirrobo **avisan al dueño**, que ya no tiene el celular.

**No encontramos ninguna app que haga las dos cosas.** Es una búsqueda rápida: antes de la exposición, revisar las tiendas de apps.

---

## 5. Comparación honesta: Google frente a nuestra app (solo el robo)

| | Google | Vigía |
|---|---|---|
| Qué hace al detectar | Bloquea la pantalla | Manda la alerta con ubicación y ruta de huida |
| ¿Alguien se entera? | ❌ | ✅ La familia (**cuando exista el servidor y el panel**, ver PLAN) |
| ¿Funciona sin abrir nada? | ✅ En segundo plano | ❌ **Hay que abrir la app y dejar la pantalla prendida** |
| Ladrón a pie | ✅ | ❌ (solo en modo demo) |
| Ladrón en moto o bici | ✅ | ✅ Confirmado con la velocidad de vehículo |
| Carterista o robo de la mesa | ❌ | ❌ |
| iPhone | ❌ | ✅ Con la app abierta |
| Necesita GPS e internet | No | ✅ Sí |
| ¿Publica sus cifras? | ❌ | ✅ 23/24 jalones y 5 falsas alarmas en 93 h ([validacion-datos-reales.md](validacion-datos-reales.md)), con datos de terceros, todavía no con arrebatos reales en moto |
| ¿Qué pasa con el dato del robo? | Se pierde | Queda registrado (cuando exista el servidor) |

**Conclusión:** no se reemplazan, se complementan. Google está siempre activo y protege los datos; nuestra app está activa cuando la abres (por ejemplo, caminando con el mapa abierto) y avisa a la familia.

---

## 6. Cómo decirlo en la exposición

**Diapositiva "¿Y Google?":**
> *"Google ya detecta el arrebato, pero solo bloquea la pantalla: tu familia no se entera y el dato del robo se pierde. Las apps de SOS sí avisan a tu familia, pero tienes que apretar un botón, y cuando te arranchan el celular no hay tiempo. Nosotros juntamos las dos cosas: detecta solo y avisa solo."*

**Si el jurado pregunta "¿por qué no usar lo de Google?":**
> *"Úsalo, y déjalo activado: protege tus datos. Pero Google mismo dice que puede no activarse si tienes audífonos Bluetooth o Wi-Fi, y no publica cuántos robos detecta. Nosotros publicamos los nuestros."*

### Lo que NO hay que decir
- *"Google no sirve"*: sí sirve, solo hace otra cosa.
- *"Somos los únicos en el mundo"*: decir *"no encontramos ninguna"*.
- *"Ya avisamos a la familia"*, si el servidor y el panel no están listos. El evento exige separar lo que funciona de lo que falta.
- Ocultar nuestro límite principal (la app tiene que estar abierta): mejor decirlo antes de que lo pregunte el jurado.

---

## Fuentes
- Google: [Protege tus datos personales contra robos (página oficial)](https://support.google.com/android/answer/15146908?hl=en)
- Pruebas y reseñas del bloqueo de Google: [Android Authority](https://www.androidauthority.com/android-theft-detection-lock-test-3491674/) · [Tom's Guide](https://www.tomsguide.com/phones/iphones/the-iphone-could-steal-one-of-the-best-android-features-and-im-all-for-it) · [BGR: Android 16](https://bgr.com/2085976/android-16-new-anti-theft-features-2026/) · [Droid Life](https://www.droid-life.com/2024/10/07/androids-theft-protection-and-remote-lock-start-rolling-out/)
- Activación: [Samsung: pide activar las funciones antirrobo](https://news.samsung.com/au/samsung-encouraging-users-to-activate-latest-anti-theft-features-available-on-one-ui-7-to-help-tackle-phone-theft) · [Xataka México: pocos saben que existen](https://www.xataka.com.mx/celulares-y-smartphones/pocos-saben-mexico-celulares-android-tienen-funciones-anti-robo-asi-se-activan)
- Celulares en el Perú: [StatCounter: sistemas operativos](https://gs.statcounter.com/os-market-share/mobile/peru) · [StatCounter: versiones de Android](https://gs.statcounter.com/android-version-market-share/mobile/peru)
- Apple: [Protección de dispositivo robado (página oficial)](https://support.apple.com/120340) · [AppleInsider: activada por defecto en iOS 26.4](https://appleinsider.com/articles/26/02/16/ios-264-has-iphone-stolen-device-protection-on-by-default) · [Moonlock: falla de la función](https://moonlock.com/stolen-device-protection-flaw)
- Apps antirrobo: [SlashGear](https://www.slashgear.com/1322574/best-anti-theft-apps-android/) · [Make Tech Easier](https://maketecheasier.com/best-anti-theft-apps-for-android) · [Naija Tech Guide](https://www.naijatechguide.com/best-anti-theft-apps-for-android.html) · [AlternativeTo: PhoneShield](https://alternativeto.net/software/phoneshield-catch-intruders-/)
- SOS y apps de seguridad personal: [Correio Braziliense](https://www.correiobraziliense.com.br/aqui/?p=34488)
