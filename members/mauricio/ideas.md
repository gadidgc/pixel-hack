# Ideas de Mauricio · Track 04: Seguridad

---

## 1. NexoRoto AI (Inteligencia de Grafos contra Extorsión)

> **Enfoque clave:** Diseñado para atacar directamente el Track 04 (Extorsión a comercios y transportistas), garantizar el 75% técnico y asegurar el bonus de tracción (+0.5).

### A. La problemática que resuelve
* **El dolor:** La extorsión sistemática a comercios (bodegas) y transportistas (choferes y líneas de combis/buses) mediante el uso de **"mulas digitales"**.
* **La barrera:** Las víctimas no denuncian ante la policía por miedo a represalias directas y desconfianza.
* **El mecanismo criminal:** Los extorsionadores ocultan el rastro del dinero usando cuentas de Yape/Plin y números telefónicos de terceros (mulas o identidades falsas), por lo que las investigaciones individuales nunca logran ver el cuadro completo.

---

### B. Cómo funciona en 4 pasos
1. **Reporte anónimo y seguro:** El transportista o bodeguero reenvía el mensaje de texto, captura o audio extorsivo a un **bot anónimo en Telegram**.
2. **Procesamiento y privacidad:** El sistema procesa el mensaje de forma totalmente privada y extrae únicamente los datos financieros clave:
   * Número de billetera digital (Yape / Plin).
   * Monto exigido (cobro de cupo diario o semanal).
   * Alias o nombre que figura en la billetera.
   * Línea de transporte o zona de la bodega afectada.
3. **Inyección en grafo y triangulación:** En lugar de dejar el reporte como un simple registro en una tabla, los datos se inyectan en un mapa de nodos.
4. **Detección del nodo central:** Cuando múltiples transportistas o bodegas reportan diferentes "mulas", el algoritmo de grafos dibuja las conexiones trianguladas en tiempo real para **identificar el nodo central de la mafia financiera**.

---

### C. Stack Técnico y Arquitectura (75% Rúbrica Técnica)

| Componente | Tecnología | Rol en la solución |
|---|---|---|
| **Orquestación** | **n8n** *(sponsor del evento)* | Recepción y flujo de webhooks del bot de Telegram en tiempo real |
| **Backend & IA** | **Python + FastAPI** | API de alto rendimiento con procesamiento asíncrono |
| **Modelo NER** | **LLM local (Llama 3)** | Extracción de Entidades Nombradas (NER) de forma privada, garantizando que datos sensibles no se filtren a servicios externos y demostrando arquitectura avanzada |
| **Base de Datos de Grafos** | **Neo4j** | Modelado de relaciones complejas, clústeres y detección de comunidades criminales |
| **Base de Datos Relacional** | **MariaDB / MySQL** | Almacenamiento plano estructurado y auditoría de eventos |
| **Frontend & Dashboard** | **React + Vite + Tailwind CSS** | Panel de inteligencia criminal en tiempo real, responsive y desplegado en una **URL pública** |
| **Documentación técnica** | **PlantUML** | Diagramas de arquitectura y flujo integrados en el `README.md` del repositorio (para asegurar la máxima puntuación en Calidad Técnica - 20%) |

---

### D. Estrategia de Evaluación y Tracción (+0.5 Bonus)
* **Funciona en vivo (25%):** El dashboard en React estará desplegado en una URL pública accesible para el jurado en su propia laptop, mostrando la actualización reactiva del grafo sin requerir instalación local ni login.
* **Bonus de Tracción (+0.5):** 
  * Se pondrá a disposición de los participantes del evento el bot de Telegram.
  * Durante el hackathon, se recolectarán más de 20 reportes de prueba simulados enviados por compañeros y asistentes.
  * Al momento del pitch, el jurado verá en pantalla los datos entrando en vivo y el grafo triangulando a los criminales en directo.

---

## 2. DeepShield RAG (Agente Autónomo de Contraste)

