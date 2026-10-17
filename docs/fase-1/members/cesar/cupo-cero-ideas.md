# Cupo Cero y banco de ideas anti-extorsión (apuntes de Cesar)

> Track 04: Seguridad (extorsión, estafas, suplantación y desinformación). Hack the Andes 2026, Lima, 17–18 de octubre, 30 horas.
> Resumen ordenado de varias conversaciones de ideación de Cesar con un asistente de IA. Son **ideas y una investigación de fuentes secundarias**, no evidencia de usuarios: todavía no hay entrevistas.
> **Para otra sesión de Claude:** usa este archivo como contexto de las ideas que Cesar ya trabajó. La idea principal es Cupo Cero (§5); las alternativas están en §11.

---

## 1. La tesis en una frase

No presentar la idea como "otro canal de denuncia", sino como **la pieza que falta entre la víctima y la orden judicial**: una máquina que convierte denuncias sueltas en **casos vinculados y listos para usar** con las herramientas legales que ya existen en 2026:

- congelamiento de fondos vía UIF (Ley 32209);
- levantamiento del secreto de las comunicaciones en 24 horas para extorsión (DL 1708);
- baja de líneas por Osiptel (Res. 134-2025-CD/OSIPTEL);
- nuevo delito de "exigencia extorsiva" (art. 200-A, DL 1731), que castiga la amenaza aunque la víctima no haya pagado.

El Estado ya tiene varios canales para recibir denuncias (111, 1818, el reporte de Yape y la plataforma cifrada del Mininter), pero **ninguno conecta los casos entre sí ni arma expedientes**. Ese es el hueco.

**El problema es la impunidad por fragmentación, no la falta de canales.**

**Frase de pitch:** *"El Perú no necesita otro número para denunciar; necesita que la denuncia número 7 sepa que hubo 6 antes con el mismo Yape. Cupo Cero convierte miedo disperso en casos que un fiscal puede firmar."*

---

## 2. El problema en cifras

### 2.1 Volumen de extorsión (las fuentes no coinciden)

| Fuente | Dato |
|---|---|
| SIDPOL (PNP), según el analista Juan Carbajal | 22 348 denuncias en 2024 |
| Plan Nacional de Seguridad Ciudadana (Mininter) | 22 361 en 2024 y 26 585 en 2025 |
| Policía, citada por AFP | 25 196 en 2025 (+20 %) |
| Ministerio Público | 22 835 en 2024 y 28 948 en 2025 (+26,8 %) |
| Ministerio Público, 2026 | 12 634 denuncias por extorsión y chantaje entre enero y junio (11 946 por extorsión), **unas 70 al día**; 13 892 entre enero y julio |

- **Por distrito fiscal (enero–julio 2026):** Lima Este 1806, La Libertad 1625, Lima Sur 1346, Lima Norte 1305, Lima Centro 1178. Por distritos, la Fiscalía destaca Trujillo, San Juan de Lurigancho, Cercado de Lima, Ate y Callao.
- **Inconsistencias:**
  - El diario Correo informó que más de 2300 denuncias de 2025 no aparecían en el SIDPOL que usó el Gobierno para su balance.
  - Carbajal señaló que la PNP informó 7694 denuncias para enero–mayo de 2026 y luego 6659 para enero–junio: la cifra acumulada bajó.
  - **Para el pitch:** el Estado no tiene una sola fuente de verdad; la plataforma puede ser una capa de datos limpia y trazable.

### 2.2 Impunidad y subregistro

- RPP, con datos de pedidos de acceso a la información: **53 958 denuncias entre enero de 2024 y abril de 2026 y solo 708 condenas** del Poder Judicial, es decir, alrededor de **1 condena por cada 76 denuncias**. Entre enero y abril de 2026 hubo 5270 denuncias policiales y la Fiscalía reportaba apenas cinco casos con acusación.
- Observatorio de Criminalidad del Ministerio Público: de 83 empresas de transporte formal extorsionadas, **solo 27 habían denunciado antes de sufrir un atentado** (56 no lo hicieron). Es el dato más fuerte para argumentar la "alerta temprana".
- No hay en el Perú un dato confiable de cifra oculta específico para extorsión. Referencia regional: la ENVIPE 2025 de México estima que el 97,0 % de las extorsiones no se denuncia o no llega a carpeta de investigación.
- INEI (boletín diciembre 2024–mayo 2025): la victimización por extorsión, incluida la tentativa, pasó de 1,0 % a 1,2 % en el ámbito urbano nacional.

### 2.3 Transporte: el epicentro

- Observatorio del Ministerio Público: 56 choferes asesinados en Lima y Callao hasta noviembre de 2025 (unas 73 muertes en el sector transporte en todo el año). El gremio Anitra habla de más de 50 conductores asesinados en 2025.
- En 2026, hasta mediados de año, ya había 107 ataques contra transportistas en Lima y Callao, tantos como en todo 2025.
- El 80 % de los ataques sigue el mismo patrón: sicarios en moto lineal con arma de fuego.
- Los gremios dicen que más de 400 empresas pagan hasta S/15 000 por unidad, con pérdidas cercanas a S/6 millones al mes (**cifra gremial, no oficial**).
- Paros de transportistas en abril, el 2 de octubre y el 4 de noviembre de 2025, y otro en enero de 2026. Lima y Callao están en estado de emergencia desde marzo de 2025, con renovaciones y patrullaje militar.

### 2.4 Modalidades principales

