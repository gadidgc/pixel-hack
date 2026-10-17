# Síntesis: Track Seguridad

Claude mantiene este archivo. Se reconstruye a partir de `members/*/` cada vez que alguien dice **"sintetiza"**.
Puntaje = Tracción×6 + Técnico×8 + Pitch×6 (la fórmula oficial del jurado, ver CONTEXT §2).

**Última síntesis:** 2026-10-17 (inicial; ideas semilla de Claude, carpetas todavía vacías)
**Qué cambió:** todavía nadie ha subido nada a su carpeta.

| # | Idea | Subárea | De | Tracción | Técnico | Pitch | **Proyectado /100** | Evidencia hasta ahora |
|---|---|---|---|---|---|---|---|---|
| A | ¿Es Estafa? (bot de WhatsApp) | Estafas / suplantación | Claude | 1 | 4 | 5 | **68** | ninguna aún |
| B | Yape Real (verificador de pagos para bodegas) | Estafas / comercios | Claude | 1 | 4 | 4 | **62** | ninguna aún |
| C | Primera Hora (kit contra la extorsión) | Extorsión / transporte | Claude | 1 | 4 | 3 | **56** | ninguna aún |
| D | Verifica el audio (verificador de contenido viral) | Desinformación | Claude | 1 | 3 | 3 | **48** | ninguna aún |

> La tracción está en 1 para todas hasta que lleguen entrevistas o usuarios reales a alguna carpeta. Cada punto de tracción vale +6,
> así que una mañana de entrevistas puede subir una idea de 68 a 80 o más. Es el puntaje más barato que hay.

---

## A. ¿Es Estafa? (recomendada)
**Problema:** a los peruanos les llegan mensajes tipo "hola mamá, cambié de número", textos falsos del banco, links falsos de courier y ahora voces clonadas con IA. Los reportes ligados a Yape y WhatsApp habrían subido cerca de 120% en 2026.
**Producto:** un número de WhatsApp (con **Zavu**). Reenvías cualquier mensaje, link, captura o audio sospechoso y en unos 10 segundos recibes un veredicto en español sencillo: 🟥 estafa / 🟨 sospechoso / 🟩 parece ok, más *qué hacer ahora*.
**Núcleo técnico:** reputación de URLs y antigüedad del dominio, detección de dominios parecidos (bcp-pe.com vs bcp.com.pe), una base comunitaria de reputación de números, un clasificador con LLM ajustado a guiones de estafa peruanos, OCR de capturas y, opcionalmente, una heurística de voz clonada. Un dashboard web muestra tendencias en vivo ("estafas top en Lima esta semana").
**Tracción en 30 h:** compartirlo en los grupos de WhatsApp de nuestras familias y de la universidad, y contar mensajes reenviados reales, usuarios únicos y usuarios que vuelven. Es uso real, que la rúbrica califica con 5.
**Demo:** un jurado manda un mensaje desde su propio celular y recibe la respuesta en vivo en el escenario.
**Latinoamérica:** el mismo flujo sirve para estafas con Pix, Nequi y Mercado Pago.

## B. Yape Real
**Problema:** las apps de "Yape falso" y los comprobantes falsos golpean a los bodegueros, que miran la pantalla del cliente porque están ocupados.
**Producto:** una PWA o app Android que lee las notificaciones de pago *del propio comerciante* y **anuncia en voz alta cada pago confirmado**, con una pantalla verde grande. Un modo "verificar captura" marca los comprobantes editados.
**Núcleo técnico:** lectura de notificaciones, análisis forense de imágenes (tipografías, diseño, metadatos) y un registro de pagos.
**Tracción:** instalarlo en 5 a 10 bodegas cerca del local.
**Riesgo:** necesita leer notificaciones en Android, lo que es más difícil de mostrar desde una URL. Verificar si Yape, BCP o Izipay ya venden un parlante de pagos; si es así, nuestro ángulo es detectar comprobantes falsos y ser gratis.

## C. Primera Hora (kit contra la extorsión para la primera hora)
**Problema:** solo 27 de 83 empresas extorsionadas denunciaron antes de un atentado, por miedo. Las víctimas no saben qué hacer en la primera hora y la evidencia se pierde.
**Producto:** una bóveda privada de evidencia: guardar el chat o audio amenazante con fecha, hash y cifrado. También da una guía paso a paso (111, WhatsApp de la PNP, bloqueo en OSIPTEL, Fiscalía) y un mapa de calor anonimizado de reportes para el gremio de transportistas.
**Riesgo:** represalias y seguridad de los datos. Es más difícil conseguir usuarios en 30 h, y el jurado va a preguntar mucho sobre seguridad.

## D. Verifica el audio
**Problema:** audios y videos virales falsos, incluyendo "alertas policiales" falsas y deepfakes políticos.
**Producto:** reenvías el contenido y se contrasta con verificadores y noticias usando Tavily, más señales de deepfake.
**Riesgo:** las elecciones ya pasaron, así que el dolor es menor ahora, y detectar deepfakes de forma confiable en 30 h es difícil. Podría ser una función dentro de A.

---

## Próximas acciones
| Quién | Qué hace |
|---|---|
| Todos | Suban sus ideas y lo que hayan encontrado a su carpeta (`members/<tu-nombre>/`) |
| Todos | Hablen con 2 personas reales (una bodega, un chofer, sus papás) y suban las notas |
| Claude | Sintetiza cuando se lo pidan, vuelve a puntuar y recomienda |

## Decisión
**Idea elegida:** ____ (decidir después de la primera síntesis que tenga evidencia real)
