# Bloqueo de pantalla ante un arrebato

## La experiencia que buscamos (decisión de diseño)

Hay dos casos y tiran en direcciones opuestas:

| | Arrebato real | Falsa alarma (caída, bache) |
|---|---|---|
| ¿Quién tiene el celular? | El ladrón | La dueña |
| Valor de bloquear | Alto: muchas veces lo arranchan **desbloqueado, en uso** (WhatsApp, banca). | Ninguno |
| Costo de bloquear | Ninguno: la dueña ya no lo tiene. | Alto si para cancelar tiene que desbloquear Android, abrir la app y escribir el PIN antes de que acabe la cuenta. |

Bloquear más tarde quita el costo de la falsa alarma, pero también el valor. Por eso:

1. **Bloquear al instante** (antes incluso de mandar la alerta al panel).
2. **Abrir el "¿Todo bien?" encima de la pantalla de bloqueo**, como un despertador o una llamada
   entrante (aviso de pantalla completa + `setShowWhenLocked`). La dueña escribe el PIN de la app
   y listo: un solo PIN, como antes. Android sigue bloqueado detrás.
3. Con el celular bloqueado **solo se ve esa pregunta**: sin pestañas ni ajustes, y con teclado
   propio (el del sistema puede no abrirse sobre el bloqueo). Al terminar la alerta se quita y
   vuelve la pantalla de bloqueo normal.
4. **Respaldos:** si Android no deja la pantalla completa (permiso quitado en Android 14+), se
   usa la notificación normal y se dan **15 s más** antes de avisar a la red, para que alcance a
   desbloquear. Tras **5 PIN incorrectos** hay que esperar 30 s (más 30 s por cada intento extra):
   sobre la pantalla de bloqueo cualquiera puede probar PINs.