- Cobro de cupos a transportistas (combis, buses, mototaxis), bodegas y negocios.
- **"Gota a gota" y préstamos extorsivos por aplicativo.** El art. 200.2 del Código Penal (incorporado por la Ley 32183) ya castiga simular un préstamo para extorsionar. La Central Única de Denuncias (1818) registró 138 denuncias admitidas por extorsión gota a gota en enero de 2026, frente a 101 en enero de 2025 (+36,6 %). En delitos informáticos, los préstamos informáticos extorsivos son la denuncia más frecuente (58,7 %).
- Amenazas por WhatsApp con fotos de la víctima o de su local.
- Cobro por Yape o Plin a cuentas de terceros (cuentas mula).
- Uso de chips informales.

### 2.5 Extorsión desde cárceles (tema en disputa)

- Javier Llaque, jefe del INPE, dijo sobre las extorsiones de 2024 que "en el peor de los casos, habrá sido un 0.15%" las originadas en penales, y que con los bloqueadores "si antes salían 100 llamadas extorsivas, ahora evitamos que salgan 95" (Gestión/Canal N).
- Caretas reporta que el 60 % de los penales sigue sin bloqueadores.
- **Conclusión:** no basar el pitch en "todo sale de las cárceles". Basar la vinculación en patrones medibles: cuentas, números y guiones.

### 2.6 Contexto político

En 2026 hubo varios cambios de gobierno (Jerí, Balcázar, Fujimori). En agosto de 2026, el ministro del Interior César Astudillo anunció una **plataforma cifrada de denuncias** que oculta la identidad del denunciante. Es competidor directo en el canal, pero no en la vinculación de casos ni en el armado de expedientes.

### 2.7 Estafas, suplantación, phishing y desinformación

- **Phishing bancario:**
  - Según ESET (citado por terceros), el 62 % de los ciberataques detectados en el Perú en 2025 empezó con phishing, vishing o smishing.
  - En noviembre de 2025, el Poder Judicial condenó a seis personas por clonar la web del BCP y desviar dinero a cuentas abiertas con identidades falsas o reclutadas (cuentas mula).
  - El Centro Nacional de Seguridad Digital publica alertas de webs que suplantan a bancos (por ejemplo, la de préstamos de Interbank).
  - Estudio de María Mendoza (Universidad de Lima), citado por Gestión: el 22 % de víctimas de fraude financiero no presenta ningún reclamo ante el banco, la SBS o Indecopi.
- **"Yape falso" y comprobantes falsos:**
  - Kaspersky (citado por Andina) describe apps que simulan pagos, autocompletan el nombre, escanean el QR y generan un SMS de confirmación; se venden desde S/10–20 hasta S/200.
  - Infobae (agosto de 2026) reporta comprobantes generados con IA. ScamWatchHQ (sitio de menor calidad) afirma que también se imita con IA el sonido de confirmación de Yape: tomarlo como anécdota.
  - La defensa oficial es revisar los movimientos en la app propia y el código de seguridad de 3 dígitos.
- **Voz clonada y "hola mamá":** documentada a nivel internacional. En España, la Policía e INCIBE recomiendan una **palabra clave familiar**. En el Perú se reporta suplantación de voz junto con comprobantes falsos.
- **Desinformación:** el Perú tiene un ecosistema de verificación denso: Verificador de La República (miembro de la red IFCN desde febrero de 2020), Ojo Biónico de Ojo Público, Comprueba de Salud con Lupa (ganó el Fact-Checking Innovation Initiative, USD 50 000) y Convoca Verifica. **Oportunidad:** un bot que derive a estos verificadores en lugar de "inventar" veredictos.

### 2.8 Extorsión y fraude a empresas grandes

Qué entra y qué no entra en el track:
- **Robo físico a bancos** (asaltos, boquetes): **se sale del track**. No es extorsión, estafa, suplantación ni desinformación.
- **"Robo" digital a bancos y extorsión a empresas grandes:** encaja perfecto y es igual de grande o más.

Casos:
- **Ciberextorsión:** en 2024, un hacker con el alias Kzoldyck habría afirmado tener datos de más de tres millones de usuarios de Interbank y amenazó con seguir exponiéndolos tras una extorsión fallida; el banco dijo que no pagaría. Después vinieron más filtraciones en el mismo grupo empresarial, como la de Inkafarma (febrero de 2025). Fuente: Panamericana.
- **Ransomware:** según Palo Alto Networks, LockBit fue responsable del 67 % de las filtraciones de empresas peruanas en sitios de ransomware en 2023, y el Perú está en quinto lugar regional de filtraciones empresariales en sitios de extorsión. Fuente: El Peruano.
- **Suplantación corporativa (caso Arup):** un empleado de finanzas entró a una videollamada con quienes creía que eran el director financiero y otros miembros del personal; todos eran deepfakes. Hizo 15 transferencias por USD 25,6 millones. Fuente: Invezz.
- **Extorsión física a empresas:** constructoras, mineras, transporte formal y retail también pagan cupos. Es el mismo problema, pero el cliente es la empresa.

---

## 3. Lo que ya existe y sus brechas

### 3.1 En el Perú

