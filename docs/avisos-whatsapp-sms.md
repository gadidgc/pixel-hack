# Avisos a la red: SMS con enlace, llamada y WhatsApp (estado al 18 de octubre, 04:30)

> **Cambio del 18 de octubre, 05:00.** Zavu rechaza los enlaces en SMS (revisión automática "AI"/"Security"),
> aunque la cuenta tenga KYC y el dominio sea propio (`alerta.gadidgc.com`). Por eso:
> - **El SMS lleva todo lo necesario y un código** (ej. `28KAAK1`: 6 letras del id de la alerta + número del
>   contacto). El contacto entra a **alerta.gadidgc.com/aviso** (la web, sin instalar nada; no hay botón en la
>   app), escribe el código y ve la página en vivo: ruta, "Yo me encargo" y "Sí, fue un robo".
> - Esa dirección es **siempre la misma**: antes de cada SMS el backend pregunta a Zavu (`POST /v1/urls`) si ya
>   la aprobó. Si sí, el SMS la lleva escrita; si no, sale el SMS solo con el código (la llamada dice la web).
>   Cuando Zavu la apruebe una vez, todos los SMS la llevan, sin cambiar código.
> - **Zavu llama a cada contacto**: la voz dice la web y lee el código letra por letra (agente "Alerta Arrebato" con voz en
>   el sender `pixel`; se apaga con `ZAVU_LLAMADAS`).
> - **WhatsApp** (Meta) sigue mandando el enlace directo (token renovado el 18; plantillas aún en revisión).


Cuando la app confirma un arrebato, el backend ([apps/api](../apps/api)) avisa a los contactos de confianza
por **dos canales a la vez**. Si uno falla, el otro igual llega.

| Canal | Desde | A quién le llega | Qué dice |
|---|---|---|---|
| **WhatsApp** (Meta, WhatsApp Cloud API) | +51 914 652 364 (sale como **"ExamPrazol"**, número prestado de otro proyecto de Gabriel) | Con plantilla aprobada: **a cualquiera**. Mientras Meta revisa las plantillas: solo a quien le escribió a ese número en las últimas 24 h. | La alerta completa **con el enlace a la ruta en vivo** |
| **SMS** (Zavu, sponsor, plan Pro) | +1 928 251 8311 | **A cualquier número** | Un aviso neutro con un **código** para abrir la ruta en la app o en alerta.gadidgc.com/aviso |
| **Llamada** (Zavu, voz) | +1 928 251 8311 | **A cualquier número** | Una voz en español que lee el código letra por letra |

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
