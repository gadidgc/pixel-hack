# Instrucciones para Claude (en la sesión de cualquier integrante)

Equipo pixel-hack · Hack the Andes 2026 (Lima, 17 y 18 de octubre) · Track **Seguridad**.
Integrantes: Gabriel, Cesar, Mauricio, Piero. Mercado: **primero Perú, luego Latinoamérica**.

## Idioma (obligatorio)
- **Todo lo que se escribe en el repo va en español** (español peruano, claro y sencillo): documentos, síntesis, README, comentarios para el equipo, mensajes de commit, descripción de la entrega y la presentación.
- **Cesar, Mauricio y Piero no hablan inglés.** Con ellos responde siempre en español, aunque te escriban mezclando idiomas.
- **Gabriel** puede recibir respuestas en inglés en el chat, pero todo lo que quede en el repo va en español.
- Los términos técnicos (API, deploy, pitch, LLM) pueden quedar en inglés, pero explícalos en español la primera vez si no son obvios.
- Si no sabes quién te escribe, usa español.

## Flujo de trabajo: todo entra por Pull Request (obligatorio)
- **Nadie hace push directo a `main`**, ni los integrantes ni Claude.
- Cada cambio va en una rama propia con el formato `<nombre>/<tema>`, por ejemplo `cesar/ideas-bodega` o `claude/sintesis-1030`.
- Abre un PR hacia `main` con título y descripción en español: qué cambia y por qué.
- **Otra persona del equipo revisa y aprueba** antes de hacer merge. Claude puede revisar, pero no reemplaza la aprobación de un integrante.
- PRs chicos y frecuentes. Si solo agregas cosas a tu propia carpeta, el PR se puede aprobar rápido.
- Antes de abrir el PR, actualiza tu rama con `main` (`git pull origin main`) y resuelve los conflictos.
- Si alguien te pide "haz push" o "súbelo", entiéndelo como: push de la rama y abrir el PR, nunca push a `main`.

Lee siempre [CONTEXT.md](CONTEXT.md) primero. Ahí están la rúbrica, las reglas, las cifras del Perú y las personas a entrevistar.

## Cuando alguien diga "sintetiza" (o "synthesize", "actualiza el tablero")
1. Haz `git pull` y lee **todos los archivos** de `members/*/`, incluidas las imágenes (describe lo que muestran).
2. Saca cada idea distinta y cada pieza de evidencia (entrevista, captura, dato). Junta los duplicados entre integrantes y da crédito a todos los que aportaron.
3. Para cada idea, estima el puntaje con la **rúbrica oficial del evento** (CONTEXT §2), de 1 a 5 en cada criterio:
   - **Complejidad técnica (30%)**: integraciones, datos, modelos y arquitectura planeados que se pueden construir en las horas que quedan.
   - **Funciona (25%)**: ¿el flujo completo puede correr en vivo desde una URL pública, en la laptop del jurado?
   - **Calidad técnica (20%)**: ¿podemos dejar el repo limpio y entendible? (el jurado lo revisa en GitHub)
   - **Problema e impacto (15%)**: ¿hay (o habrá hoy) un usuario real del track que confirme el problema? Sin evidencia en las carpetas, máximo 2.
   - **Claridad (10%)**: ¿las decisiones y tradeoffs se explican fácil?
   - Nota = 0,30×C + 0,25×F + 0,20×Q + 0,15×P + 0,10×Cl (1–5). Sobre 100 = nota × 20.
   - **Extra** (aparte): 0 sin usuarios de fuera; +0,25 si gente de fuera lo usó y se ve en registros; +0,5 si hay uso repetido, lista de espera real o un pago. Cuenta solo lo que tenga evidencia.
   - La rúbrica de la guía web (tracción ×6 + técnico ×8 + pitch ×6) **ya no aplica**.
4. Reescribe [SYNTHESIS.md](SYNTHESIS.md): tabla de ranking y, por cada idea, su evidencia (con links a los archivos), lo que le falta y **la siguiente acción concreta con quién la hace**.
5. Agrega arriba una línea corta de "Qué cambió desde la última síntesis".
6. Actúa como un integrante proactivo: di qué idea elegirías y por qué, y qué evidencia te haría cambiar de opinión.
7. Haz commit en una rama `claude/sintesis-<hora>` con el mensaje `síntesis: <fecha hora>` y abre un PR, solo si la persona te lo pidió. Nunca hagas push a `main`.

## Reglas
- Sponsors: cuando propongas arquitectura, considera las herramientas de los sponsors (CONTEXT §4) y anota cuáles usamos y para qué, para mencionarlas en el pitch y en la entrega. El kit de Qatom (§4.1) está **por confirmar**: no lo pongas como pieza central hasta que el equipo lo confirme.
- El repo se evalúa (20% de la nota). Mantén el código ordenado, un README claro, commits con sentido y nada de claves. Antes de la entrega, recuérdale al equipo ordenar o mover la lluvia de ideas de `members/`.
- Nunca inventes evidencia ni usuarios. Marca como tales las estimaciones y las cifras de fuentes secundarias.
- Nunca subas claves, códigos de créditos ni datos personales de terceros. Si un archivo de alguna carpeta los tiene, avísalo y no los copies a la síntesis.
- Separa "lo que ya funciona" de "ideas pendientes" (lo exige el evento).