| Solución | Qué hace | Brecha que podemos cubrir |
|---|---|---|
| **Central 111 (PNP)** | Línea gratuita 24/7, confidencial; orienta y deriva a la comisaría o a la División de Investigación de Extorsiones (Rímac) | Llamada sin evidencia estructurada, sin hash ni vinculación; la víctima igual tiene que ir en persona |
| **Central Única de Denuncias 1818 / App CUD (Mininter)** | Recibe denuncias por web, correo y app y las deriva | Es una "plataforma de atención": no analiza ni conecta casos |
| **Plataforma cifrada del Mininter (agosto de 2026)** | Denuncia con identidad protegida | Solo es un canal; no se conoce motor de vinculación ni expediente automático |
| **Guía de Acción Antiextorsión (Mininter, PNP y Asociación de Bodegueros, julio de 2025)** | Prevención en PDF | Estática; no se convierte en acciones |
| **Yape: "reportar extorsionador" (21 de noviembre de 2025)** | Reporte anónimo en la app; su CEO, Raimundo Morales, dijo que "cada denuncia será evaluada cuidadosamente"; con más de 15 millones de usuarios activos, puede cerrar cuentas e impedir la reafiliación | Solo cubre Yape, el reporte no vuelve a la víctima y no se cruza con Plin, bancos ni números |
| **Osiptel / RENTESEG** | En 2025 bloqueó 2 598 308 IMEI; suspendió 300 000 líneas sin validación de identidad; baja de líneas por delito en 1 día calendario (Res. 134-2025-CD/OSIPTEL, DS 018-2025-IN) | Actúa solo a pedido de una "entidad competente"; nadie le entrega paquetes de números ya vinculados y priorizados |
| **UIF-Perú (Ley 32209 y DS 007-2025-JUS)** | Congela fondos vinculados a extorsión a pedido de la PNP tras "una o más denuncias", con control judicial | Hace falta evidencia que asocie cuentas con denuncias: es justo lo que produce nuestro motor |
| **PL 13240/2025-CR** (aceptar o rechazar transferencias en billeteras) | Proyecto de ley, **no vigente** | Contexto: el Congreso ve a Yape y Plin como el medio de cobro |

### 3.2 Precedentes internacionales para citar

- **México, No+XT (Consejo Ciudadano de la CDMX):** base comunitaria de números de extorsión con identificador de llamadas y bloqueo. Empezó en 2015 con 100 000 números; en septiembre de 2026 reportaba más de 848 000 números identificados y más de 685 000 bloqueados. El 55 % de sus reportes es "cobranza ilegítima" (préstamos extorsivos). **Lección:** una base comunitaria funciona a escala y hay precedente latinoamericano. Nosotros vamos un paso más allá al vincular **cuentas de cobro**, no solo números.
- **Reino Unido, Daisy de O2:** "abuela" de IA (transcripción de voz + modelo de lenguaje + voz sintética), entrenada con el scambaiter Jim Browning; su número se "sembró" en las listas de víctimas de los estafadores. Según Virgin Media O2 (14 de noviembre de 2024), mantuvo a estafadores en llamadas de 40 minutos; Marketing Week precisa que hizo perder el tiempo a más de 1000 estafadores reales en llamadas de hasta 50 minutos, y que tomó casi un año de desarrollo. En 30 horas se puede hacer una versión de demo con ElevenLabs Conversational AI.
- **Mastercard (Consumer Fraud Risk y Vocalink), detección de cuentas mula:**
  - Johan Gerber (Mastercard) a CUToday.info: los criminales organizados pasan los fondos por hasta 30 cuentas de su red para disimular el fraude inicial.
  - eMarketer: las alertas con IA de Consumer Fraud Risk en el Reino Unido dieron una mejora promedio del 60 % en la capacidad de los bancos de identificar temprano cuentas de alto riesgo.
  - Vocalink halló una red central que concentraba cerca del 25 % de las cuentas mula sospechosas del Reino Unido.
  - **Lección:** el análisis de grafos de cuentas de cobro es la técnica de la industria; nosotros la aplicamos con datos ciudadanos.
- **Truecaller, Hiya, Whoscall y ScamAdviser:** referentes de reputación de números y webs. Debilidad local: no conocen las cuentas Yape/Plin ni los guiones extorsivos peruanos.
- **Brasil:** el Tribunal Superior Electoral creó un chatbot oficial en WhatsApp contra la desinformación. Precedente para un verificador por WhatsApp aliado a verificadores del IFCN.

---

## 4. Marco legal (convertirlo en argumento del pitch)

### 4.1 Tipo penal

- **Extorsión (art. 200 del Código Penal):** 10 a 15 años; 15 a 25 con agravantes (por ejemplo, si la víctima tiene actividad comercial).
- **Art. 200-A (DL 1731, febrero de 2026):** castiga la **exigencia extorsiva en sí**, aunque no haya pago. **Oro para el pitch:** el primer mensaje ya es evidencia de un delito consumado; el bot convierte el "solo me amenazaron" en una denuncia accionable.
- **Art. 200.2 (Ley 32183):** simular un préstamo para extorsionar (gota a gota).

### 4.2 Lo que solo puede pedir la autoridad (y el panel debe "pre-armar")

- **Intervención de comunicaciones y geolocalización:** CPP art. 230 y Ley 27697. Con el **DL 1708 (enero de 2026)**, los pedidos por extorsión se tramitan como "emergencia" y deben resolverse **en 24 horas**. El DL 1182 permite a la PNP geolocalizar en flagrancia.
- **Secreto bancario:** lo levanta un juez o fiscal (Constitución, art. 2 inc. 5). En 2025 hubo órdenes judiciales que incluyeron expresamente transferencias por Yape y Plin.
- **Congelamiento administrativo de fondos vía UIF:** Ley 32209 y DS 007-2025-JUS, a pedido de unidades especializadas de la PNP tras una o más denuncias, con control judicial. Según Infobae, el juez revisa la medida en menos de 48 horas.
- **Baja de líneas y bloqueo de IMEI:** Res. 134-2025-CD/OSIPTEL, a pedido de una entidad competente.

### 4.3 Protección de datos (Ley 29733 y DS 016-2024-JUS, vigente desde el 30 de marzo de 2025)

