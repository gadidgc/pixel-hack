# Idea: NEXUS Rescate

Propuesta de Piero (17 de octubre de 2026).

## La idea

Implementar un sistema que detecte señales compatibles con el robo de un celular y, después de intentar verificar que el propietario está a salvo, alerte a familiares o contactos de confianza para que lo ayuden a proteger su línea, identidad, dinero y cuentas.

El sistema no afirmaría automáticamente que ocurrió un robo. Combinaría varias señales, abriría un estado de sospecha y pediría una comprobación segura. Si el usuario confirma el robo o no responde dentro del tiempo configurado, activaría un protocolo familiar coordinado.

## Configuración preventiva

Antes de un incidente, el usuario registra:

- Dos o tres familiares o contactos de confianza.
- Un correo, número alternativo o segundo dispositivo.
- Su operador telefónico.
- Marca, modelo e IMEI del celular, almacenado de manera cifrada.
- Las categorías de cuentas que desea proteger: correo, banca, billeteras y redes sociales.
- Un PIN de seguridad que no sea igual al código de desbloqueo del teléfono.

Cada contacto debe aceptar explícitamente formar parte del círculo de confianza.

## Señales de un posible robo

Ninguna señal aislada debe activar una emergencia. El motor de riesgo puede combinar:

- Extracción o cambio de SIM, cuando el sistema operativo permita detectarlo.
- Pérdida repentina de conexión.
- Desconexión de un reloj u otro dispositivo de confianza.
- Movimiento inusual o salida abrupta de una zona habitual, con permiso del usuario.
- Falta de respuesta a una comprobación de seguridad.
- Activación manual desde un segundo dispositivo o por un familiar.

Los intentos fallidos de desbloqueo y otras señales internas solo se usarían si la plataforma las expone legalmente a la aplicación. Los puntajes iniciales serían reglas del prototipo, no probabilidades científicas de robo.

## Correlación multisensor

La detección no debe depender de una sola señal ni de intentar leer el evento interno de **Bloqueo por detección de robo** de Google. Android no expone públicamente a aplicaciones de terceros un evento que permita distinguir ese bloqueo de cualquier otro bloqueo de pantalla.

NEXUS debe construir su propia hipótesis explicable correlacionando eventos disponibles y autorizados por el usuario:

```text
Movimiento compatible con arrebato
+ desconexión del reloj o dispositivo de confianza
+ cambio de actividad a carrera, bicicleta o vehículo
+ desaparición del heartbeat
+ dispositivo posteriormente bloqueado
= sospecha elevada
```

El bloqueo posterior es una señal secundaria: la aplicación puede conocer que el dispositivo está bloqueado, pero no afirmar que Google lo bloqueó por detectar un robo. La alerta debe mostrar qué señales observó NEXUS y cuáles no pudo comprobar.

### Origen de las señales

| Señal | Implementación posible | Limitación |
|---|---|---|
| Movimiento y cambio de actividad | Sensores del equipo y Activity Recognition de Android | Correr o subir a un vehículo también puede ser una acción normal |
| Separación del reloj | Presencia de un dispositivo asociado por Bluetooth | Puede desconectarse por batería, distancia o interferencia |
| Heartbeat | Evento mínimo enviado periódicamente al backend | La falta de conexión no implica robo |
| Estado de bloqueo | Consulta genérica con `KeyguardManager` | No revela la causa del bloqueo |
| Cambio o ausencia de SIM | APIs de telefonía, según versión y permisos | Cambiar de SIM puede ser legítimo y algunos datos están restringidos |
| Confirmación del propietario | Notificación discreta, reloj o segundo dispositivo | El usuario puede no responder por otras razones |

### Máquina de estados propuesta

```text
NORMAL
  |
  | aparecen dos o más señales correlacionadas
  v
SOSPECHA
  |
  | se solicita una comprobación por un canal disponible
  v
VERIFICANDO
  |                          |
  | respuesta válida         | no responde / confirma peligro
  v                          v
FALSA ALARMA             ALERTA FAMILIAR
                              |
                              | un contacto verifica el incidente
                              v
                         EMERGENCIA CONFIRMADA
```

El servidor controla el temporizador. De esa forma, si el teléfono pierde internet o es apagado después de enviar las primeras señales, la comprobación y el escalamiento pueden continuar desde fuera del dispositivo comprometido.

### Acciones permitidas después de la sospecha

Con autorización configurada previamente, el sistema puede:

- Enviar un evento mínimo y cifrado al backend.
- Iniciar una cuenta regresiva de verificación.
- Consultar al propietario desde un reloj o segundo dispositivo.
- Alertar a los contactos de confianza.
- Advertir sobre posibles solicitudes de dinero o suplantaciones.
- Abrir el checklist familiar para proteger línea, correo, banca y billeteras.
- Conservar una cronología de señales y respuestas para auditoría.

No debe borrar datos, denunciar personas, compartir ubicación permanente ni bloquear cuentas financieras automáticamente. Esas acciones requieren confirmación humana o una integración institucional autorizada.

## Flujo principal

