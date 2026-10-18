# Backend de Alerta Arrebato

Cloudflare Workers + D1 (SQLite). Una sola URL pública con HTTPS sirve la web de la app y la API.

| Ruta | Qué hace |
|---|---|
| `POST /api/eventos` | Lo que manda la app (contrato en [docs/PLAN.md §6.1](../../docs/PLAN.md)). `alerta` devuelve el `enlace`; `notificar_familia` devuelve cuántos contactos se avisaron (`avisados` de `total`). |
| `GET /api/alertas/:id` | Lo que ve el contacto en `/a/:id`: nombre, estado, jalón y ruta. **Nunca** devuelve teléfonos. |
| `POST /api/alertas/:id/encargado` | "Yo me encargo": avisa al resto de la red. |
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
npx wrangler secret put ZAVU_API_KEY        # una vez, cuando tengamos la clave (nunca en el repo)
npx wrangler secret put ZAVU_PLANTILLA_ALERTA   # opcional: plantilla de WhatsApp aprobada (variables 1 nombre, 2 hora, 3 enlace)
```

## Decisiones
- **Por qué D1 y no Neon/Supabase:** la web, la API y la base viven en Cloudflare, en una sola URL y sin cadena de conexión que cuidar. Los datos son pocos (alertas y puntos de ruta). El SQL es estándar: si algún día hace falta Postgres (por ejemplo, PostGIS para "Cerca"), se migra a Neon con Hyperdrive.
- **Tiempo real por consulta cada 2 s**, no WebSocket: es más simple, funciona detrás de cualquier red y basta para ver la moto avanzar.
- **Privacidad:** los teléfonos de la red se guardan solo mientras dura la alerta y se borran al cancelarla o a las 24 h (tarea programada cada hora). El registro de envíos guarda el número enmascarado. El enlace es un token aleatorio de 16 caracteres.
- **Mensajes sin tildes:** en SMS una tilde baja el límite de 160 a 70 caracteres por parte.
- Si no hay clave de Zavu, el backend lo dice ("falta configurar Zavu") y la app muestra "No pudimos avisar": nunca dice que avisó si no salió ningún mensaje.
