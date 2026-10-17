# Síntesis: Track Seguridad

Claude mantiene este archivo. Se reconstruye a partir de `members/*/` cada vez que alguien dice **"sintetiza"**.
Puntaje con la **rúbrica oficial del evento** (CONTEXT §2):
`nota = 0,30×Complejidad + 0,25×Funciona + 0,20×Calidad + 0,15×Problema + 0,10×Claridad` (1–5) **+ extra** (0 / 0,25 / 0,5). Sobre 100 = nota × 20.

**Última síntesis:** 2026-10-17 (ideas semilla de Claude, carpetas todavía vacías)
**Qué cambió:** se re-puntuó todo con la rúbrica oficial presentada en el evento (técnico 75%, producto 25%, tracción como bonus). C sube al 2.º lugar porque su demo corre completa desde una URL; B baja porque su flujo depende de Android.

| # | Idea | Subárea | De | Complej. 30% | Funciona 25% | Calidad 20% | Problema 15% | Claridad 10% | **Nota /5** | **/100** | Extra posible | Evidencia |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | ¿Es Estafa? (bot de WhatsApp + web) | Estafas / suplantación | Claude | 4 | 4 | 4 | 5 | 4 | **4,15** | **83** | +0,5 (fácil) | ninguna aún |
| C | Primera Hora (kit contra la extorsión) | Extorsión / transporte | Claude | 4 | 4 | 4 | 4 | 4 | **4,00** | **80** | +0 a +0,25 (difícil) | ninguna aún |
| B | Yape Real (verificador de pagos para bodegas) | Estafas / comercios | Claude | 4 | 3 | 4 | 5 | 4 | **3,90** | **78** | +0,25 a +0,5 | ninguna aún |
| D | Verifica el audio (verificador de contenido viral) | Desinformación | Claude | 4 | 3 | 4 | 3 | 3 | **3,50** | **70** | +0,25 | ninguna aún |

> Las notas son **proyecciones** de lo que podríamos lograr, no evidencia. "Problema" asume que conseguimos al menos un usuario real del track hoy; si no lo conseguimos, baja a 2 (−0,45).
> Con la rúbrica nueva, el 75% se gana construyendo: integraciones reales, una demo completa desde una URL pública y un repo limpio.

---

## A. ¿Es Estafa? (recomendada)
**Problema:** a los peruanos les llegan mensajes tipo "hola mamá, cambié de número", textos falsos del banco, links falsos de courier y ahora voces clonadas con IA. Los reportes ligados a Yape y WhatsApp habrían subido cerca de 120% en 2026.
**Producto:** un número de WhatsApp (con **Zavu**). Reenvías cualquier mensaje, link, captura o audio sospechoso y en unos 10 segundos recibes un veredicto en español sencillo: 🟥 estafa / 🟨 sospechoso / 🟩 parece ok, más *qué hacer ahora*.
**Núcleo técnico:** reputación de URLs y antigüedad del dominio, detección de dominios parecidos (bcp-pe.com vs bcp.com.pe), una base comunitaria de reputación de números, un clasificador con LLM ajustado a guiones de estafa peruanos, OCR de capturas y, opcionalmente, una heurística de voz clonada. Un dashboard web muestra tendencias en vivo ("estafas top en Lima esta semana").
**Funciona (25%):** además del bot, una **página web pública** donde pegas el mensaje, link o captura y ves el veredicto completo. Así el flujo corre desde la URL en la laptop del jurado; el WhatsApp es el plus en vivo.
**Extra (+0,5):** compartirlo en los grupos de WhatsApp de nuestras familias y de la universidad. Los registros de mensajes reales, usuarios únicos y usuarios que vuelven son exactamente lo que pide "uso repetido".
**Demo:** el jurado pega un mensaje de estafa real en la web; luego alguien lo reenvía al número de WhatsApp en vivo.
**Latinoamérica:** el mismo flujo sirve para estafas con Pix, Nequi y Mercado Pago.

## B. Yape Real
**Problema:** las apps de "Yape falso" y los comprobantes falsos golpean a los bodegueros, que miran la pantalla del cliente porque están ocupados.
**Producto:** una PWA o app Android que lee las notificaciones de pago *del propio comerciante* y **anuncia en voz alta cada pago confirmado**, con una pantalla verde grande. Un modo "verificar captura" marca los comprobantes editados.
**Núcleo técnico:** lectura de notificaciones, análisis forense de imágenes (tipografías, diseño, metadatos) y un registro de pagos.
**Extra:** instalarlo en 5 a 10 bodegas cerca del local.
**Riesgo:** necesita leer notificaciones en Android, así que el flujo completo **no corre desde una URL pública** (baja "Funciona"). Solo el modo "verificar captura" funciona en web. Verificar si Yape, BCP o Izipay ya venden un parlante de pagos; si es así, nuestro ángulo es detectar comprobantes falsos y ser gratis.

## C. Primera Hora (kit contra la extorsión para la primera hora)
**Problema:** solo 27 de 83 empresas extorsionadas denunciaron antes de un atentado, por miedo. Las víctimas no saben qué hacer en la primera hora y la evidencia se pierde.
**Producto:** una bóveda privada de evidencia: guardar el chat o audio amenazante con fecha, hash y cifrado. También da una guía paso a paso (111, WhatsApp de la PNP, bloqueo en OSIPTEL, Fiscalía) y un mapa de calor anonimizado de reportes para el gremio de transportistas.
**A favor con la rúbrica nueva:** todo el flujo (capturar → cifrar → guiar → mapa) corre en una web pública, y tiene arquitectura para lucirse (cifrado, hash, mapa).
**Riesgo:** represalias y seguridad de los datos. El bonus de tracción es difícil (las víctimas no lo van a usar en público en 30 h), y el jurado va a preguntar mucho sobre seguridad.

## D. Verifica el audio
**Problema:** audios y videos virales falsos, incluyendo "alertas policiales" falsas y deepfakes políticos.
**Producto:** reenvías el contenido y se contrasta con verificadores y noticias usando Tavily, más señales de deepfake.
**Riesgo:** las elecciones ya pasaron, así que el dolor es menor ahora, y detectar deepfakes de forma confiable en 30 h es difícil. Podría ser una función dentro de A.

---

## Próximas acciones
| Quién | Qué hace |
|---|---|
| Todos | Suban sus ideas y lo que hayan encontrado a su carpeta (`members/<tu-nombre>/`) |
| Todos | Consigan **al menos un usuario real del track** (una bodega, un chofer, sus papás) y suban las notas: vale 15% |
| Claude | Sintetiza cuando se lo pidan, vuelve a puntuar y recomienda |

## Decisión
**Idea elegida:** ____ (decidir después de la primera síntesis que tenga evidencia real)