- Somos responsables de tratamiento de datos.
- Consentimiento previo, informado, expreso e inequívoco. Para datos sensibles (biométricos, incluida la **huella de voz**) el consentimiento debe ser por escrito.
- Ante un incidente de seguridad, notificar a la Autoridad Nacional de Protección de Datos Personales **en 48 horas** (art. 34). Multas de 0,5 a 100 UIT.
- El art. 14 permite tratar y transferir datos sin consentimiento para que entidades públicas ejerzan sus funciones. **Falta validar el inciso exacto** que aplica a la transferencia de un privado a la PNP o la Fiscalía. La Ley no se aplica a los bancos de datos públicos usados en investigación penal.
- Para un producto real: inscribir el banco de datos en el registro de la Autoridad Nacional de Protección de Datos Personales (en el pitch basta con decir que está contemplado).

### 4.4 Secreto de las comunicaciones (Constitución, art. 2 inc. 10)

Solo se levanta por mandato judicial motivado o **con autorización del titular**. La víctima que entrega sus propios chats y audios cuenta como titular. La plataforma **nunca intercepta nada**: recibe lo que la víctima aporta.

### 4.5 Cadena de custodia

El reglamento del Ministerio Público (Res. 729-2006-MP-FN y modificatorias) se pensó para evidencia física; no se encontró un reglamento específico para evidencia digital. La doctrina peruana dice que una captura suelta es prueba débil y que lo que da "mismidad" es el hash y la trazabilidad. **No prometer "valor probatorio pleno"**: prometer "preservación íntegra y trazable para que la Fiscalía haga la pericia". Instruir a la víctima a **no borrar el chat ni cambiar de celular**.

---

## 5. Idea elegida: Cupo Cero

**Expediente de extorsión en 3 minutos + vinculación de casos.**

- **Problema:** la víctima no denuncia o denuncia mal, y las denuncias quedan sueltas. Nadie conecta los casos que comparten el mismo número, cuenta Yape/Plin o guion.
- **Usuarios:** bodegueros, choferes y transportistas, víctimas de préstamos gota a gota.
- **Enfoque:** extorsión como tema principal; el mismo motor sirve para estafas (mencionarlo en el pitch).
- **Dos lados de la plataforma:**
  1. **Bot ciudadano** (WhatsApp/Telegram): recibe la evidencia, orienta y genera el expediente.
  2. **Panel para la autoridad** (PNP, Fiscalía, municipalidades): mapa, grafo de bandas y expedientes listos.

### 5.1 Bot ciudadano

1. Consentimiento en el primer mensaje (Ley 29733), con un texto corto que explique para qué se usan los datos y que se compartirán con la autoridad.
2. Recibe audio, captura o texto.
3. Extrae en JSON: número, Yape/Plin/CCI, monto, plazo, alias de la banda, tipo de amenaza y si hay foto del local, la casa o la familia.
4. Corre los módulos OSINT (§5.4) en paralelo.
5. Calcula el puntaje de riesgo: vigilancia previa, banda real o imitador, reportes previos, escalada.
6. Orientación inmediata: no pagar, no borrar el chat, no cambiar de celular, llamar al 111.
7. Genera un PDF: hash SHA-256 por archivo, hash encadenado del expediente, sello de tiempo, cronología, ficha OSINT y tipificación sugerida (art. 200 o 200-A).
8. Memoria del caso: la víctima vuelve ("me escribieron otra vez") y se agrega a la línea de tiempo.
9. Modo discreto: no dejar historial sensible en el celular de la víctima tras subir la evidencia, por si el extorsionador revisa su teléfono.
10. Alerta de vinculación a la víctima: "Tu caso coincide con otros 4 casos en Ate. Se enviará a la autoridad como posible misma banda."

### 5.2 Motor de vinculación (grafo de bandas)

- Une casos por cuenta, número, guion (embeddings), voz (embeddings de hablante), imagen (pHash) y zona.
- Detección de comunidades (Louvain/Leiden) para formar "bandas" como entidades.
- **Ficha de banda:** casos, cuentas activas, chips, distritos, montos, horario y última actividad.
- Recálculo periódico con cron (Maritime).
- Todo vínculo por voz o texto es **indicio con nivel de confianza**, nunca identificación.

### 5.3 Panel para la autoridad

- Mapa de calor: data real del SIDPOL por departamento + capa simulada por distrito.
- Grafo de bandas y ficha de banda.
- Botón **"Paquete legal"** que genera borradores de:
  - pedido de congelamiento de fondos a la UIF (Ley 32209);
  - requerimiento fiscal al juez para intervención de comunicaciones (CPP art. 230; DL 1708, trámite de 24 h);
  - solicitud de baja de líneas a Osiptel (Res. 134-2025-CD/OSIPTEL);
  - pedido de levantamiento del secreto bancario.
- Dificultad baja (plantillas + LLM) y "wow" altísimo para jurados con perfil de políticas públicas: traduce la tecnología en acción del Estado. *"Lo que hoy toma semanas de oficios, en un clic. La ley ya existe; faltaba el expediente."*

### 5.4 Módulos OSINT (solo sobre infraestructura, nunca sobre personas)

Se aplica todo a los datos que la víctima ya tiene (número, cuenta, link, imagen, audio), nunca a buscar a la persona detrás.

Semáforo legal: 🟢 sin problema · 🟡 permitido con cuidados · 🔴 no hacerlo (ver §6)