```text
Señales anómalas
      |
      v
Modo sospecha
      |
      v
Comprobación silenciosa al propietario
      |
      +---- Responde que está bien ----> Falsa alarma
      |
      +---- Confirma o no responde ----> Alerta al círculo de confianza
                                             |
                                             v
                                  Verificación por otro canal
                                             |
                                             v
                                  Protocolo familiar de respuesta
```

Cuando se supera el umbral de riesgo, NEXUS muestra una comprobación discreta. El usuario puede indicar que está bien o que necesita ayuda. Si no responde dentro del tiempo configurado, el servidor alerta a sus contactos de confianza.

## Qué reciben los familiares

La alerta debe evitar afirmaciones no verificadas y prevenir la suplantación:

> Posible robo del celular de Piero. NEXUS detectó varias señales y no recibió confirmación. Verifica por otro medio antes de confiar en mensajes, enlaces o solicitudes de dinero provenientes de su número.

El enlace lleva a un panel autenticado donde el círculo puede:

- Intentar contactar al propietario por un canal alternativo.
- Confirmar el robo o marcar una falsa alarma.
- Advertir a otros familiares sobre posibles mensajes fraudulentos.
- Asignar responsables para bloquear la línea y solicitar el bloqueo del IMEI.
- Proteger el correo principal, banca y billeteras.
- Cerrar sesiones mediante los canales oficiales disponibles.
- Registrar la denuncia y las acciones ya realizadas.

El tablero colaborativo evita que todos repitan la misma tarea o supongan que otra persona ya la completó.

## Estados del incidente

```text
Sospecha -> Verificando -> Falsa alarma
                       \
                        -> Emergencia -> Contención -> Caso cerrado
```

## Relación con NEXUS TRUST

NEXUS Rescate conecta el robo físico con sus consecuencias digitales:

- Suplantación por WhatsApp.
- Solicitudes fraudulentas de dinero a familiares.
- Recuperación indebida de cuentas mediante SMS.
- Acceso a correo, banca o billeteras.
- Uso de información privada para nuevas estafas o extorsión.

Por eso puede funcionar como el núcleo de protección activa de NEXUS TRUST, en lugar de depender principalmente de que el usuario suba capturas o complete un reporte después del incidente.

## MVP para la hackathon

El flujo demostrable desde una URL pública sería:

1. El usuario registra dos contactos de confianza.
2. Un simulador web o Android emite dos eventos: cambio de SIM y desconexión del dispositivo de confianza.
3. NEXUS abre el modo sospecha y solicita una comprobación.
4. Al no recibir respuesta, el servidor activa una cuenta regresiva.
5. Los familiares reciben una alerta por WhatsApp, SMS o correo mediante Zavu.
6. Un familiar abre el panel web y confirma el incidente.
7. Se habilita el checklist colaborativo de contención.
8. El sistema genera una advertencia contra suplantaciones y una cronología exportable.

En la demo se debe distinguir claramente entre eventos reales, eventos simulados e integraciones futuras.

## Herramientas de sponsors

- **Zavu:** alertas a familiares por WhatsApp, SMS, voz o correo.
- **n8n:** orquestación del temporizador, escalamiento y asignación de tareas.
- **AtomicMemory:** recordar la configuración del círculo y el estado del protocolo, si aporta valor real al prototipo.
- **Maritime:** posible despliegue del backend y del panel público.

Qatom no sería una pieza central mientras su kit no esté confirmado.

## Riesgos y límites

- El ladrón puede apagar el equipo inmediatamente.
- Un teléfono sin conexión no puede notificar al servidor en ese momento.
- Cambiar la SIM, viajar o perder conexión también puede ser legítimo.
- Android e iOS restringen distintas señales; no se debe prometer acceso que la plataforma no permite.
- Una aplicación convencional no puede bloquear por sí sola la línea, el IMEI ni todas las cuentas.
- Compartir ubicación debe ser opcional, limitado y consentido.
- Los contactos no deben recibir contraseñas, códigos OTP ni información bancaria.
- Una falsa alarma puede preocupar a la familia; se necesitan cancelación segura, tiempos configurables y registro de auditoría.
- Cualquier PIN señuelo debe investigarse con cuidado para evitar poner al usuario en mayor peligro.

## Preguntas por validar

- ¿Qué señales ofrece realmente Android para un prototipo dentro del tiempo disponible?
- ¿Cuánto tiempo debería esperar el sistema antes de alertar a la familia?
- ¿Qué información necesitan los familiares para actuar sin exponer más datos?
- ¿Los usuarios aceptarían registrar previamente su IMEI y sus contactos de confianza?
- ¿Qué canal de alerta funciona mejor si el teléfono principal está comprometido?

## Evidencia pendiente

Todavía no hay entrevista ni prueba con usuarios registrada para esta idea. El siguiente paso es entrevistar a una persona que haya sufrido el robo de un celular y a un familiar que la haya ayudado. Se debe preguntar qué ocurrió durante la primera hora, qué cuentas estuvieron en riesgo, a quién avisaron y qué tarea fue más difícil coordinar.

## Propuesta en una frase

> **NEXUS Rescate detecta posibles robos de celular, verifica el estado del propietario y convierte a sus familiares en una red coordinada de respuesta para proteger su línea, identidad, dinero y contactos.**
