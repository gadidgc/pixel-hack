# Backend de Alerta Arrebato

Cloudflare Workers + D1 (SQLite). Una sola URL pública con HTTPS sirve la web de la app y la API.

| Ruta | Qué hace |
|---|---|
| `POST /api/eventos` | Lo que manda la app (contrato en [docs/PLAN.md §6.1](../../docs/PLAN.md)). `alerta` devuelve el `enlace`; `notificar_familia` devuelve cuántos contactos se avisaron (`avisados` de `total`). |
| `GET /api/alertas/:id` | Lo que ve el contacto en `/a/:id`: nombre, estado, jalón y ruta. **Nunca** devuelve los teléfonos de la red; la línea de la dueña solo aparece en `kit`, después de confirmar el robo. |
| `POST /api/alertas/:id/encargado` | "Yo me encargo": avisa al resto de la red. |
| `POST /api/alertas/:id/robo` | `{contacto}`. El contacto confirma que SÍ fue un robo (solo si la alerta ya se avisó a la red). Desde ahí `GET /api/alertas/:id` trae `kit`: los pasos para bloquear (1820, operadora, denuncia, Checa tu IMEI) y los datos que guardó la dueña (línea, IMEI y DNI si quiso). Si la dueña pone su PIN después, vuelve a falsa alarma y se borra todo. |
| `POST /api/alertas/:id/bloqueo` | `{paso, hecho, contacto}`. Marca un paso del kit; lo ve toda la red con el nombre de quien lo hizo. |
| `GET /api/reportes?lat=&lon=&radioKm=` | "Cerca de ti": reportes de los últimos 30 días dentro de la caja (radio por defecto 1 km, máximo 10), lo más nuevo primero. Sin `dispositivo`. |
| `POST /api/reportes` | Un reporte de la comunidad: `{dispositivo, tipo, lat, lon, nota?}`. `tipo`: `arrebato_moto`, `arrebato_a_pie`, `intento`, `robo`, `sospechoso` o `zona_oscura`. La ubicación se redondea a ~100 m y la nota tiene máximo 140 caracteres. Máximo 5 por hora por celular (429). |
| `POST /api/evidencias` | Sube un video o audio (el cuerpo es el archivo; `Content-Type` video/* o audio/*, hasta 50 MB, cabecera `X-Dispositivo`, y opcionales `X-Lat`/`X-Lon`, `X-Duracion-Ms` y, en audio, `X-Onda`: 8 a 96 dígitos del 0 al 9 con el volumen, para dibujar la onda en la tarjeta). Se guarda en R2 y devuelve `{id, enlace}`. Si el celular tiene una alerta abierta, queda unida a ella y aparece en `GET /api/alertas/:id` como `evidencias`. |
| `GET /api/reportes/:id/evidencias` | Las grabaciones de un reporte (`{id, tipo, mime, enlace, miniatura, onda, duracionMs, creado}`), para la hoja que se abre al tocar su tarjeta. Sin `dispositivo` ni ubicación. |
| `GET /api/evidencias/:id` | Devuelve el archivo (acepta `Range`). El id es un token aleatorio de 16 caracteres. |
| `GET /api/salud` | Si la base de datos y Zavu están listos (la app lo muestra en "Tú"). |
| todo lo demás | La web de la app (`apps/movil/dist`). |

## Correrlo
```bash
npm run migrar:local -w @pixel-hack/api     # crea las tablas en la base local
npm run dev -w @pixel-hack/api              # http://localhost:8787
EXPO_PUBLIC_URL_ALERTAS=http://localhost:8787/api/eventos npm run movil   # la app contra el backend local
npm test -w @pixel-hack/api
```

## Publicar
```bash
npm run desplegar -w @pixel-hack/api        # exporta la web, migra la base remota y publica
npx wrangler r2 bucket create alerta-arrebato-evidencias   # una vez: el bucket de las evidencias (binding EVIDENCIAS)
npx wrangler secret put META_WA_TOKEN       # token de Meta (usuario del sistema, permiso whatsapp_business_messaging)
npx wrangler secret put ZAVU_API_KEY        # Zavu: SMS (clave "live"; hoy configurada)
```

## WhatsApp con Meta (camino principal)
Número: el de ExamPrazol (+51 914 652 364, `META_WA_NUMERO_ID` en wrangler.jsonc). Llega a cualquier número sin que
la persona nos escriba antes, con plantillas aprobadas en el Administrador de WhatsApp (idioma `es`):

| Plantilla | Cuerpo |
|---|---|
| `alerta_arrebato` | Alerta Arrebato: posible robo del celular de {{1}} a las {{2}}. Probablemente está bien. Mira la ruta en vivo de su celular aquí: {{3}} Si hay peligro, llama al 105. |
| `alerta_arrebato_bien` | Buenas noticias de Alerta Arrebato: {{1}} nos confirmó que está bien y que fue una falsa alarma. Gracias por estar atento. |
| `alerta_arrebato_prueba` | Prueba de Alerta Arrebato: {{1}} te eligió como contacto de confianza. Si algún día le arranchan el celular, te llegará un aviso con su ruta, como este ejemplo: {{2}} No tienes que hacer nada. |
| `alerta_arrebato_encargado` | (pendiente de crear; mientras tanto ese aviso va por Zavu) |

Meta exige un método de pago en la cuenta de WhatsApp Business para mandar plantillas (cobra por conversación).
```bash
```

## SMS con Zavu
- Número +1 928 251 8311 (incluido en el plan Pro, con el cupón del evento). Con la clave "live", cada aviso sale también por SMS.
- El SMS usa su propio texto (`sms` en `MENSAJES`), **sin enlace**: el filtro antifraude de Zavu bloquea (`422 sms_compliance_blocked`) los SMS que mencionan un celular robado o llevan enlace.
- Zavu permite 1 SMS por minuto al mismo número y cobra US$0,28 por SMS a Perú.
- Todo el contexto para el equipo: [docs/avisos-whatsapp-sms.md](../../docs/avisos-whatsapp-sms.md).

## Decisiones
- **Por qué D1 y no Neon/Supabase:** la web, la API y la base viven en Cloudflare, en una sola URL y sin cadena de conexión que cuidar. Los datos son pocos (alertas y puntos de ruta). El SQL es estándar: si algún día hace falta Postgres (por ejemplo, PostGIS para "Cerca"), se migra a Neon con Hyperdrive.
- **Tiempo real por consulta cada 2 s**, no WebSocket: es más simple, funciona detrás de cualquier red y basta para ver la moto avanzar.
- **Privacidad:** los teléfonos de la red se guardan solo mientras dura la alerta y se borran al cancelarla o a las 24 h (tarea programada cada hora). El registro de envíos guarda el número enmascarado. El enlace es un token aleatorio de 16 caracteres.
- **"Cerca de ti" sin datos personales:** cuando una alerta se avisa a la red, también aparece como reporte anónimo (`origen: 'alerta'`) en el lugar del jalón redondeado a ~100 m; si después se cancela (falsa alarma), el reporte se borra. El `dispositivo` solo sirve para limitar reportes por hora y nunca sale en la API.
- **Evidencias en R2:** el enlace es un token aleatorio, como el de la alerta. La app guarda siempre una copia en el celular; si la subida falla, lo dice ("Guardada solo en tu celular: <motivo>").
- **Mensajes sin tildes:** en SMS una tilde baja el límite de 160 a 70 caracteres por parte.
- Si no hay clave de Zavu, el backend lo dice ("falta configurar Zavu") y la app muestra "No pudimos avisar": nunca dice que avisó si no salió ningún mensaje.