| Dato | Qué se hace | Herramientas | Legal |
|---|---|---|---|
| Número | País, tipo de línea, si es extranjero o VoIP (señal de que no es un chip local), formato válido | `phonenumbers` (libphonenumber) | 🟢 |
| Número | ¿Ya fue reportado? ¿Cuántas veces y en qué distritos? | Base propia de Cupo Cero | 🟡 A la víctima solo cifras agregadas |
| CCI / cuenta | Validar formato y deducir el banco (los primeros 3 dígitos del CCI identifican la entidad) | Regex + tabla de códigos de bancos | 🟢 |
| Yape / Plin / cuenta | Cruce con otros casos: "esta cuenta aparece en 7 denuncias" | Grafo (NetworkX) | 🟡 Solo visible para la autoridad |
| Links | Reputación, antigüedad del dominio, certificados, captura del sitio | VirusTotal, urlscan.io, WHOIS/RDAP, crt.sh, Google Safe Browsing | 🟢 |
| Imágenes | ¿La foto del arma o la amenaza es reciclada de internet o de otro caso? | pHash, búsqueda inversa, EXIF | 🟢 |
| Imágenes | ¿Hay foto del local, la casa o la familia? (vigilancia previa) | LLM con visión | 🟢 Sube mucho el riesgo |
| Alias de banda | ¿Existe en noticias públicas? ¿Tiene atentados registrados? | Tavily, Apify | 🟢 Info pública sobre organizaciones, no personas |
| Alias de banda | ¿Banda real o imitador que usa el nombre para asustar? | Comparar guion y modus operandi con casos previos | 🟢 Muy útil para medir el riesgo real |
| Texto | Clasificar el guion y compararlo con otros casos (mismas frases, errores, emojis) | Embeddings + similitud coseno | 🟢 Solo como indicio |
| Audio | Transcribir, vincular voces entre casos, detectar voz sintética | ElevenLabs STT, SpeechBrain (ECAPA) | 🟡 Solo indicio, nunca "identificación" |

**Funciones que salen del OSINT:**
- **"¿Amenaza real o imitador?":** si el alias coincide con una banda con atentados reales, el riesgo sube. Si el guion no calza con su modus operandi, probablemente sea un oportunista.
- **Ficha OSINT dentro del PDF:** banco de la cuenta, reportes previos del número, análisis del link, si la imagen es reciclada y noticias sobre la banda. Todo listo para el fiscal.
- **Alerta de vinculación** (ver §5.1, punto 10).

### 5.5 Flujo completo

1. La víctima manda la captura o el audio y acepta el consentimiento.
2. Se extraen los datos (número, cuenta, monto, plazo, alias, tipo de amenaza).
3. Los módulos OSINT corren en paralelo sobre esos datos.
4. Se calcula el riesgo: vigilancia previa, banda real o imitador, reportes previos, escalada.
5. La víctima recibe la orientación inmediata.
6. Se genera el PDF con hash, cronología, ficha OSINT y tipificación sugerida.
7. El caso entra al grafo y, si se vincula con otros, se alerta al panel de la autoridad.

**Pendiente:** armar el esquema JSON de extracción y la fórmula del puntaje de riesgo para empezar a codear.

---

## 6. Líneas rojas y blindaje legal

### 6.1 Líneas rojas 🔴 (decirlas explícitamente en el pitch)

- **No buscar a la persona** detrás del número o la cuenta: nada de people-search, perfiles de redes, DNI ni direcciones.
- **No geolocalizar números** ni personas. Solo la PNP con orden judicial o en flagrancia.
- **No hacer transferencias de prueba** a Yape para ver el nombre del titular. Si la víctima ya vio ese nombre al intentar pagar, puede incluirlo como evidencia, pero la herramienta no lo automatiza.
- **No contactar al extorsionador** desde la plataforma: nada de responderle, llamarle ni hacerle señuelo.
- **No publicar números ni cuentas con nombres:** el titular puede ser víctima de robo de chip o una cuenta mula reclutada.
- El panel muestra solo entidades de infraestructura (cuentas, números, dominios, guiones). Los datos de titulares solo los obtiene la autoridad con orden judicial.
- El señuelo de IA ("Doña Rosa") **nunca se usa contra extorsionadores de una víctima real**, por el riesgo de represalia y porque la figura del agente encubierto requiere autorización fiscal. Solo se usa en números sembrados para estafas masivas.

### 6.2 Blindaje dentro de la herramienta

- **Protección de datos:** consentimiento en el primer mensaje, finalidad clara, minimización (guardar solo lo necesario y borrar después de un plazo; embeddings de voz en lugar de audio crudo cuando se pueda), cifrado de todo, registro de quién accede al panel, retención limitada y derechos ARCO (acceso, rectificación y eliminación).
- **Evidencia:** SHA-256 por archivo, sello de tiempo y registro de cada paso (cadena de custodia digital). Prometer "preservación íntegra y trazable", no "prueba plena"; la pericia la hace la Fiscalía.
- **No es asesoría legal:** la tipificación aparece como "sugerida", con el aviso "orientación, no asesoría legal". El bot siempre deriva al 111, la comisaría o la Fiscalía; nunca sustituye la denuncia.
- **Contra acusaciones falsas:** un número o cuenta solo se marca con varios reportes independientes con evidencia (hash). Mecanismo de apelación por si alguien fue marcado por error (por ejemplo, a quien le robaron el chip).
- **Seguridad de la víctima:** modo discreto; nunca sugerir confrontar ni negociar con el extorsionador.

---

## 7. Stack técnico y perks de sponsors

