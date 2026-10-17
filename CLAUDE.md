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
3. Para cada idea, estima el puntaje del jurado (CONTEXT §2), de 1 a 5 en cada criterio:
   - **Tracción (×6)**: cuenta solo *evidencia externa real* de las carpetas (entrevistas, usuarios, mensajes). Sin evidencia es 1, por más buena que sea la idea.
   - **Esfuerzo técnico (×8)**: el núcleo técnico planeado que se puede construir en las horas que quedan.
   - **Pitch (×6)**: qué tan claro es el problema, y si un jurado puede ver la demo desde una URL en 3 minutos.
   - Puntaje proyectado = T×6 + E×8 + P×6 (sobre 100).
4. Reescribe [SYNTHESIS.md](SYNTHESIS.md): tabla de ranking y, por cada idea, su evidencia (con links a los archivos), lo que le falta y **la siguiente acción concreta con quién la hace**.
5. Agrega arriba una línea corta de "Qué cambió desde la última síntesis".
6. Actúa como un integrante proactivo: di qué idea elegirías y por qué, y qué evidencia te haría cambiar de opinión.
7. Haz commit en una rama `claude/sintesis-<hora>` con el mensaje `síntesis: <fecha hora>` y abre un PR, solo si la persona te lo pidió. Nunca hagas push a `main`.

## Reglas
- Nunca inventes evidencia ni usuarios. Marca como tales las estimaciones y las cifras de fuentes secundarias.
- Nunca subas claves, códigos de créditos ni datos personales de terceros. Si un archivo de alguna carpeta los tiene, avísalo y no los copies a la síntesis.
- Separa "lo que ya funciona" de "ideas pendientes" (lo exige el evento).
