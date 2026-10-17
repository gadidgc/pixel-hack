# Síntesis: Track Seguridad

Claude mantiene este archivo. Se reconstruye a partir de `members/*/` cada vez que alguien dice **"sintetiza"**.
Puntaje con la **rúbrica oficial** (CONTEXT §2):
`nota = 0,30×Complejidad + 0,25×Funciona + 0,20×Calidad + 0,15×Problema + 0,10×Claridad` (1–5) **+ extra** (0 / 0,25 / 0,5). Sobre 100 = nota × 20.
**Desempate:** gana la mayor Complejidad y luego la mayor nota en Funciona.

**Última síntesis:** sábado 17, 13:05 (hora de Lima)
**⏰ Entrega:** domingo 18, **09:00**. Quedan unas **20 horas**. Sin URL pública, demo en vivo y repo, el equipo **no se puntúa**.

**Qué cambió desde la última síntesis:**
- Cesar subió **Cupo Cero** (la propuesta más trabajada del equipo), el **Escudo contra el fraude del CEO** y la hoja oficial de la rúbrica.
- Piero subió **Nexus Trust**.
- Mauricio y Gabriel todavía no subieron nada.
- Con la hoja oficial, "Funciona" con datos de juguete vale **3**. Para llegar a 5 hacen falta **datos reales**.

---

## Ranking

Todas las notas son **proyecciones**, no evidencia. **Nadie tiene todavía un usuario real entrevistado**, así que "Problema" queda en **2** para todas (regla de CLAUDE.md).