| Capa | Herramienta | Uso |
|---|---|---|
| Mensajería e ingesta | Zavu (WhatsApp/Telegram/SMS) | Bot ciudadano; difusión a conductores |
| Orquestación | n8n | Flujos entre servicios |
| Audio y voz | ElevenLabs STT; ElevenLabs Conversational AI | Transcribir amenazas; agente señuelo y simulador (módulos opcionales) |
| Visión / OCR | LLM con visión; APIs de pago por llamada vía Qatom (reputación de URL, WHOIS, OCR) | Extraer número, cuenta, monto, plazo y alias en JSON desde capturas y vouchers |
| Extracción | Regex peruanas (celular de 9 dígitos que empieza en 9, CCI de 20 dígitos, montos "S/") + LLM | Entidades normalizadas |
| Estilometría | Embeddings de texto (sentence-transformers) + coseno; n-gramas de caracteres | Agrupar guiones similares |
| Voz | Embeddings de hablante (ECAPA-TDNN de SpeechBrain o Resemblyzer) | "Este audio se parece al del caso #123", siempre como indicio |
| Forense de imágenes | pHash, EXIF, Error Level Analysis | Imágenes reutilizadas; vouchers manipulados |
| Grafo / resolución de entidades | NetworkX o Neo4j; Louvain/Leiden | "Bandas" como entidades |
| Dominios | dnstwist, Certstream, WHOIS/RDAP, URLhaus | Cazador de dominios que imitan bancos |
| Evidencia | SHA-256 por archivo + cadena de hashes + sello de tiempo | Expediente con integridad verificable |
| Memoria del caso | Memory Cloud / AtomicMemory | La víctima vuelve y se suma a su caso |
| Agentes con cron/webhook | Maritime | Recálculo del grafo, agentes siempre disponibles |
| Búsqueda y scraping | Tavily, Apify | Noticias de bandas y alertas públicas |
| Panel | Lovable | Panel de autoridades en horas |

> Según CLAUDE.md, el kit de Qatom está **por confirmar**: no ponerlo como pieza central hasta que el equipo lo confirme.

**Modelo de negocio opcional ("Qatom al revés"):** exponer la API de "reputación de cuenta o número" (solo agregados) en Qatom para que fintechs, apps de delivery, marketplaces y otros agentes la consulten pagando por llamada.

---

## 8. Datos para el demo

- **Mapa:** "DataSet Denuncias Policiales – Enero 2018 a Julio 2026" del SIDPOL en la Plataforma Nacional de Datos Abiertos (CSV mensual por departamento y tipo de hecho, licencia ODC-By, del Observatorio Nacional de Seguridad Ciudadana del Mininter). El Mininter también publica en gob.pe la base del SIDPOL en ZIP (por ejemplo, la de diciembre de 2025). Usarlo para el mapa de calor real y simular los casos individuales encima.
- **Calibración:** cifras por distrito fiscal del Observatorio de Criminalidad del Ministerio Público (Lima Este > La Libertad > Lima Sur…).
- **Casos sintéticos:** unos 300 casos con 8–10 bandas latentes. Cada banda reutiliza 2–4 cuentas Yape/Plin, 3–6 chips, un guion con variaciones y una zona. Agregar ruido (casos sueltos, cuentas compartidas por error). El motor debe "redescubrir" las bandas y mostramos la precisión (a los jurados técnicos les encanta).
- **Amenazas:** 20–30 plantillas basadas en casos de prensa ("somos la banda X, tienes 48 horas, yapea a…"), variadas con un LLM. Números y cuentas ficticios.
- **Textos de estafa y phishing en español:**
  - SpaPhish (Mendeley; DOI 10.17632/hz2d6gz7pc): 1395 correos en español (731 de phishing), anotados con principios de persuasión; sirve para un clasificador de "táctica psicológica".
  - Dataset de smishing de Mishra y Soni: 5971 SMS (638 de smishing), en inglés; para aumentar datos.
  - Smishtank: 1090 SMS de phishing.
- **Dominios:** feeds de PhishTank y URLhaus, Certstream y dnstwist sobre bcp, interbank, bbva, yape y plin.
- **Voz:** ASVspoof (corpus estándar de voz falsificada) para la detección. Audios generados con ElevenLabs **solo con voces propias o consentidas del equipo**, nunca imitando a personas reales.
- **Transacciones (para la red anti-cuentas mula):** PaySim (dinero móvil sintético) o AMLworld de IBM (lavado sintético), con bandas inyectadas por nosotros.

---

## 9. Plan de horas y demo

### 9.1 Plan de horas

- **0–8:** bot de Zavu en WhatsApp → STT de ElevenLabs y LLM con visión → JSON de entidades → PDF con SHA-256 por archivo y hash encadenado. Persistencia del caso en AtomicMemory.
- **8–18:** generador de 300 casos simulados; motor de vinculación (coincidencia exacta de cuentas y números + coseno de guiones + embeddings de voz) en NetworkX con Louvain; job de Maritime que recalcula con cron.
- **18–26:** panel en Lovable: mapa de calor (SIDPOL real + capa simulada por distrito), grafo de bandas, ficha de banda y botón "Generar paquete legal".
- **26–30:** módulo opcional ("Doña Rosa" mínima con ElevenLabs Conversational AI, prompt de abuela limeña y herramienta `registrar_cuenta`), ensayo y video de respaldo.

### 9.2 Guion del demo (3 minutos)

1. Dato de apertura (citar fuente): unas 70 denuncias por extorsión al día y alrededor de 1 condena por cada 76 denuncias (Ministerio Público; RPP).
2. Un jurado manda desde su celular un audio de amenaza al bot. En ~20 segundos recibe la orientación y el PDF con hash.
3. En el panel, el caso se ilumina y se une a una banda, por ejemplo "Los Cobradores del Este": 9 casos, 3 cuentas Yape, 4 chips, Ate y SJL.
4. Clic en "Paquete legal": aparecen los borradores para la UIF, el juez y Osiptel.
5. (Opcional) Llamada en vivo de "Doña Rosa" con un estafador actuado por un compañero: le saca un Yape y ese Yape aparece en el grafo conectado a otro caso.
6. Cierre ético: "Cero doxxing. Solo vinculamos infraestructura: cuentas, números, guiones. Los datos de las personas los pide la autoridad con orden judicial. Cumplimos la Ley 29733 desde el diseño."

