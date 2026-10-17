# Banco de ideas: lo que ya funciona en otros países, adaptado al Perú

Propuesta de Gabriel (17 de octubre de 2026, ~13:45), investigada con Claude.
Complementa [Las Tías](idea-ejercito-de-abuelitas.md). Ya hay ideas parecidas en otras carpetas, así que **no las repito**:
- Celular Seguro de Brasil → ya lo cubre [NEXUS Rescate](../piero/nexus-rescate.md) de Piero.
- Red anti-cuentas mula de Singapur → ya está en el banco de [Cupo Cero](../cesar/cupo-cero-ideas.md) de Cesar.

**Filtro de la rúbrica:** cada idea tiene que poder mostrarse **en vivo desde una URL pública**, porque "Funciona" vale 25%.

---

## 1. 🛡️ "Ángel de la llamada": la IA escucha la llamada y grita "¡ES ESTAFA!" (copia de Corea del Sur)

**Qué hacen en Corea:** SK Telecom y LG U+ analizan la llamada **mientras ocurre**. Si detectan palabras y patrones de estafa, el celular muestra una alerta, suena y vibra **en medio de la llamada**. Desde abril de 2026, SKT además avisa a hasta 10 familiares registrados ("Family Care"). LG U+ entrenó su detector con más de 3000 horas de voz. Corea perdió unos US$ 600 millones por estafas de voz en 2024.

**Adaptado al Perú:**
- Una web que se abre en el celular o en la laptop. La mamá pone la llamada **en altavoz** y la web escucha con el micrófono del navegador.
- La IA transcribe en vivo en español peruano y detecta las señales: "soy del BCP", "dame el código que te llegó", "yapéame urgente", "tu hijo está detenido", "no le cuentes a nadie".
- La pantalla se pone **roja** y suena: "Cuelga. Ningún banco te pide el código."
- Le llega un **WhatsApp al hijo** (con Zavu): "Tu mamá está en una posible llamada de estafa ahora."
- **Palabra clave familiar** (lo que recomiendan la Policía de España e INCIBE): la web le sugiere preguntar "¿cuál es nuestra palabra?" si dicen ser un familiar.

**Por qué es loca:** nadie en el Perú protege a la víctima **durante** la llamada. Todo lo que existe actúa antes (campañas) o después (denuncias).
**Demo:** el jurado llama a la laptop haciéndose pasar por el BCP y la pantalla se pone roja en vivo. Funciona desde la URL ✔.
**Puntaje estimado:** Complejidad 5 · Funciona 4 · Calidad 4 · Problema 3 · Claridad 4 → **4,15 (83)**. Extra fácil: los papás de todos lo usan.
**Riesgos:** la latencia de la transcripción en vivo; los falsos positivos ("es una alerta, no una prueba"); y el audio, que se procesa y no se guarda.

> **Combo loco: "Atacamos y defendemos".** Las Tías **atacan** (les hacen perder el tiempo a los estafadores y les sacan sus Yapes) y el Ángel **defiende** (protege a la mamá durante la llamada). Ambos alimentan el mismo radar de números y cuentas. Es la historia más fuerte para el pitch.

---

## 2. 💬 "Cofacts peruano": cadenas virales verificadas por la comunidad (copia de Taiwán)

**Qué hacen en Taiwán:** Cofacts es un bot de LINE (el WhatsApp de allá) open source. La gente reenvía la cadena sospechosa, un equipo de voluntarios la verifica, y el bot **responde solo** las cadenas repetidas. En 3 meses de 2018 recibió 46 000 mensajes y contestó automáticamente 35 180. Llegó a tener 400 editores voluntarios y su base de datos es pública.

**Adaptado al Perú:**
- Bot de WhatsApp (Zavu) más una web. Recibe la cadena ("nueva modalidad de extorsión en SJL", "Yape fue hackeado, retira tu plata") y busca en verificadores peruanos (Verificador de La República, Ojo Biónico, Comprueba, Convoca) con Tavily.
- Agrupa los mensajes parecidos con embeddings: si 50 personas mandan la misma cadena, se verifica una vez y se responde a todas.
- Voluntarios universitarios responden lo nuevo desde un panel.

