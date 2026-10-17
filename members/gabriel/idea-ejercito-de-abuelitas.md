# Idea loca: "Las Tías", un ejército de abuelitas IA que caza estafadores

Propuesta de Gabriel (17 de octubre de 2026, 13:30), investigada con Claude.
**Es copiar algo que ya funciona en Australia y en el Reino Unido, adaptado al Perú.**

## La idea en una frase
En vez de esperar que la víctima denuncie, **salimos a cazar**. Cientos de abuelitas, bodegueros y mototaxistas peruanos hechos con IA contestan las llamadas y los WhatsApp de los estafadores, les hacen perder el tiempo y **les sacan sus cuentas Yape, números, links y guiones**. Esa inteligencia alimenta un radar público ("¿este Yape está reportado?") y el grafo de bandas de Cupo Cero.

> **Frase de pitch:** *"Cada minuto que un estafador habla con la Tía Rosa es un minuto que no está estafando a tu mamá. Y cada Yape que nos dicta ya no le sirve."*

---

## Ya funciona en otros países

| País | Quién | Qué hace | Resultados (cifras de las propias empresas) |
|---|---|---|---|
| 🇦🇺 Australia | **Apate.ai** (spin-off de Macquarie University) con **Commonwealth Bank** | Lanzó **10 000 bots de voz y 25 500 bots de mensajería** que se hacen pasar por australianos. Sacan números, cuentas bancarias, wallets cripto y webs falsas, y eso entra en tiempo real a la detección de fraude del banco. | 2,5 millones de conversaciones con estafadores. 600 000 llamadas para la telco TPG en 6 semanas. |
| 🇬🇧 Reino Unido | **O2 (Virgin Media O2)**: "Daisy", la abuelita IA | Una abuela IA que habla de su gato y de tejer para retener al estafador. Su número se "sembró" en las listas de los estafadores. | Más de 1000 estafadores retenidos, llamadas de hasta 40–50 minutos y casi nadie notó que era IA. Descubrió que los estafadores usan **los mismos guiones**, señal de que son call centers organizados. |
| 🇧🇷 Brasil | Gobierno: **Celular Seguro** | Un botón para bloquear el celular robado, la línea y las apps de banco desde otro dispositivo. | 3,8 millones de usuarios y unas 99 000 alertas de bloqueo en 2025. (Lo dejo como **idea secundaria**; ver abajo.) |
| 🇸🇬 Singapur | **ScamShield** (GovTech) y el Anti-Scam Centre con 5 bancos | Bloquea llamadas, SMS y links de estafa en tiempo real; los bancos congelan cuentas en conjunto. | 600 estafas frenadas y S$38 millones salvados en 2 meses (2026). |
| 🇯🇵 Japón | Bancos Shinkin y NTT East | Una IA en la cámara del cajero detecta a un adulto mayor hablando por celular mientras transfiere (señal de estafa "ore ore") y alerta al personal. | Pilotos en 2025. Osaka prohibió hablar por celular en el cajero a los mayores de 65. |
| 🇲🇽 México | **No + XT** (Consejo Ciudadano CDMX) | Base de 256 000 números de extorsionadores y bloqueo de unos 190 000. | Dicen que el 96% de los intentos fracasa (cifra propia, no independiente). |

**En el Perú no existe nada como Apate o Daisy.** Esa es la oportunidad.

---

## Cómo sería en 20 horas

```
Estafador ──llama o escribe──▶ Número de "La Tía" (Zavu: voz + WhatsApp)
                                    │
                        Agente de voz con personalidad peruana
                        (ElevenLabs Conversational AI + LLM)
                        "Ay hijito, ¿del BCP me dices? Espérame que busco mis lentes…"
                                    │
                 Extracción en vivo: Yape / Plin / CCI, número, link, banco que imita, guion
                                    │
               ┌────────────────────┼─────────────────────┐
               ▼                    ▼                     ▼
      Radar público          Grafo de bandas         Contador en vivo
  "¿Este Yape/número     (mismo guion o misma     "minutos robados a
   está reportado?"       cuenta = misma banda)    estafadores hoy"
```

### Personajes (las "Tías")
- **Tía Rosa**, 74 años, de Lince: no encuentra sus lentes, confunde el BCP con el Interbank y le cuenta al estafador de su nieto que estudia en la UNI.
- **Don Teodoro**, bodeguero de SJL: "¿Cuánto era? Espérate que estoy atendiendo…"
- **Kevin**, mototaxista: siempre está "en ruta" y la señal se le corta.

### La demo (3 minutos, en vivo desde la URL)
1. El jurado abre la web y **hace de estafador** contra la Tía Rosa: llama desde el navegador y finge ser del BCP.
2. En pantalla se ve en vivo la transcripción, el "Yape" y el banco que va soltando, y el contador de minutos.
3. Cuelga. El Yape aparece en el radar como "reportado" y se une a la banda que usa el mismo guion.
4. Cierre: la cifra de estafadores reales que atendieron las Tías durante el hackathon (si logramos sembrar los números).

### Cómo conseguimos estafadores reales (siembra)
- Todos en el Perú recibimos SMS y WhatsApp de estafa. **Responderles con el número de la Tía** ("llámame a este número, hijito").
- Que nuestras familias y otros participantes reenvíen sus mensajes de estafa a un número del equipo, para sembrar más.
- **Nunca** usarla contra extorsionadores de una víctima real (regla de Cesar: riesgo de represalia y figura de agente encubierto).