### 9.3 Qué suelen valorar los jurados

Criterios típicos (no se encontró un ranking público de ganadores LATAM de este nicho; **la rúbrica oficial está en CONTEXT.md §2**):
1. Problema local medido con cifras oficiales.
2. Demo de punta a punta en vivo, idealmente desde el celular de un jurado.
3. Uso real y visible de los perks de los sponsors.
4. Camino creíble hacia un usuario institucional (PNP, Fiscalía, municipalidades, gremios).
5. Ética y legalidad pensadas desde el diseño.
6. Un momento "wow" de 20 segundos.

---

## 10. Datos clave y advertencias

- **Cifras en conflicto:** para 2025, el SIDPOL da entre 25 196 y 26 585 denuncias y el Ministerio Público 28 948. Citar siempre la fuente de cada número.
- Las pérdidas del transporte (S/15 000 por unidad, S/6 millones al mes) son **cifras gremiales, no oficiales**.
- Fuentes secundarias de menor calidad, no usar como cifra central: el 62 % de phishing de ESET (citado por un proveedor), y el 90 % de fraude por Yape/Plin y los 370 dominios (ScamWatchHQ).
- Los datos legales de 2026 (DL 1708, DL 1731 y art. 200-A, Ley 32684) vienen de LP Derecho, El Peruano y medios especializados. **Confirmar en el SPIJ o El Peruano** el número de la norma y el plazo exacto antes de ponerlos en una diapositiva. Falta precisar el inciso del art. 14 de la Ley 29733.
- La similitud de voz y la estilometría tienen falsos positivos: presentarlas siempre como "indicio de vinculación con nivel de confianza".
- No se investigó con fuentes primarias a ganadores de hackathons de este nicho; los criterios de jurado son prácticas comunes.
- El señuelo de voz y las voces sintéticas requieren voces propias o con consentimiento y no deben usarse para provocar delitos contra víctimas reales.

---

## 11. Banco de ideas

### 11.1 Núcleo (Cupo Cero, ver §5)

1. **"Cupo Cero": expediente 200-A en 3 minutos.** Bot que recibe la amenaza, extrae datos, calcula riesgo, orienta y genera el PDF con hash. Perks: Zavu, ElevenLabs STT, LLM con visión vía Qatom, AtomicMemory. Simulación: 30 amenazas sintéticas. Dificultad media; wow alto si el jurado lo prueba en vivo.
2. **Motor de bandas (grafo).** Vincula casos y arma la ficha de banda. Perks: Maritime (cron), n8n. Simulación: 300 casos y 10 bandas latentes. Dificultad media-alta; wow muy alto (es visual).
3. **"Paquete legal en un clic".** Borradores para UIF, juez, Osiptel y secreto bancario. Dificultad baja; wow altísimo.
4. **Radar de transportistas (alerta temprana).** Cada empresa o ruta registra sus amenazas; el sistema detecta escalada (más mensajes, menciones a conductores, fotos de buses) y alerta a la empresa y a la comisaría. Mapa por ruta y paradero sobre data real del SIDPOL. Se apoya en que 56 de 83 empresas no denunciaron antes del atentado. Perks: Zavu, Maritime, Lovable. Dificultad media; wow alto por la conexión emocional con los paros.
5. **Detector de préstamo extorsivo (gota a gota).** Analiza capturas de apps o mensajes de cobranza, identifica el patrón del art. 200.2 (cobranza con amenazas o difusión de fotos a contactos), orienta (Indecopi/SBS/1818) y vincula las cuentas de cobro con el grafo. Dificultad baja.

### 11.2 Estafas y suplantación

6. **"Doña Rosa", señuelo limeño tipo Daisy.** Agente de ElevenLabs en números sembrados que hace perder tiempo a estafadores telefónicos. Cuando el estafador dicta una cuenta o Yape, entra al grafo. Métricas en vivo: minutos robados y cuentas recogidas. Perks: ElevenLabs, Maritime, Zavu. Dificultad media; wow máximo. **Solo estafas, nunca extorsión real.**
7. **Simulador anti-estafa para adultos mayores ("Entrena a tu abuela").** Llamadas simuladas (falso banco, "hijo detenido", premio) con voz de ElevenLabs; al final, retroalimentación sobre las señales que no vio; el hijo o la hija recibe un reporte por WhatsApp. Dificultad baja-media; wow alto y tierno.
8. **Palabra clave familiar + verificador de voz.** El grupo familiar registra una palabra clave; ante un audio sospechoso ("mamá, cambié de número"), el bot sugiere el reto y calcula un puntaje de voz sintética (indicio). Dificultad media.
9. **Verificador de vouchers Yape/Plin para bodegas.** Foto → OCR → chequeos de consistencia (fuente, hora, formato) → recordatorio de comparar el código de 3 dígitos y los movimientos propios. Honestidad: la única prueba real es el movimiento en la cuenta propia; es "detector de alerta", no validador. Dificultad baja; wow medio.
10. **Cazador de dominios bancarios falsos.** Certstream + dnstwist sobre marcas peruanas → puntaje → captura (Apify) → reporte y alerta. Los dominios entran al grafo cuando aparecen en SMS reportados. Dificultad media; wow medio-alto con un feed en vivo.
11. **Base comunitaria peruana de números y cuentas (No+XT mejorado).** Consulta "¿este Yape o número tiene reportes?" por WhatsApp; solo agregados ("reportado 7 veces por extorsión en SJL"), sin titulares. Riesgo de reportes maliciosos: umbral de reportes independientes y evidencia con hash.