> **Enfoque clave:** Subárea de Desinformación y Estafas masivas. Motor de verificación Zero-Trust con citas a fuentes oficiales peruanas.

### A. La problemática que resuelve
* **El dolor:** La viralización descontrolada de desinformación, noticias falsas y estafas masivas (como esquemas piramidales, ofertas laborales falsas o bonos gubernamentales fraudulentos tipo "Bono Yanapay falso").
* **Público afectado:** Usuarios vulnerables (adultos mayores, familias) en grupos masivos de WhatsApp y Telegram que no tienen herramientas para validar la veracidad de cadenas virales.

---

### B. Cómo funciona
1. **Reenvío de cadena sospechosa:** El usuario recibe un mensaje o enlace dudoso en su aplicación de mensajería y lo reenvía directamente al sistema.
2. **Vectorización y Recuperación (RAG Zero-Trust):** El texto se transforma en embeddings vectoriales y el agente RAG escanea al instante una base de datos de conocimiento oficial precargada con:
   * Boletines oficiales del Ministerio del Interior (Mininter).
   * Alertas y comunicados de la División de Investigación de Delitos de Alta Tecnología (Divindat / PNP).
   * Normativas y comunicados de la SBS (Superintendencia de Banca, Seguros y AFP) sobre entidades financieras no autorizadas.
3. **Refutación fundamentada:** Si el sistema identifica el patrón de estafa o falsedad, genera una **refutación detallada citando textualmente la fuente oficial**, lista para que el usuario la comparta en su grupo y frene la desinformación.

---

### C. Stack Técnico y Arquitectura

| Componente | Tecnología | Rol en la solución |
|---|---|---|
| **Ingesta de peticiones** | **n8n / Node.js + Express** | Recepción de mensajes entrantes y preprocesamiento de la cadena |
| **Backend & Motor RAG** | **Python + FastAPI** | Pipeline de generación y recuperación de contexto con LLM local |
| **Base de Datos Vectorial** | **Qdrant / ChromaDB** | Almacenamiento e indexación semántica de boletines de la PNP, Mininter y SBS |
| **Frontend de Demostración** | **React + Vite + Tailwind CSS** | Panel interactivo que expone el flujo de verificación y comparación semántica en vivo para el jurado |
| **Validación y Fuentes** | **Tavily API** *(sponsor)* | Complemento opcional de búsqueda en tiempo real para noticias de última hora |

---

## 3. EspectroForensic (Validador de Deepfakes de Audio)

> **Enfoque clave:** Subárea de Suplantación de Identidad y Estafas con Clonación de Voz por IA.

### A. La problemática que resuelve
* **El dolor:** La suplantación de identidad mediante clonación de voz con inteligencia artificial.
* **El modus operandi:** Bandas criminales clonan la voz de un familiar (hijos, nietos) simulando un accidente o secuestro exprés ("mamá, estoy en la comisaría / me secuestraron"), o simulan la voz de una autoridad policial exigiendo transferencias inmediatas de dinero bajo pánico y presión psicológica extrema.

---

### B. Cómo funciona
1. **Reenvío preventivo:** El usuario recibe la nota de voz sospechosa por WhatsApp y, antes de desesperarse o transferir dinero, la reenvía inmediatamente al bot del sistema.
2. **Análisis espectral y frecuencias:** El sistema no analiza el contenido del mensaje (texto), sino la **señal física y las frecuencias del archivo de audio**.
3. **Detección forense de artefactos:** Genera el espectrograma y rastrea artefactos digitales, cortes de fase y anomalías acústicas características de las herramientas de síntesis/clonación de voz (como ElevenLabs, RVC, etc.).
4. **Veredicto inmediato:** Devuelve al usuario una alerta visual clara e instantánea (🟩 Voz humana orgánica / 🟥 Voz sintética clonada por IA) con la recomendación de colgar y verificar por llamada convencional.

---

### C. Stack Técnico y Arquitectura