5. **Primer uso:** el bloqueo se ofrece en la pantalla de permisos como recomendado (no obligatorio).
6. **iPhone:** no podemos bloquear la pantalla (ver abajo). Lo más cercano: **tapamos las demás
   apps con Tiempo de uso** al instante (WhatsApp, banca, también la que esté abierta). Además
   guiamos a activar la [Protección en caso de robo de Apple](https://support.apple.com/120340) en
   «Siempre» y el bloqueo automático en 30 s.

### Qué hace la competencia

- **Theft Detection Lock de Google** (Android 10+, en los servicios de Google Play) hace algo
  parecido: con el acelerómetro detecta que te lo arranchan y huyen, y bloquea la pantalla. No
  avisa a nadie ni manda la ruta; eso es lo que agregamos nosotros. Según pruebas de prensa
  ([Android Authority](https://www.androidauthority.com/android-theft-detection-lock-test-3491674/),
  [Tech Advisor](https://www.techadvisor.com/article/3145647/android-theft-protection-5-minutes-to-secure-your-phone.html))
  es difícil de disparar y solo actúa con la pantalla en uso. Las falsas alarmas reportadas
  son anécdotas, no cifras (fuente secundaria).
- **Apple** no da a las apps una forma de bloquear el iPhone; su respuesta es la Protección en
  caso de robo (iOS 17.3+), que pide Face ID y una espera de una hora para cambios delicados
  lejos de lugares conocidos.

### Límites de Android que condicionan el diseño

- Desde Android 10, una app en segundo plano **no puede abrir pantallas** por su cuenta; un
  servicio en primer plano no es excepción
  ([Android: restricciones de inicio en segundo plano](https://developer.android.com/guide/components/activities/background-starts)).
  Por eso usamos un **aviso de pantalla completa** (como los despertadores).
- Desde Android 14, ese permiso solo viene dado para apps de llamadas y alarmas; Play Store se lo
  quita al resto al instalar y el usuario puede quitarlo
  ([AOSP: límites de pantalla completa](https://source.android.com/docs/core/permissions/fsi-limits)).
  La app lo revisa (`canUseFullScreenIntent`) y en Tú ofrece un botón para darlo. Si falta, se
  aplica el respaldo de 15 s.

## Alcance y límite de iPhone

Android: se implementa DevicePolicyManager.lockNow() cuando el detector emite
`alerta` (arrebato confirmado). Un `posible_jalon`, una caída descartada y la prueba
guiada no bloquean. En modo demo, una alerta confirmada también puede bloquear:
ese modo solo cambia los umbrales del detector.

iPhone: no hay una API pública equivalente para una app de consumo. Apple ofrece
DeviceLock mediante MDM, que exige enrolar el dispositivo y disponer de un servidor
de gestión. No usamos MDM, APIs privadas ni una pantalla que simule un bloqueo del sistema.

### iPhone: bloqueo de verdad con Atajos (SMS a la propia dueña)

Una app no puede bloquear el iPhone, pero la app **Atajos** sí (acción «Bloquear pantalla», iOS 16.4+), y
una automatización «Mensaje» puede correr sola sin preguntar («Ejecutar inmediatamente», iOS 17+).
La dueña la crea una vez, guiada en el primer uso y en Tú:

1. Atajos › Automatización › + › «Mensaje» › «El mensaje contiene» `AA-BLOQUEO`.
2. «Ejecutar inmediatamente» › «Nuevo atajo en blanco» › acción «Bloquear pantalla».
3. Escribe su número en la app y toca **Probar**: le llega el SMS y el iPhone se bloquea.

Al confirmar un arrebato, la app manda su número con la `alerta` y el backend le envía **al instante** el
SMS con la palabra (Zavu, solo SMS). El iPhone se bloquea y el ladrón necesita el código, igual que en Android.

- **Necesita señal** y tarda unos segundos (lo que tarde el SMS). Por eso se mantiene también el escudo de
  Tiempo de uso, que es instantáneo y sin señal.
- **Falsa alarma:** la dueña desbloquea con Face ID y cancela con el PIN. Se dan los 15 s extra.
- Apple siempre muestra un aviso cuando corre una automatización: no se puede ocultar.
- Cualquiera que mande un SMS con la palabra bloquea el iPhone. Es inofensivo: solo bloquea.
- La palabra está en `apps/api/src/mensajes.ts` (`PALABRA_BLOQUEO`) y en `apps/movil/src/bloqueo.ts`
  (`PALABRA_BLOQUEO_ATAJOS`): deben ser iguales.

Fuentes (secundarias): [acción Bloquear pantalla](https://9to5mac.com/2024/05/28/make-iphone-lock-screen-shortcut/),
[«Ejecutar inmediatamente» en automatizaciones de Mensaje](https://matthewcassinelli.com/automations-run-immediately-shortcuts-notifications),
[Apple: disparador Mensaje](https://support.apple.com/guide/shortcuts/apdd711f9dff/ios).

**No probado todavía:** que la automatización bloquee con la pantalla apagada y con el iPhone en uso por otra
persona, y cuánto tarda el SMS en llegar.

### iPhone: tapar las apps con Tiempo de uso (no es un bloqueo)

Lo más cercano que Apple permite es **Tiempo de uso** (frameworks FamilyControls y
ManagedSettings, iOS 16+), el mismo que usan las apps de control parental. Con la autorización
del dueño (diálogo de Apple, se confirma con Face ID o el código), al confirmar un arrebato el
módulo `modules/bloqueo-pantalla/ios` pone un **escudo sobre todas las demás apps y sitios web**
(`shield.applicationCategories = .all()`), incluida la que esté abierta, y prohíbe borrar
Alerta Arrebato para que la ruta siga llegando.

- **No es un bloqueo de pantalla:** el ladrón ve el inicio. Apple no deja tapar Teléfono,
  Ajustes ni las apps de "Siempre permitidas"
  ([foro de Apple](https://developer.apple.com/forums/thread/793613)). Nuestra app no se tapa
  ([documentación](https://developer.apple.com/documentation/managedsettings/shieldsettings/applicationcategories-swift.property)).
- **Falsa alarma:** iPhone no deja abrir la pregunta sobre el bloqueo, así que la dueña
  desbloquea el iPhone, abre la notificación y escribe el PIN: las apps vuelven solas. Por eso
  también se dan los **15 s más** antes de avisar a la red.
- **Robo de verdad:** las apps siguen tapadas hasta que la dueña escriba el PIN en
  **Tú › Bloqueo antirrobo › Desbloquear mis apps** (o lo quite en Ajustes › Tiempo de uso).
- Sin código en el iPhone no se aplica (`sin_clave`): el ladrón lo quitaría en Ajustes.
- **Permiso de Apple (entitlement):** `com.apple.developer.family-controls` en `app.json`. Para
  compilar e instalar desde Xcode basta la versión de desarrollo (cuenta de pago de Apple
  Developer). Para TestFlight o App Store hay que pedir la de distribución a Apple
  ([formulario](https://developer.apple.com/contact/request/family-controls-distribution)),
  que tarda días o semanas: **pendiente**.

**No probado todavía en un iPhone físico:** compila para el simulador, pero falta comprobar
que el escudo se pone con la app en segundo plano (pantalla apagada o en otra app), que tapa
la app abierta al instante y que el PIN lo quita.

Web y Expo Go: sin bloqueo del sistema. Android necesita recompilar la app con el
módulo local `modules/bloqueo-pantalla`.

## Autorización del dueño

En **Tú → Bloqueo antirrobo**:

1. Configurar un PIN, patrón o contraseña del sistema Android.
2. Autorizar a Alerta Arrebato como administrador en el diálogo oficial.
3. Usar **Probar bloqueo**, que pide confirmación y recuerda la clave necesaria.

La política solicita únicamente `force-lock`. No solicita borrar datos, cambiar
claves ni leer intentos de desbloqueo. La autorización puede revocarse en los ajustes
de administradores de Android. No se bloquea el celular al revocar o desinstalar.

El PIN de la app no reemplaza la clave de Android. Sin clave del sistema no se envía
la orden: apagar la pantalla de un teléfono sin clave no protegería sus datos.

## Integración

`servicio.iniciarAlerta` inicia el envío al panel y la cuenta para la familia, y llama
al bloqueo en el mismo turno, sin esperar ninguna respuesta de red. No espera los
10/15/20 segundos elegidos para el aviso familiar.

El módulo revisa la clave y la autorización cada vez, para detectar revocaciones.
Los fallos o una plataforma no compatible se registran y no cancelan las alertas.
No se cierra la sesión de Google, bancos o WhatsApp. Se solicita el bloqueo seguro
del sistema; después se sigue intentando enviar ubicación con los servicios de fondo
existentes. Hay que comprobar esa continuidad en cada celular.

El estado `solicitado` significa que lockNow retornó sin excepción. No se presenta
como prueba de bloqueo físico: este se verifica por separado en el dispositivo.
La pantalla de falsa alarma y el registro muestran el resultado de la orden.

## Probado en emulador (Android 15, API 35) — 17 de octubre

Build release (`assembleRelease`, sin backend: `EXPO_PUBLIC_URL_ALERTAS=ninguno`), clave de
Android puesta y administrador autorizado con `adb`. Con **Herramientas → Ensayar en 5 s** y la
app en segundo plano (en el inicio de Android):

- Android se bloqueó (`isKeyguardShowing=true`) y el "¿Todo bien?" apareció **encima** del bloqueo
  con la cuenta regresiva corriendo. Android muestra "bloqueado por política": tras `lockNow`
  pide la clave (no huella ni cara), bueno contra el ladrón.
- PIN incorrecto: "PIN incorrecto", la alerta sigue. PIN correcto: alerta cancelada "antes de
  avisar a tu red" y vuelve la pantalla de bloqueo de Android (sigue pidiendo su clave).
- El botón de inicio no saca la pregunta del bloqueo. "Atrás" la cerraba (y al tocar la
  notificación Android pedía desbloquear): corregido, ahora "Atrás" no hace nada ahí.
- Encontrado y corregido: con la app en segundo plano los temporizadores de JS se congelan; el
  ensayo ahora se revisa con cada lote de sensores, como la cuenta para la familia.

## Probado en un celular físico — 18 de octubre

Samsung Galaxy A17 4G (SM-A175F, Android 16), build release con el backend real, ensayo de
Herramientas con la app en segundo plano:

- Primera vez: faltaba autorizar a la app como administrador y **no se bloqueó**, sin aviso claro.
  Por eso Inicio ahora avisa "Tu celular no se bloqueará si te lo roban" con lo que falta (#39).
  En Samsung, además, el **Bloqueador automático** impide la depuración por USB: hay que apagarlo
  para instalar por cable (y volver a encenderlo después).
- Con todo autorizado: el celular **se bloqueó**, el "¿Todo bien?" apareció **encima del
  bloqueo**, y al cancelar con el PIN **no llegó ningún mensaje** a la red.

**No probado todavía:** que la ruta GPS siga enviándose con el celular bloqueado (en la calle, sin
cancelar), y el respaldo sin permiso de pantalla completa en un celular (sí cubierto por pruebas
automáticas). Un solo modelo de celular: otros fabricantes pueden comportarse distinto.

## Verificación antes de aprobar

Las pruebas automáticas pasan señales del simulador por el detector real, conectadas
al servicio con adaptadores nativos y red simulados. Comprueban el disparador, una sola
orden por alerta, ausencia de bloqueo en descartes/prueba guiada, red pendiente,
fallos y envío familiar. No son una prueba de hardware ni de exactitud ante robos reales.

La CI compila el APK Android y procesa el manifiesto, incluido el receptor administrador.
La ejecución del workflow no sustituye las siguientes pruebas manuales:

- Android compilado con clave y administrador autorizado: comprobar que la prueba manual
  bloquea y exige clave del sistema.
- Arrebato confirmado de prueba con sensores inyectados: comprobar el bloqueo sin esperar
  al servidor ni a la cuenta familiar.
- Sin Internet: comprobar el bloqueo; registrar el fallo de envío sin afirmar que se avisó.
- Sin clave o permiso revocado: comprobar que se informa el problema y la alerta continúa.
- Después del bloqueo: comprobar GPS, cuenta familiar y envío con pantalla apagada.
- Con el celular bloqueado por la alerta: comprobar que aparece el "¿Todo bien?" encima del
  bloqueo, que solo se ve esa pantalla (atrás/inicio llevan al bloqueo de Android) y que el PIN
  correcto cancela sin desbloquear Android. El incorrecto no; 5 incorrectos hacen esperar 30 s.
- Sin permiso de pantalla completa: comprobar la notificación normal y los 15 s extra.
- Caída descartada y prueba guiada: comprobar que no bloquean.
- Web: comprobar el aviso de función no disponible, sin orden nativa de bloqueo.
- iPhone físico: autorizar Tiempo de uso, ensayar con la app en segundo plano y comprobar que
  WhatsApp y Safari quedan tapados, que cancelar con el PIN los destapa y que, sin cancelar,
  siguen tapados hasta "Desbloquear mis apps".

**Pendiente de validación física.** No afirmar que funciona en un Android real ni en ambos
sistemas hasta registrar esas pruebas. El PR debe permanecer en borrador mientras falte
esa validación y la decisión sobre iOS.

## Fuentes oficiales

- [DevicePolicyManager.lockNow](https://developer.android.com/reference/android/app/admin/DevicePolicyManager#lockNow()).
- [Administración de dispositivos Android](https://developer.android.com/work/device-admin).
- [DeviceLock de Apple](https://developer.apple.com/documentation/devicemanagement/devicelockcommand).
- [Gestión de dispositivos y enrolamiento MDM](https://developer.apple.com/documentation/devicemanagement/).
