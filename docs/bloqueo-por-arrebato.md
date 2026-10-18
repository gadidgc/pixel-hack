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
6. **iPhone:** no podemos bloquearlo. En vez de solo decir "no disponible", guiamos a activar la
   [Protección en caso de robo de Apple](https://support.apple.com/120340) en «Siempre» y el
   bloqueo automático en 30 s.

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
de gestión. Este PR no incorpora MDM, APIs privadas ni una pantalla que simule un
bloqueo del sistema. La interfaz dice que el bloqueo no está disponible; el detector
y el envío de alertas continúan. Por ello el requisito de bloquear también un iPhone
personal queda **sin cumplir** y necesita otra decisión de arquitectura.

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
- iPhone y web: comprobar el aviso de función no disponible, sin orden nativa de bloqueo.

**Pendiente de validación física.** No afirmar que funciona en un Android real ni en ambos
sistemas hasta registrar esas pruebas. El PR debe permanecer en borrador mientras falte
esa validación y la decisión sobre iOS.

## Fuentes oficiales

- [DevicePolicyManager.lockNow](https://developer.android.com/reference/android/app/admin/DevicePolicyManager#lockNow()).
- [Administración de dispositivos Android](https://developer.android.com/work/device-admin).
- [DeviceLock de Apple](https://developer.apple.com/documentation/devicemanagement/devicelockcommand).
- [Gestión de dispositivos y enrolamiento MDM](https://developer.apple.com/documentation/devicemanagement/).
