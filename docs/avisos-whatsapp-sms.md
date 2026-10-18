# Avisos a la red: SMS con enlace, llamada y WhatsApp (estado al 18 de octubre, 04:30)

> **Cambio del 18 de octubre, 04:30.** Desde las 23:52 del 17 el WhatsApp fallaba (token de Meta vencido, error
> 401/190); Gabriel lo renovó, pero las plantillas siguen "En revisión". Por eso ahora:
> - **El SMS lleva el enlace** a la ruta en vivo, con un texto neutro (sin "robo" ni "alerta" en el cuerpo). Si
>   el filtro de Zavu lo bloquea igual, se manda al toque el SMS de antes, sin enlace.
> - **Zavu llama a cada contacto** (agente "Alerta Arrebato" con voz en español en el sender `pixel`):
>   "te llama la aplicacion Alerta Arrebato… revisa el mensaje de texto con su ubicacion". Se apaga con
>   `ZAVU_LLAMADAS` en `apps/api/wrangler.jsonc`. Cada llamada queda en `envios` con tipo `llamada`.
> - **Falta probar con un envío real** que el SMS con enlace pase el filtro (ver `envios`: "enviado sin enlace"
>   quiere decir que lo bloqueó).


Cuando la app confirma un arrebato, el backend ([apps/api](../apps/api)) avisa a los contactos de confianza
por **dos canales a la vez**. Si uno falla, el otro igual llega.

| Canal | Desde | A quién le llega | Qué dice |
|---|---|---|---|
| **WhatsApp** (Meta, WhatsApp Cloud API) | +51 914 652 364 (sale como **"ExamPrazol"**, número prestado de otro proyecto de Gabriel) | Con plantilla aprobada: **a cualquiera**. Mientras Meta revisa las plantillas: solo a quien le escribió a ese número en las últimas 24 h. | La alerta completa **con el enlace a la ruta en vivo** |
| **SMS** (Zavu, sponsor, plan Pro) | +1 928 251 8311 | **A cualquier número** | Un aviso neutro **con el enlace** a la ruta en vivo (si el filtro lo bloquea, sin enlace) |
| **Llamada** (Zavu, voz) | +1 928 251 8311 | **A cualquier número** | Una voz en español: revisa el SMS con la ubicación y llama a la persona |

Probado de verdad en un celular del equipo: llegaron la alerta por WhatsApp y por SMS, y el "está bien" al cancelar.

## Cómo probarlo hoy (cada integrante)
1. Desde tu celular abre https://wa.me/51914652364?text=hola y manda el "hola" (vale 24 h). Si te responde algo raro, ignóralo: el número es prestado.
2. Android: instala la app desde https://alerta-arrebato.gabrieldgc1999.workers.dev/api/descargar/android
3. En la app, agrega a un compañero como contacto y haz la "prueba guiada": le llega un WhatsApp y un SMS.
4. iPhone: no hay app instalable (falta cuenta de desarrollador de Apple); el iPhone sirve como **contacto** que recibe la alerta y abre el enlace.

## SMS de bloqueo de iPhone (Atajos)

Si la dueña configuró su número en la guía de Atajos (Tú › Bloqueo antirrobo), al llegar una `alerta` el
backend le manda **al instante** (sin esperar la cuenta) el SMS `Alerta Arrebato AA-BLOQUEO. Si no fuiste
tu, ignora este mensaje.` a **su propio número**. Su automatización de Atajos bloquea la pantalla al recibirlo.
Solo SMS (un WhatsApp no dispara la automatización), sin enlace y sin "robo". El número no se guarda en la
base: solo queda enmascarado en `envios` con tipo `bloqueo_iphone`. El botón **Probar** usa el tipo
`probar_bloqueo`.

## Límites que hay que conocer (para no sorprendernos en la demo)
- **El SMS no lleva enlace.** El filtro antifraude de Zavu bloquea como "phishing" todo SMS que hable de un celular robado o tenga un enlace (`sms_compliance_blocked`). Por eso el SMS solo dice "revisa tu WhatsApp".
- **1 SMS por minuto al mismo número** (regla de Zavu). Si se cancela la alerta antes de un minuto, el "está bien" sale solo por WhatsApp.
- **Costo:** cada SMS a Perú cuesta US$0,28 del crédito de Zavu (US$20 al mes ≈ 70 SMS). Sin verificar identidad en Zavu: máximo 200 SMS al día. Meta cobra unos centavos por conversación (tarjeta ya vinculada).
- **Plantillas de Meta** (`alerta_arrebato`, `alerta_arrebato_bien`, `alerta_arrebato_prueba`): enviadas a revisión el 17 de octubre. Revisar en el [Administrador de WhatsApp](https://business.facebook.com/latest/whatsapp_manager/message_templates). Falta crear `alerta_arrebato_encargado` (ese aviso va por SMS mientras tanto).
- **Plan Pro de Zavu:** gratis 3 meses con el cupón del evento; después cobra. Gabriel debe cancelarlo si no lo usamos.

## Para la demo con el jurado
- Si las plantillas ya están aprobadas: el jurado da su número y recibe el WhatsApp con la ruta y el SMS.
- Si no: le llega el SMS igual, y mostramos la ruta en pantalla con el enlace (o el jurado manda "hola" al número antes).

## Configuración (sin claves en el repo)
- `META_WA_NUMERO_ID` está en [apps/api/wrangler.jsonc](../apps/api/wrangler.jsonc) (no es secreto).
- Secretos en Cloudflare, nunca en el repo: `META_WA_TOKEN` (usuario del sistema "admin" de ExamPrazol, vence en 60 días) y `ZAVU_API_KEY` (clave "live"). Se cambian con `npx wrangler secret put <NOMBRE>` dentro de `apps/api`.
- `GET /api/salud` dice qué canales están activos (`"mensajes": "meta+zavu"`).
- Cada envío queda en la tabla `envios` (número enmascarado) con el motivo si un canal falló.
- Código: [apps/api/src/mensajes.ts](../apps/api/src/mensajes.ts).

## Sponsors (para el pitch: solo lo que de verdad usamos)
- **Zavu:** SMS a cualquier número de Perú (plan Pro con el cupón del evento).
- **Cloudflare** (no es sponsor): web, API y base de datos en una sola URL.
- WhatsApp va por Meta directamente, no por Zavu: conectar nuestro número a Zavu habría desconectado el otro proyecto que lo usa.