**Por qué sirve:** es el camino más corto al **extra +0,5**, porque las cadenas abundan y la gente las reenvía sola. Mejora la idea "¿Es cadena?" de Cesar.
**Puntaje estimado:** Complejidad 4 · Funciona 4 · Calidad 4 · Problema 3 · Claridad 4 → **3,85 (77)**.
**Riesgo:** la desinformación bajó después de las elecciones, y "verificar" con fuentes requiere cuidado para no inventar veredictos.

---

## 3. ✅ "Confirma antes de yapear" (copia de Confirmation of Payee, Reino Unido)

**Qué hacen en el Reino Unido:** antes de cada transferencia, el banco verifica si el nombre que escribiste coincide con el titular de la cuenta. Hacen más de 70 millones de verificaciones al mes (2025). UK Finance reporta 59% menos pagos a cuentas equivocadas y entre 20% y 40% menos pérdidas en algunos tipos de fraude (cifras de la industria).

**Adaptado al Perú:**
- Antes de pagar un adelanto en Marketplace o un "préstamo", la persona pega el número de Yape, la cuenta o el CCI y recibe: banco (por el código del CCI), si fue **reportado** y cuántas veces, en qué modalidades, y si el número es VoIP o extranjero.
- **API por llamada en Qatom**: Marketplace, apps de delivery o fintechs consultan antes de liberar un pago. Eso da un modelo de negocio y un posible "pago" para el extra.
- Es la puerta pública de la fusión ⭐ (Cupo Cero + ¿Es Estafa?) con un nombre que la gente entiende.

**Puntaje estimado:** Complejidad 4 · Funciona 4 · Calidad 4 · Problema 3 · Claridad 4 → **3,85 (77)**. Sube mucho si se une con Las Tías, porque los Yapes que ellas cazan llenan la base desde el día 1.
**Riesgo:** el titular de una cuenta mula puede ser víctima. Nunca mostrar nombres, solo "reportado N veces".

---

## 4. 🔊 "Parlante virtual" para bodegas (copia del Paytm Soundbox, India)

**Qué hacen en India:** desde 2019, Paytm vende un parlante que **anuncia en voz alta cada pago recibido**, y todas las fintechs lo copiaron. Acaba con la estafa del "comprobante falso", porque si el parlante no habla, no te pagaron.
**Adaptado al Perú:** un parlante Yape para la bodega.
**Por qué lo dejo bajo:** no tenemos acceso a las notificaciones de pago de Yape desde una web, así que no corre desde una URL (Funciona 2–3). Además habría que verificar si Yape, Izipay o Niubiz ya venden uno. **Va al roadmap.**

---

## 5. ⏸️ "Pausa familiar" para adultos mayores (Japón e India)

**Qué hacen afuera:**
- Japón: limitar las transferencias de los mayores de 75 años (propuesta de la Policía), y Osaka prohibió hablar por celular en el cajero a los mayores de 65.
- India: el Banco Central propuso una espera de 1 hora para transferencias grandes y un "botón de apagado" que controla el cliente.

**Adaptado al Perú:** antes de un pago grande o raro, se le pide aprobación a un familiar de confianza.
**Por qué lo dejo bajo:** sin integración con bancos o Yape, la demo sería simulada (Funciona 3). **Va al roadmap**, o como una función del Ángel de la llamada ("¿quieres que tu hijo apruebe este pago?").

---

## Descartadas (con evidencia)
- **Pasaje sin efectivo en buses contra la extorsión** (Guatemala, Honduras): la evidencia de que funcione es débil y antigua (2007–2017). Los extorsionadores pasaron a cobrar en las oficinas de las empresas, y en El Salvador las empresas metieron el cupo en su contabilidad. No resuelve el problema.

---

## Ranking del banco

