# Backend de Vigía

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
| `GET /api/memoria` | `{activa}`: si "Tus notas de falsas alarmas" (Atomic Memory) está configurada. Si no, la app no muestra la sección. |
| `POST /api/memoria/llave` | Entrega una llave aleatoria para este celular (en la base queda solo su hash, con un sujeto aleatorio que es el `user_id` de Atomic Memory). Máximo 5 al día por red y 60 por hora en total (429). |
| `GET /api/memoria/notas?motivo=` | Con `Authorization: Bearer <llave>`: hasta 3 notas de esa persona, las más parecidas al motivo. |
| `POST /api/memoria/notas` | `{texto, motivo?, reemplaza?}` (máx. 140 caracteres). Responde `guardada: true` solo si Atomic Memory devuelve el id. `reemplaza` = corregir: borra la anterior después de guardar la nueva. |
| `DELETE /api/memoria/notas/:id` | Olvida una nota. `borrada: true` solo si Atomic Memory responde `success: true`. |
| `DELETE /api/memoria` | "Borrar todo": borra hasta 10 notas de esa persona por llamada (`{completa: false, borradas}`); cuando Atomic Memory ya no lista ninguna, revoca la llave y responde `completa: true`. La app repite hasta eso y solo entonces olvida su llave. Sin cuota. |
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
npx wrangler secret put ATOMIC_MEMORY_API_KEY   # opcional: notas de falsas alarmas (clave del proyecto, amc_…)
```
Para activar las notas también hace falta la variable `ATOMIC_MEMORY_URL` (`https://api.atomicstrata.ai`), en `vars` de
`wrangler.jsonc` o en el panel de Cloudflare. Solo se acepta HTTPS (HTTP únicamente a `127.0.0.1`/`localhost`, para
el fixture de las pruebas). Sin las dos, la memoria queda apagada y el resto funciona igual.

## WhatsApp con Meta (camino principal)
Número: el de ExamPrazol (+51 914 652 364, `META_WA_NUMERO_ID` en wrangler.jsonc). Llega a cualquier número sin que
la persona nos escriba antes, con plantillas aprobadas en el Administrador de WhatsApp (idioma `es`):

| Plantilla | Cuerpo |
|---|---|
| `alerta_arrebato` | Alerta Arrebato: posible robo del celular de {{1}} a las {{2}}. Probablemente está bien. Mira la ruta en vivo de su celular aquí: {{3}} Si hay peligro, llama al 105. |
| `alerta_arrebato_bien` | Buenas noticias de Alerta Arrebato: {{1}} nos confirmó que está bien y que fue una falsa alarma. Gracias por estar atento. |
| `alerta_arrebato_prueba` | Prueba de Alerta Arrebato: {{1}} te eligió como contacto de confianza. Si algún día le arranchan el celular, te llegará un aviso con su ruta, como este ejemplo: {{2}} No tienes que hacer nada. |
| `alerta_arrebato_encargado` | (pendiente de crear; mientras tanto ese aviso va por Zavu) |

Las plantillas ya aprobadas todavía dicen "Alerta Arrebato", el nombre anterior de la app. Para que digan "Vigía" hay que
mandar plantillas nuevas a revisión de Meta (tarda); mientras tanto se quedan así.

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
- **Notas de falsas alarmas (Atomic Memory, opcional):** un recordatorio personal ("pasa cuando corro al paradero") que la dueña ve **después** de cancelar con su PIN. El detector, la alerta y los avisos **no las leen**: no deciden nada ni son evidencia. La clave del proyecto vive solo en el Worker; la app usa una llave propia que el servidor entrega, y el `user_id` de Atomic Memory sale de la base, nunca de lo que mande el celular. Se guarda verbatim (`skip_extraction`), solo con scope de usuario (sin `session_id`, workspace ni agente). Cuotas durables en D1 (`memoria_uso`), porque Atomic Memory se paga por uso: llaves (5 al día por red, 60 por hora en total), notas guardadas (20 al día por persona, 300 por hora en total) y búsquedas (60 al día por persona); la "red" es un HMAC de la IP con la clave del proyecto, **nunca la IP**, y las ventanas se borran a los 2 días. "Borrar todo" usa `GET /v1/memories/list` + `DELETE /v1/memories/:id` (Cloud no expone `reset-source`) y no revoca la llave hasta que el listado sale vacío. Las respuestas se leen con tope de 64 KB, sin seguir redirecciones, y los errores del proveedor se registran solo con su código (su texto podría repetir la nota). Pruebas: `test/memoria.test.ts`, contra un fixture local que imita la API (`test/fixtures/atomic-memory-falso.ts`), **no** contra el servicio real.
- Si no hay clave de Zavu, el backend lo dice ("falta configurar Zavu") y la app muestra "No pudimos avisar": nunca dice que avisó si no salió ningún mensaje.