| Componente | Tecnología | Rol en la solución |
|---|---|---|
| **Ingesta de Archivos** | **n8n** | Descarga y gestión de archivos de audio (`.ogg`, `.mp3`) de los servidores de mensajería |
| **Procesamiento de Señal & ML** | **Python + Librosa + FastAPI** | Extracción de espectrogramas, coeficientes MFCC y ejecución de modelo clasificador de ML |
| **API de Respuesta & Mensajería** | **Node.js** | Envío de alerta inmediata con veredicto directo al chat del usuario |
| **Dashboard Web Público** | **React + Vite** | Renderizado en tiempo real de la forma de onda y el espectrograma de frecuencias para la demo en vivo ante el jurado |

---

## 4. Proyecto Hydra: Red de Honeypots Autónomos (Agentes Activos)

> **Enfoque clave:** Seguridad activa / Ofensiva defensiva contra extorsión y estafas algorítmicas. Inversión del modelo tradicional: en vez de esperar la denuncia de una víctima, el sistema crea víctimas simuladas con agentes autónomos para extraer la infraestructura del criminal.

### A. La problemática que resuelve
* **El problema:** La extorsión y las estafas operan a escala algorítmica y masiva. Esperar a que una víctima real denuncie suele ser tarde: la víctima ya pagó o tiene demasiado miedo para hablar.
* **El concepto:** Despliegue de un **enjambre de "agentes señuelo" (honeypots)** impulsados por LLMs que simulan ser pequeños empresarios (bodegueros, transportistas) o personas vulnerables en redes sociales y Telegram.
* **Ingeniería social inversa:** Cuando un extorsionador contacta a un señuelo, el agente autónomo mantiene la conversación de manera creíble, finge temor y negocia hasta que el delincuente **revela sus cuentas bancarias, números de Yape/Plin o billeteras cripto** para recibir el pago.

---

### B. Cómo funciona
1. **Detección y enganche:** El extorsionador escribe amenazando al número señuelo. El agente autónomo toma el control de la conversación.
2. **Persistencia de personalidad y contexto:** El agente utiliza memoria contextual para no romper su falsa identidad (edad, tono asustado, rubro del negocio).
3. **Extracción activa:** El agente solicita formalmente los datos de pago para "hacer el depósito del cupo", extrayendo las cuentas receptoras.
4. **Alimentación automática del grafo:** En el momento exacto en que el delincuente envía el número de cuenta o Yape, el sistema lo captura y dibuja el nodo en un mapa de calor y grafo en vivo.

---

### C. Stack Técnico y Arquitectura (30% Complejidad)

| Componente | Tecnología | Rol en la solución |
|---|---|---|
| **Orquestación de sesiones** | **n8n** | Manejo de webhooks y múltiples sesiones de chat concurrentes |
| **Backend & Memoria de Agentes** | **Python + FastAPI + Arquitectura RAG / Memoria** | Gestión de contexto, perfiles de identidad y persistencia (apoyado con **AtomicMemory**, sponsor del evento) |
| **Generación de Diálogo Humano** | **LLM local** | Respuestas humanas, dialecto peruano y manejo de presión psicológica en tiempo real |
| **Inteligencia de Datos** | **Neo4j** | Base de datos de grafos que se auto-puebla en vivo conforme los señuelos extraen cuentas |
| **Dashboard Administrativo** | **React + Vite** | Panel de control desplegado en URL pública con métricas de atacantes neutralizados y grafos en tiempo real |

---

### D. El Show para el Pitch (25% Funciona en vivo)
* **Demostración interactiva con el jurado:** Durante el pitch, se proyecta el dashboard administrativo en React.
* Se invita a un miembro del jurado a que tome su propio celular y le escriba al bot señuelo simulando ser un extorsionador exigiendo dinero.
* El jurado y la audiencia ven en pantalla cómo la IA le responde con naturalidad, le pide la cuenta para "pagar", y en cuanto el jurado envía el número de prueba, **el nodo criminal y su relación financiera aparecen automáticamente proyectados en el mapa de calor**.