---

## Puntaje estimado (proyección, sin evidencia todavía)

| Criterio | Nota | Por qué |
|---|---|---|
| Complejidad (30%) | **5** | Agente de voz en tiempo real, telefonía, extracción con LLM, grafo y radar. "Servicios orquestados y arquitectura no trivial." |
| Funciona (25%) | **4** | El jurado la prueba en vivo, en su propio guion. Es 5 si entran llamadas de estafadores reales. |
| Calidad (20%) | 4 | |
| Problema (15%) | 3 → 4 | Las estafas son masivas en el Perú; falta una víctima entrevistada (por ejemplo, la mamá de alguien). |
| Claridad (10%) | 4 | Tradeoffs claros: "no detectamos al estafador, lo hacemos perder tiempo y le quitamos sus cuentas". |
| **Nota** | **4,15 → 4,3 (83 → 86)** | |
| Extra | +0,25 a +0,5 | Es divertido y viral: gente de fuera llamando a la Tía o reenviando estafas queda en los registros. |

**Comparada con la fusión ⭐:** la Tía puede ser **el sensor que alimenta a Cupo Cero**. La fusión recibe denuncias de forma pasiva; la Tía sale a buscar los datos. Juntas suman la mejor demo del track.

---

## Riesgos (honestos)
1. **Números peruanos en Zavu:** no sabemos si dan números +51 para voz el mismo día. Plan B: número extranjero o WhatsApp, más la llamada desde la web para la demo.
2. **Costo y latencia de la voz:** usar los créditos de ElevenLabs; la conversación tiene que responder en menos de un segundo.
3. **Legal:** grabar y transcribir llamadas de terceros. Verificar la norma peruana sobre grabación de comunicaciones antes del pitch. Guardar solo los datos extraídos (cuentas, números, guion), no el audio.
4. **Cuentas mula:** el Yape que dicta el estafador puede ser de una víctima a la que reclutaron o le robaron la cuenta. El radar dice "reportado N veces", **nunca** publica nombres (línea roja de Cesar).
5. **No contactar:** la Tía solo **contesta**; nunca llama a nadie por iniciativa propia, porque el número reportado podría ser de un inocente.

## Idea secundaria: "Celular Seguro Perú" (copia de Brasil)
Un botón desde otro dispositivo para cuando te roban el celular: bloquear la línea (Osiptel), avisar a Yape y a los bancos, y alertar a tus contactos ("si te piden plata desde mi número, no soy yo"). Es fuerte para el problema, pero en 20 horas **no tenemos integración real con bancos ni operadores**, así que la demo sería simulada (Funciona 3). Va al roadmap.

## Fuentes
- Apate.ai y CommBank: [BankInfoSecurity](https://www.bankinfosecurity.com/australia-banks-deploy-army-ai-bots-to-scam-scammers-a-29435) · [The Digital Banker](https://thedigitalbanker.com/?p=54267) · [Cointelegraph](https://cointelegraph.com/magazine/fake-ai-victims-are-scam-baiting-600000-fraudsters-every-month) · [SC World](https://www.scworld.com/brief/australian-startup-apate-uses-ai-agents-to-bait-scammers)
- Daisy (O2): [Marketing Week](https://www.marketingweek.com/o2-ai-granny-scammers-public/) · [ISPreview](https://www.ispreview.co.uk/index.php/2025/01/o2-uk-reveals-first-insights-from-ai-granny-created-to-waste-scammers-time.html) · [TechCrunch](https://techcrunch.com/2024/11/15/ai-granny-scambaiter-wastes-telephone-fraudsters-time-with-boring-chat)
- Celular Seguro: [SBT News](https://sbtnews.sbt.com.br/noticia/brasil/aplicativo-celular-seguro-ja-conta-com-mais-de-1-milhao-de-cadastros) · [MinhaOperadora](https://www.minhaoperadora.com.br/2026/02/bloqueios-no-celular-seguro-sobem-39-no-carnaval-2026.html) · [Jornal de Brasília](https://jornaldebrasilia.com.br/noticias/brasil/celular-seguro-reforca-protecao-contra-roubos-no-carnaval/)
- Singapur: [Policía de Singapur](https://www.police.gov.sg/Media-Hub/News/2026/07/20260707_anti_scam_centre_and_five_banks_collaborate_to_foil_over_600_scam_attempts) · [GovTech ScamShield](https://www.tech.gov.sg/products-and-services/for-citizens/scam-prevention/)
- Japón: [Malay Mail: Osaka](https://www.malaymail.com/news/world/2025/04/25/no-phone-calls-at-the-atm-osaka-tells-over-65s-in-bid-to-stop-scams/174484) · [Tottori Shinkin](https://www.shinkin.co.jp/torishin/news/oshirase/pdf/20250213.pdf)
- México No + XT: [Expansión](https://expansion.mx/tecnologia/2023/03/31/la-cdmx-tiene-su-propia-app-para-que-no-seas-victima-de-extorsiones) · [Quadratín](https://mexico.quadratin.com.mx/cuestion-de-confianza-salvador-guerrero-chipres-126/)
