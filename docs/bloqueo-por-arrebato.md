# Bloqueo de pantalla ante un arrebato

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
- PIN incorrecto y correcto: comprobar cancelación solo con el correcto tras desbloquear Android.
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