| # | Idea | De | Complej. 30% | Funciona 25% | Calidad 20% | Problema 15% | Claridad 10% | **Hoy /100** | **Con usuario real y alcance recortado** | Extra posible |
|---|---|---|---|---|---|---|---|---|---|---|
| ⭐ | **Cupo Cero + "¿Es Estafa?" (fusión propuesta)** | Cesar + Claude + Piero | 5 | 4 | 4 | 2 | 5 | **82** | **88** (4,4) | +0,25 a +0,5 |
| 1 | Cupo Cero (extorsión: bot + grafo de bandas + paquete legal) | Cesar | 5 | 3 | 4 | 2 | 5 | **77** | **88** (4,4) | 0 a +0,25 |
| 2 | ¿Es Estafa? (bot + web que da un veredicto) | Claude | 4 | 4 | 4 | 2 | 4 | **74** | **80** (4,0) | **+0,5** (el más fácil) |
| 3 | Escudo contra el fraude del CEO y los deepfakes | Cesar | 4,5 | 3 | 4 | 2 | 4 | **72** | **84** (4,2) | 0 |
| 4 | "¿Es cadena?" / Verifica el audio (desinformación) | Claude + Cesar (#12) | 3 | 4 | 4 | 2 | 4 | **68** | 74 | +0,25 |
| 5 | Verificador de vouchers Yape/Plin | Claude + Cesar (#9) | 3 | 3 | 4 | 2 | 4 | **63** | 69 | +0,25 |
| 6 | Nexus Trust (plataforma amplia + app Android) | Piero | 4 | 2 | 3 | 2 | 3 | **58** | 68 (solo web) | +0,25 |

"Primera Hora" (bóveda de evidencia contra la extorsión) ya está **contenida dentro de Cupo Cero**, así que sale del ranking.

---

## ⭐ Recomendación de Claude: fusionar en una sola plataforma

Las tres propuestas fuertes (Cupo Cero, ¿Es Estafa? y Nexus Trust) tienen **el mismo núcleo**: los ciudadanos mandan evidencia, se extraen números, cuentas Yape/Plin y links, eso alimenta **un grafo**, y sale **un puntaje de riesgo**. Conviene construir ese núcleo una sola vez con dos puertas:

| Puerta | Quién la usa | Qué hace | Para qué sirve en la rúbrica |
|---|---|---|---|
| **"¿Esto es estafa?" / "¿Este Yape tiene reportes?"** (web pública + WhatsApp) | Cualquier persona | Pega un mensaje, número, cuenta o link y recibe un veredicto y qué hacer (es la idea 11 del banco de Cesar) | **Funciona** con datos reales; **extra +0,5** con gente de fuera que lo usa varias veces, visible en registros |
| **Expediente Cupo Cero** | Víctima de extorsión | Sube la amenaza; se genera un PDF con hash, cronología, riesgo y tipificación sugerida | **Problema** fuerte (1 condena cada 76 denuncias) |
| **Panel de bandas** | Autoridad (demo) | Grafo de casos vinculados, ficha de banda y "paquete legal" | **Complejidad 5** y el "wow" de la demo |

**Por qué gana:** tiene la Complejidad más alta (es lo que decide un empate), las líneas rojas legales de Cesar dan una Claridad de 5, y la puerta pública resuelve los dos puntos débiles de Cupo Cero: los datos de juguete y el bonus de tracción.

### Recorte obligatorio (quedan 20 horas)
- **Entra:**
  - Ingreso por web (y WhatsApp con Zavu si da el tiempo).
  - Extracción con LLM a JSON.
  - Chequeos reales: formato del número, banco por CCI, reputación del link.
  - Puntaje de riesgo.
  - PDF con SHA-256.
  - Grafo con unos 300 casos sintéticos más los reportes reales que lleguen, con detección de comunidades.
  - Panel con mapa de datos reales del SIDPOL.
  - Paquete legal con plantillas.
- **Queda en el roadmap (una diapositiva):**
  - "Doña Rosa", embeddings de voz y detección de deepfakes.
  - Nexus Guard para Android, el escudo contra el fraude del CEO y la red anti-cuentas mula.
- **Qué me haría cambiar de opinión:**
  - Que un chofer o bodeguero diga "yo nunca usaría algo así para denunciar" (el miedo pesa más). En ese caso pasaría a ¿Es Estafa? como producto principal.
  - Que a las 18:00 todavía no corra el ingreso desde la URL. En ese caso hay que recortar el grafo.

---

## Detalle por idea

### 1. Cupo Cero ([cupo-cero-ideas.md](members/cesar/cupo-cero-ideas.md), Cesar)
- **Evidencia:** solo fuentes secundarias, eso sí muy completas. La más fuerte: 53 958 denuncias contra 708 condenas (RPP), y 56 de 83 empresas que no denunciaron antes de un atentado. Además: marco legal de 2026 (Ley 32209, DL 1708, DL 1731), líneas rojas, plan por horas y datos para la demo (SIDPOL, 300 casos sintéticos).
- **Lo que falta:**
  - Un usuario real.
  - Confirmar los números de las normas en El Peruano o el SPIJ antes de ponerlos en una diapositiva (el mismo Cesar lo marca).
  - El esquema JSON de extracción y la fórmula del puntaje de riesgo (pendiente en su §5.5).
- **Riesgo:** el alcance es enorme para 20 horas, y con casos solo sintéticos "Funciona" queda en 3.

### 2. ¿Es Estafa? (Claude, ver la versión anterior en el historial)
- **Evidencia:** fuentes secundarias (Yape, "hola mamá", +120% de reportes, según un especialista).
- **Fortaleza:** funciona con datos reales desde el primer día, y es el camino más barato al +0,5.
- **Debilidad:** sola, su Complejidad es menor que la de Cupo Cero.

### 3. Escudo contra el fraude del CEO ([idea-fraude-ceo.md](members/cesar/idea-fraude-ceo.md), Cesar)
- **Fortaleza:** la demo más memorable (voz clonada del "gerente" bloqueada en vivo). Además, Cesar ya resolvió bien el tradeoff: "verificar a la persona, no detectar el deepfake".
- **Lo que falta:** evidencia de que esto pasa en el Perú. Las cifras del CONTEXT no lo respaldan. Sin un contador o tesorero entrevistado, Problema = 2.
- **Riesgo:** la tracción es casi imposible porque es una herramienta para empresas. Mejor como módulo del roadmap.

### 4. "¿Es cadena?" / Verifica el audio
- Deriva a verificadores peruanos (Verificador LR, Ojo Biónico, Comprueba, Convoca) en lugar de inventar veredictos. Es una buena **función dentro de la puerta pública**, no un producto aparte.

### 5. Verificador de vouchers
- Cesar lo dice con honestidad: es solo un "detector de alerta", porque la única prueba real es el movimiento en la cuenta propia. Complejidad baja. Va al roadmap.

### 6. Nexus Trust ([conversacion_nexus_trust.md](members/piero/conversacion_nexus_trust.md), Piero)
- **Fortalezas:**
  - Visión amplia y buenos principios (evaluación explicable, reportes moderados, sin acusaciones).
  - El stack propuesto (FastAPI + PostgreSQL + Cytoscape + Leaflet) **sirve tal cual para la fusión**.
  - El caso de Marketplace ("¿pago el adelanto de esta laptop?") es un buen ejemplo para la puerta pública.
- **Riesgo:** la app Android (Nexus Guard) y los ocho módulos no caben en 20 horas, y no corren desde una URL. Sin la app, Funciona = 2.

---

## Próximas acciones

| Quién | Qué hace | Para cuándo |
|---|---|---|
| **Todos** | Decidir: ¿vamos con la fusión? Si sí, **dejar de idear y empezar a codear** | Ya (antes de las 14:00) |
| **Todos (1 c/u)** | Hablar con **1 usuario real**: un chofer o cobrador de combi, un bodeguero, alguien a quien le pidieron un "cupo" o le llegó un "hola mamá". Anotar citas textuales con consentimiento y subirlas a su carpeta | Hoy antes de las 18:00 (cada entrevista sube "Problema" de 2 a 4) |
| **Cesar** (propuesta) | Esquema JSON de extracción, fórmula del riesgo, plantillas del paquete legal, verificación de las normas | Hoy |
| **Piero** (propuesta) | Backend FastAPI + PostgreSQL, motor de grafo (NetworkX + Louvain) y generador de casos sintéticos | Hoy |
| **Mauricio** (propuesta) | Web pública (puerta "¿Esto es estafa?" + panel con mapa y grafo) y deploy desde temprano | URL viva antes de las 18:00 |
| **Gabriel** (propuesta) | WhatsApp con Zavu, registros de uso para el extra, repartir la puerta pública en grupos, pitch y descripción | Hoy y mañana temprano |
| **Claude** | Armar el esqueleto del repo, revisar PRs, re-sintetizar cuando lleguen las entrevistas | Cuando lo pidan |

> Los roles son una **propuesta** según lo que cada uno ya escribió. Ajústenlos entre ustedes.

## Decisión
**Idea elegida:** ____ (la recomendación es la fusión ⭐; falta que el equipo confirme)