### 11.3 Desinformación

12. **"¿Es cadena?" por WhatsApp.** Recibe la cadena o el audio viral, busca en verificadores peruanos (Verificador LR, Ojo Biónico, Comprueba, Convoca) vía Tavily y devuelve el enlace o "no verificado aún". Útil contra cadenas tipo "nuevo modus operandi" o "banda X en tu distrito". Dificultad baja.
13. **Detector de falsas alertas de extorsión.** Clasifica si un "comunicado de la banda X" es reciclado comparando pHash e imagen con casos anteriores. Reduce el pánico y los paros basados en rumores.

### 11.4 Ideas "locas" pero factibles

14. **"Gemelo de la banda".** Un LLM resume la ficha de banda como perfil operativo (horarios, montos, escalada típica) y predice la próxima etapa para priorizar casos con mayor riesgo de atentado.
15. **Agente "fiscal asistente".** Agente en Maritime que cada noche recorre los casos nuevos, actualiza el grafo, redacta el resumen para la comisaría del distrito y lo envía por correo o Telegram vía Zavu.
16. **Marketplace de evidencia (Qatom al revés).** Ver modelo de negocio en §7.

### 11.5 Ideas a escala grande (empresas y sistema financiero)

17. **Red anti-cuentas mula para el sistema financiero.** Bancos, cajas y billeteras (Yape, Plin) comparten señales de cuentas que reciben dinero de extorsión o estafa, con hashes en vez de datos personales. Un grafo detecta redes de cuentas que mueven el dinero en cadena y genera alertas para congelamiento vía UIF. Es "seguir el dinero": conecta la extorsión al bodeguero con todo el sistema bancario. Datos: PaySim o AMLworld + bandas inyectadas.
18. **Escudo contra fraude del CEO y deepfakes corporativos.** Cuando finanzas recibe una orden de pago urgente (correo, llamada o videollamada), el sistema la intercepta y verifica si el correo viene de un dominio parecido o falla SPF/DKIM, si el audio tiene señales de voz sintética, y pide confirmación al ejecutivo real por un canal independiente ya registrado. Demo: voz clonada (con permiso) de un compañero que hace de "gerente" pide una transferencia urgente y se bloquea en vivo. Referencia: caso Arup.
19. **Monitor de ciberextorsión para empresas.** Vigila sitios de filtración de ransomware (vía agregadores públicos), foros y canales de Telegram buscando empresas peruanas. Alerta temprana ("tu empresa aparece listada", "se venden credenciales de tu dominio") y playbook: no pagar sin asesoría, notificar a la autoridad de datos personales en 48 horas, avisar a la SBS si es entidad financiera y comunicar a clientes. **Solo detectar menciones, nunca descargar datos filtrados.**
20. **Protección de marca contra suplantación masiva.** Para bancos, retail y telcos: detecta dominios, perfiles, apps y anuncios falsos que usan su marca; prioriza por riesgo y genera solicitudes de baja automáticas. Impacto medido en clientes protegidos.
21. **Seguridad corporativa contra extorsión física.** Constructoras, mineras y transporte formal: obreros, choferes y gerentes reportan amenazas por WhatsApp; la empresa ve un tablero por sede u obra con nivel de escalada, coordina con la PNP y genera el paquete legal. Es Cupo Cero vendido a empresas que sí pagan.
22. **Gestión de crisis por desinformación.** Detecta rumores dañinos contra entidades ("el banco X quiebra", "Yape está hackeado, retira tu plata", promociones falsas), mide su viralización, avisa a comunicaciones y redacta la aclaración con evidencia. Un rumor financiero puede provocar retiros masivos: escala nacional.

---

## 12. Ranking y recomendación

| # | Idea | Impacto | Factibilidad 30 h | Wow | Perks | Veredicto |
|---|---|---|---|---|---|---|
| 1 | Cupo Cero + Motor de bandas + Paquete legal (1+2+3) | Muy alto | Media | Muy alto | Zavu, ElevenLabs, Qatom, AtomicMemory, Maritime, n8n, Lovable | **Construir** |
| 2 | "Doña Rosa", señuelo que alimenta el grafo (6) | Medio-alto | Media | Máximo | ElevenLabs, Maritime, Zavu | **Módulo wow** |
| 3 | Radar de transportistas (4) | Muy alto | Media | Alto | Zavu, Maritime, Lovable | Vista del panel |
| 4 | Simulador para adultos mayores (7) | Medio | Alta | Alto | ElevenLabs | Plan B si el grafo falla |
| 5 | Cazador de dominios (10) | Medio | Media | Medio | Apify, Qatom | Solo si sobra tiempo |
| 6 | Verificador de cadenas (12) | Medio | Alta | Medio | Tavily, Zavu | Diapositiva de roadmap |
| 7 | Verificador de vouchers (9) | Medio | Alta | Medio | Qatom (OCR) | Diapositiva de roadmap |

**Recomendación principal:** construir Cupo Cero (1+2+3) con "Doña Rosa" como módulo wow si sobra tiempo.

**Si se quiere algo a escala grande (y dentro del track):** la mejor es la **red anti-cuentas mula (17)**, porque toda extorsión y estafa termina en una cuenta y engancha con Cupo Cero (los reportes ciudadanos alimentan el grafo que usan bancos y la UIF). Para el wow, el **deepfake del gerente bloqueado en vivo (18)** es lo más impactante. Combinación posible: **"plataforma antifraude y antiextorsión para el sistema financiero"**, con el grafo de cuentas mula como núcleo y la verificación anti-deepfake como segundo módulo.

**Pendiente:** si el equipo va por la versión de escala grande, armar el flujo y la forma de simular las transacciones.
