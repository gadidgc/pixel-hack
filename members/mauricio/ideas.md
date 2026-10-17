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