| Idea | Origen | Nota estimada | Funciona desde URL | Extra |
|---|---|---|---|---|
| **Las Tías + Ángel de la llamada ("Atacamos y defendemos")** | 🇦🇺🇬🇧 + 🇰🇷 | **≈ 4,3 (86)** | ✔ | +0,5 |
| Las Tías (sola) | 🇦🇺🇬🇧 | 4,15 (83) | ✔ | +0,25 a +0,5 |
| Ángel de la llamada (solo) | 🇰🇷 | 4,15 (83) | ✔ | +0,5 |
| Cofacts peruano | 🇹🇼 | 3,85 (77) | ✔ | +0,5 |
| Confirma antes de yapear | 🇬🇧 | 3,85 (77) | ✔ | +0,25 a +0,5 |
| Parlante virtual | 🇮🇳 | ~3 (60) | ✘ | — |
| Pausa familiar | 🇯🇵🇮🇳 | ~3,2 (64) | simulada | — |

> Todas son **proyecciones sin evidencia**. Con un usuario real entrevistado, "Problema" sube a 4 y cada idea gana unos +3 puntos.

## Fuentes
- Corea: [OECD AI: detección en tiempo real](https://oecd.ai/en/incidents/2026-02-12-079d) · [OECD AI: SKT Family Care](https://oecd.ai/en/incidents/2026-04-27-f686) · [GSMA: caso de estudio](https://www.gsma.com/solutions-and-impact/technologies/security/scams/gsma_study/real-time-on-device-vishing-detection-anti-deepvoice-protection/) · [FN News](https://en.fnnews.com/news/202512011003132108) · [Asia Economy](https://view.asiae.co.kr/en/article/2026021215253365891)
- Taiwán: [IJNet](https://ijnet.org/en/story/taiwanese-cofacts-fact-checks-information-line) · [Nieman Lab](https://www.niemanlab.org/2018/08/line-is-another-chat-app-rife-with-spam-scams-and-bad-information-the-volunteer-supported-cofacts-is-fact-checking-them-in-the-open/) · [Taiwan Insight](https://taiwaninsight.org/2023/03/31/three-musketeers-against-mis-disinformation-assessing-citizen-led-fact-checking-practices-in-taiwan/)
- Reino Unido: [Pay.UK](https://www.wearepay.uk/confirmation-of-payee-reaches-two-billion-checks-helping-protect-uk-consumers-against-fraud/) · [PSR](https://www.psr.org.uk/news-and-updates/latest-news/news/fraud-prevention-is-key-during-international-fraud-awareness-week/) · [Osborne Clarke](https://osborneclarke.com/insights/confirmation-payee-valuable-international-tool-fight-against-fraud)
- India: [WARC: soundboxes](https://www.warc.com/content/feed/sound-boxes-solve-a-digital-payment-pain-point/en-GB/8039) · [Crowdfund Insider: Paytm](https://www.crowdfundinsider.com/2022/01/185176-indian-payments-fintech-paytm-explains-how-merchants-may-verify-payment-receipts-with-their-soundbox-and-business-app/) · [Razorpay](https://razorpay.com/learn/fake-payment-screenshot-scam/)
- Japón: [Malay Mail: Osaka](https://www.malaymail.com/news/world/2025/04/25/no-phone-calls-at-the-atm-osaka-tells-over-65s-in-bid-to-stop-scams/174484) · [Yahoo: límites para mayores](https://www.yahoo.com/news/japan-limit-cash-withdrawals-bank-055803189.html)
- Centroamérica (descartada): [InSight Crime: Guatemala](https://insightcrime.org/news/brief/guatemala-citizens-fight-back-against-expanding-extortion-tactics/) · [InSight Crime: explicador sobre extorsión](https://insightcrime.org/investigations/extortion-explainer-from-a-cora-to-rent/) · [InSight Crime: Honduras](https://insightcrime.org/news/briefs/honduras-launches-offensive-against-gang-extortion-of-bus-drivers)
