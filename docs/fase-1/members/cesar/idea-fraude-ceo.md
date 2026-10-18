# Idea: Escudo contra el fraude del CEO y los deepfakes corporativos

Propuesta de Cesar (17 de octubre de 2026). Notas a medio pensar, con una primera evaluación hecha con Claude.

## La idea

Cuando el área de finanzas recibe una orden de pago urgente por correo, llamada o videollamada, el sistema la intercepta y la verifica:

- Revisa si el correo viene de un dominio parecido al real o si falla SPF/DKIM (las firmas que prueban que el correo sale de verdad del dominio que dice).
- Revisa si el audio tiene señales de voz sintética.
- Pide confirmación al ejecutivo real por un canal independiente que ya esté registrado.

**Demo:** clonamos (con permiso) la voz de un compañero que hace de "gerente", pedimos una transferencia urgente y el sistema la bloquea en vivo.

## Por qué puede funcionar

- **Complejidad técnica alta:** análisis de cabeceras del correo, detección de dominios parecidos, análisis de audio y verificación por un segundo canal.
- **Sponsors:** Zavu (llamada o WhatsApp de confirmación al gerente real), ElevenLabs (voz clonada para la demo, con consentimiento) y n8n (flujo bloquear → avisar → escalar).
- **Track:** suplantación con deepfakes, una de las cinco subáreas.
- **Demo muy memorable.**

## Riesgos

1. **Detectar voz sintética no es confiable.** Los detectores públicos fallan con las voces nuevas y en 20 horas no entrenamos un modelo propio.
   - Decisión propuesta: la defensa principal es la **política**. Toda orden de pago urgente se congela hasta que el ejecutivo real confirme por su canal registrado. El detector es solo una señal más del puntaje de riesgo.
   - Tradeoff para el pitch: "no confiamos en detectar el deepfake, confiamos en verificar a la persona".
2. **Interceptar correos, llamadas y videollamadas no corre desde una URL pública.** Alcance propuesto para la demo:
   - Una web donde se pega o sube un correo (`.eml`) y se ve el análisis.
   - Un número de Zavu al que llama el "gerente": se graba, se analiza y se dispara la confirmación por WhatsApp.
   - Un panel de tesorería con la orden congelada y luego aprobada o bloqueada.
   - Las videollamadas quedan como idea pendiente.
3. **No hay evidencia todavía de que pase en el Perú.** Las cifras del [CONTEXT](../../CONTEXT.md) hablan de extorsión, Yape y "hola mamá", no de fraude del CEO. Sin un usuario real, "Problema e impacto" queda en máximo 2.
4. **El bonus de tracción es difícil** porque es una herramienta para empresas. Lo más barato sería un verificador público de correos ("¿este correo es falso?") que prueben otros participantes, con registros de uso.

## Puntaje estimado (estimación, todavía sin evidencia)

| Criterio | Hoy | Con entrevista y alcance acotado |
|---|---|---|
| Complejidad (30%) | 4,5 | 4,5 |
| Funciona (25%) | 3 | 4 |
| Calidad (20%) | 4 | 4 |
| Problema (15%) | 2 | 4 |
| Claridad (10%) | 4 | 4,5 |
| **Nota** | **3,6 (72/100)** | **4,2 (84/100)** |

## Siguientes pasos

- [ ] Entrevistar hoy a un contador, tesorero o dueño de una mype: ¿le llegó alguna vez un correo o un audio falso del "jefe" pidiendo plata?
- [ ] Diseñar el motor genérico (pedido urgente de plata → verificar por otro canal), para que también sirva contra "hola mamá, cambié de número", que sí tiene evidencia en el Perú.
- [ ] Probar un detector de voz sintética con audios de ElevenLabs para saber cuánto confiar en él.

**Qué nos haría cambiar de opinión:** que alguien de finanzas nos diga "eso no pasa acá", o que otra idea del equipo ya tenga un usuario real entrevistado.
