# Hack the Andes 2026: Contexto compartido del equipo

> Fuente única de verdad del equipo. Todos lo leen antes de proponer ideas.
> Track: **04 · Seguridad (`security`)** · Mercado: **primero Perú, luego Latinoamérica**.
> Última actualización: 2026-10-17 (día 1 del evento, con la rúbrica oficial presentada en el evento). Fuentes al final.

---

## 1. El evento en una pantalla

| Tema | Detalle |
|---|---|
| Fechas | **17 y 18 de octubre de 2026**, 30 horas, presencial en Lima |
| Organiza | Crafter Station · Sponsor principal: Chofex · Aliado: Peru Tech Week |
| Tamaño | 100 personas, equipos de 1 a 4, 4 tracks, máximo 12 equipos por track |
| Premios | 1.º **S/ 6,000**, 2.º **S/ 2,000**, más viaje a la sede de Chofex (San Francisco / Monterrey), mentoría de StartUPC y créditos de Qatom y AtomicMemory |
| Pitch | **3 min de pitch + 2 min de preguntas**, en la computadora de la organización (no en la nuestra) |
| Entrega | URL de la app desplegada · URL de la presentación · URL del repo en GitHub · descripción en Markdown |

### Brief del track de Seguridad (texto oficial)
> "Extorsión, estafas, seguridad de comercios y transportistas, suplantación y desinformación."

Son cinco subáreas: **extorsión · estafas · seguridad de comercios y transportistas · suplantación · desinformación**.
Se elige el track según el problema *principal* que resuelve el proyecto.

---

## 2. Rúbrica del jurado (OFICIAL, presentada en el evento el 17 de octubre)

> ⚠️ Esta rúbrica **reemplaza** a la de la guía web (tracción 30% / técnico 40% / pitch 30%), que ya no aplica.
> Capturas: [docs/rubrica.webp](docs/rubrica.webp) · [docs/puntos-extra.webp](docs/puntos-extra.webp) · Hoja completa "Cómo se evalúa a los equipos": [docs/rubrica-oficial.pdf](docs/rubrica-oficial.pdf)

### Paso 0: requisitos para entrar a la evaluación
Si falta **uno solo**, el equipo **no se puntúa**:
| Requisito | Detalle |
|---|---|
| **URL pública** | Desplegado. Localhost no cuenta. |
| **Demo en vivo** | Slides o video grabado no cuentan. |
| **Código en GitHub** | El repo se entrega con la URL. |
| **Hora límite** | **Domingo 18, 09:00** |

**Técnico 75% · Producto 25% · Cada criterio se puntúa de 1 a 5.**
Lo puntúan **5 jurados**; cada uno multiplica la nota por el peso y suma. La nota final es el **promedio de los 5 jurados**.

| Peso | Bloque | Criterio | Qué mira el jurado |
|---|---|---|---|
| **30%** | Técnico | **Complejidad técnica** | Integraciones, datos, modelos y arquitectura |
| **25%** | Técnico | **Funciona** | Flujo completo **en vivo desde la URL pública** |
| **20%** | Técnico | **Calidad técnica** | **El jurado revisa tu repo en GitHub** |
| **15%** | Producto | **Problema e impacto** | **Un usuario real de tu track** |
| **10%** | Producto | **Claridad** | Explicas decisiones y tradeoffs |

### Qué significa 1, 3 y 5 en cada criterio (según la hoja oficial)
| Criterio | 1 | 3 | 5 |
|---|---|---|---|
| Complejidad técnica | Wrapper de una API o CRUD simple | Integra APIs, datos o un modelo con lógica propia | Datos reales, modelos o servicios orquestados, arquitectura no trivial |
| Funciona | Falla en vivo | Corre con datos de juguete | Datos reales y aguanta preguntas fuera del guion |
| Calidad técnica | Frágil o con secretos en el repo | Ordenado, con atajos | Maneja errores, casos borde y credenciales |
| Problema e impacto | Tema genérico | — | Usuario específico y evidencia del problema |
| Claridad | No se entiende qué hicieron | — | Qué, por qué y qué quedó fuera |

**Desempate:** gana el mayor puntaje en **Complejidad técnica**; si sigue el empate, en **Funciona**.

### Puntos extra (tracción, se suman encima)
| Extra | Nivel | Qué cuenta |
|---|---|---|
| 0 | Sin tracción | Sin usuarios fuera del equipo, o sin evidencia |
| **+0,25** | Lo usaron | Personas fuera del equipo lo usaron. **Se ve en registros o datos.** |
| **+0,5** | Uso repetido | Volumen visible, lista de espera real o un pago |

El bonus premia usuarios reales **durante el hackathon** y no reemplaza lo técnico. **La evidencia se muestra desde el producto**: capturas solas, cuentas del equipo o tráfico automatizado **no cuentan**.

### Cómo calculamos el puntaje
```
nota (1–5) = 0,30×Complejidad + 0,25×Funciona + 0,20×Calidad + 0,15×Problema + 0,10×Claridad
nota final = nota + extra (0 / 0,25 / 0,5)      → máximo 5,5
```
Para comparar fácil, en SYNTHESIS.md también la mostramos sobre 100 (nota × 20; el extra suma hasta +10).

### Qué significa esto para elegir la idea
1. **El 75% es técnico.** Gana una idea con integraciones reales, datos propios, modelos y una arquitectura que se pueda explicar. Un CRUD encima de un LLM no alcanza.
2. **"Funciona" vale 25%**: el flujo completo tiene que correr **en vivo desde una URL pública**, en la laptop del jurado, sin login y sin nada local. Si la idea vive en WhatsApp o en Android, igual necesitamos una URL pública donde se vea el flujo completo.
3. **El repo se evalúa (20%)**: código ordenado, README claro, PRs, commits con sentido, sin claves. Antes de entregar, la lluvia de ideas (`members/`) se mueve fuera del código o se ordena en `docs/`.
4. **Hace falta al menos un usuario real del track** (15%): un bodeguero, un chofer o una víctima de estafa que confirme el problema. Las entrevistas siguen importando.
5. **La tracción ahora es un bonus** (máximo +0,5), no el 30%. Vale la pena si sale barata: registros de uso de gente de fuera, una lista de espera real o un pago.
6. **Claridad pesa solo 10%**, pero el jurado premia que expliquemos decisiones y tradeoffs. Hay que anotarlos mientras construimos.

---

## 3. Reglas de entrega y presentación (checklist)

- [ ] **Hora límite: domingo 18 de octubre, 09:00.** Sin URL pública, demo en vivo y repo en GitHub, no nos puntúan (ver §2, Paso 0).
- [ ] Una entrega por equipo. Cualquier integrante puede editarla; no hay permiso exclusivo de capitán.
- [ ] La **URL de la app desplegada** funciona en una ventana privada / incógnito, sin sesión y sin pedir accesos.
- [ ] **URL de la presentación** (Canva, Google Slides o una presentación hecha con código), accesible públicamente.
- [ ] **URL del repo en GitHub** (este repo, que debe hacerse público antes de entregar).
- [ ] **Descripción en Markdown**: separar "lo que ya funciona" de "ideas pendientes" (es obligatorio).
- [ ] Publicar en la bitácora después de decisiones importantes, pruebas con usuarios, demos y bloqueos. Luego se vuelve pública.
- [ ] **Nada de claves, tokens, códigos de créditos ni datos personales de terceros** en el repo, la bitácora o la descripción.
- [ ] Entregar **temprano** y actualizar después. Los cambios hechos cuando ya abrió la evaluación **no** llegan al jurado.
- [ ] Mantener la app y la presentación en línea durante la evaluación.
- Propiedad intelectual: lo que construimos es nuestro; el evento no se queda con los derechos.
- Conducta: pedir permiso antes de tomar fotos o grabar a alguien. Esto importa en las entrevistas: pedir consentimiento y anonimizar.

---

## 4. Herramientas y créditos que recibimos (todos los participantes)

| Sponsor | Qué es | Posible uso para nosotros |
|---|---|---|
| **Zavu** (3 meses Pro) | Una sola API para **WhatsApp, SMS, voz**, email y Telegram, más agentes de voz | Un bot de WhatsApp es la forma de llegar a los peruanos. Sirve para reenviar mensajes sospechosos o reportar extorsiones. |
| **ElevenLabs** (programa startups) | Síntesis y clonación de voz | Interfaz por voz para personas mayores, o una demo de estafas con voz clonada |
| **Tavily** | API de búsqueda para agentes | Verificar en tiempo real afirmaciones, números y URLs |
| **Apify** | Scraping / actores | Recolectar publicaciones de estafas, páginas falsas y avisos de Facebook Marketplace |
| **n8n** (1 semana Cloud Pro) | Automatización de flujos | Pegamento: alertas, escalar a la PNP o a la familia, dashboards |
| **Qatom** (6 meses Max) | Marketplace donde **agentes de IA encuentran, compran y usan APIs**, pagando por llamada (ver §4.1) | Publicar nuestra API (ej. "¿esto es estafa?") para que otros agentes la compren |
| **AtomicMemory Cloud** (5 meses Pro) | Memoria para agentes | Recordar números o patrones reportados por cada usuario |
| **Maritime** ($100) | Hosting / infraestructura para agentes | Despliegue |
| **Lovable** | Constructor de apps | Frontend rápido (pero el esfuerzo técnico necesita lógica propia por debajo) |

> Usar bien las herramientas de los sponsors puede impresionar a los jurados de los sponsors, pero solo si el uso es real.

### 4.1 Qatom: kit para Hack the Andes (⚠️ por confirmar)
- Repo: [StarwaterHeaven/qatom-hack-the-andes](https://github.com/StarwaterHeaven/qatom-hack-the-andes) (licencia MIT, creado el 7 de octubre de 2026). Lo encontró Cesar.
- **Todavía no sabemos** si es el kit oficial ni cuándo o cómo se espera que lo usemos. El repo no lo publica Qatom ni el evento con su nombre: lo publica una cuenta personal. Lo que sí está confirmado en la web del evento es que Qatom es sponsor y regala 6 meses de Qatom Max a cada participante.
- **Qué es Qatom:** un catálogo donde agentes de IA (Claude u otro cliente MCP) buscan servicios, pagan por llamada desde una wallet propia del agente y reciben la respuesta con recibo. Se conecta como MCP en `https://mcp.m.todaq.net/mcp`.
- **Qué trae el kit:** una plantilla de Cloudflare Worker para vender nuestra API en el catálogo (`template/`), ejemplos (rastreo de carga en México, video pagado) y una skill para convertir un repo en catálogo.
- **Por qué nos puede servir:**
  - **Complejidad técnica (30%)**: es una integración real con un sponsor (API + pagos + MCP).
  - **Extra +0,5**: la rúbrica da el bonus máximo por "un pago". Si otros agentes compran llamadas a nuestra API en Qatom, hay pagos reales visibles en registros.
  - **Pitch**: "otros agentes y apps pueden consultar nuestra base de estafas peruanas y pagar por llamada" es un modelo de negocio concreto.
- **Cuidado:**
  - Confirmar con la organización o con Qatom (Discord del evento) si este kit es el que recomiendan y si hay un premio o reto aparte.
  - Mueve dinero real (montos chicos, ej. 0.01). Nunca subir al repo tokens como `QATOM_FULFILMENT_TOKEN`.
  - No dejar que Qatom se vuelva el centro del proyecto: es un canal extra, no el producto.

### 4.2 Regla: mencionar a los sponsors (idea de Cesar)
En el pitch, en el README de la entrega y en la descripción, **nombrar qué sponsors usamos y para qué**, solo si de verdad los usamos. Ejemplo: "WhatsApp con Zavu · búsqueda con Tavily · pagos por llamada con Qatom". Los sponsors suelen estar en el jurado o en el público.

---

## 5. El problema: Perú 2026 (con cifras)

### 5.1 Extorsión: el problema de seguridad n.º 1 del Perú
- **12,634** denuncias por extorsión y chantaje entre **enero y junio de 2026** (Ministerio Público), unas 1,053 al mes. **13,892** hasta julio.
- **26,217** denuncias entre agosto de 2025 y julio de 2026, más de **5 veces** la cifra de 2021 (IPE). Los presos sentenciados *bajaron* de 712 a 650.
- Zonas críticas: **Lima Este (1,638)**, La Libertad (1,435), Lima Centro (1,309), Lima Norte (1,163), Lima Sur (1,155).
- **Transporte:** **más de 80 conductores asesinados y 160 atentados** contra buses en Lima y Callao en 2026 (La República, 4 de octubre). Hubo 107 atentados hasta mediados de julio, lo mismo que en todo 2025.
- **Subregistro:** de 83 empresas afectadas, solo **27 denunciaron antes de sufrir un atentado**. La razón principal es el **miedo a represalias**.
- Efecto económico: transportistas y comerciantes **suben precios** para cubrir los cupos.
- Canales del Estado: **Central 111** (anónima, 24/7), números de WhatsApp de la PNP, 105 para emergencias y bloqueos de OSIPTEL (1.5 millones de celulares bloqueados; en febrero de 2026 se propuso un decreto contra las "líneas fantasma"). Brechas: poca confianza, miedo, evidencia dispersa, sin seguimiento, y las víctimas no saben qué hacer en la primera hora.

### 5.2 Estafas digitales y billeteras: Yape / Plin
- **Más de 21,000** reportes de ciberdelitos ligados a IA, Yape y WhatsApp en 2026, **+120%** frente al año anterior (estimación de un especialista, Infobae, agosto 2026; no es cifra oficial).
- Cerca del **90%** de los casos de fraude informático pasan por cuentas de billeteras digitales (atribuido a la división de cibercrimen de la PNP; fuente secundaria).
- Primer trimestre de 2025: **7,206** denuncias por fraude informático y unas **3,000** por suplantación de identidad (las cifras oficiales se quedan cortas).
- Yape + Plin concentran **más del 67%** de las transacciones digitales (BCRP, fuente secundaria).
- Modalidades comunes:
  - **"Yape falso"**: una app clonada que muestra una pantalla de pago falsa. Se vende en Telegram y apunta a **bodegueros** y comerciantes.
  - **Comprobantes falsos y QR adulterados**: pegan un QR falso encima del verdadero.
  - **Phishing** que imita a bancos o billeteras (la principal puerta de entrada para las mypes).
  - **Duplicado de SIM** para recibir los códigos SMS.
  - **Suplantación por WhatsApp** ("hola mamá, cambié de número…") y **clonación de voz con IA** de familiares.
- Regla práctica para comerciantes: verificar el pago en **tu propia** app, nunca en la pantalla del cliente. Muchos no lo hacen porque están ocupados.

### 5.3 Suplantación
- Clonación de voz, números de WhatsApp clonados, llamadas falsas del banco o de la policía, y mensajes falsos de "SUNAT / Reniec / courier".
- En Latinoamérica, el informe Fraud Beat 2026 de AppGate describe el fraude como una cadena industrial que va de las redes sociales al retiro de efectivo, con crecimientos de hasta **228%** en algunos países. También menciona identidades sintéticas y deepfakes que se vuelven rutina.
- Group-IB encontró más de 97 dominios fraudulentos contra cuatro grandes marcas latinoamericanas en un solo año.

### 5.4 Desinformación
- Ciclo de las elecciones generales 2026: el **JNE registró 704 alertas de desinformación** en 11 meses, el 65% entre diciembre de 2025 y enero de 2026. Después vino una crisis postelectoral.
- La desinformación electoral **no es un delito específico** en el Perú. Se propuso un proyecto de ley contra los deepfakes (PL 13975/2025); no está confirmado si avanzó.
- **6 millones de votantes jóvenes**, muy expuestos a contenido viral en TikTok y WhatsApp.
- El JNE tiene un monitoreo de fact-checking con IA y el correo factchecking@jne.gob.pe. A la gente le falta una forma **rápida y dentro de WhatsApp** de verificar un audio, una imagen o un video reenviado.
- La desinformación también alimenta la extorsión y las estafas: "alertas" falsas y avisos policiales falsos.

### 5.5 Contexto regional (Latinoamérica)
- Brasil: el mecanismo **MED** de Pix devuelve dinero a víctimas de estafas, y hay un proyecto de ley para bloquear, rastrear y reembolsar fraudes por Pix. Es un precedente para un "MED de Yape/Plin".
- Colombia: debates sobre préstamos ligados a suplantación de identidad. La región se mueve hacia **reglas de reembolso** como las del Reino Unido o Australia.
- Las estafas crecen más rápido en Latinoamérica que en el resto del mundo (BioCatch). Los criminales apuntan a los consumidores, que están menos protegidos.
- Lo que funcione para Yape / Plin en bodegas del Perú se traslada a **Pix (Brasil), Nequi / Daviplata (Colombia) y Mercado Pago (México / Argentina)**. Esa es la slide de "escala en Latinoamérica".

---

## 6. Personas que podemos entrevistar *hoy* (usuario real del track + bonus de tracción)

| Persona | Dolor | Dónde encontrarla en 30 h |
|---|---|---|
| **Bodeguero / bodeguera** | Pantallas falsas de Yape, cambio de QR, cupos de extorsión | Cualquier bodega cerca del local |
| **Chofer de combi, bus o mototaxi** | Cupos, amenazas, atentados, "permisos" de ruta | Paraderos, grupos de transportistas en WhatsApp / Facebook |
| **Papá o mamá mayor (50+)** | Estafas "hola mamá", voces clonadas, llamadas falsas del banco | Nuestras propias familias (¡llámenlos!) |
| **Votante joven / estudiante** | Fake news virales, deepfakes en TikTok | Participantes del hackathon, grupos de la universidad |
| **Vendedor online** (Marketplace / IG) | Comprobantes falsos, compradores falsos, contracargos | Facebook Marketplace, tiendas de IG |
| **Gerente de empresa de transporte** | Tiene que decidir si denuncia; teme represalias | Asociaciones de transportistas (más difícil en 30 h) |

Guion de entrevista (5 min): *¿Qué pasó la última vez? ¿Qué hiciste en la primera hora? ¿Cuánto te costó? ¿A quién le contaste? ¿Qué usarías o pagarías?* Anotar citas textuales y pedir consentimiento. Anonimizar.

---

## 7. Filtro para evaluar ideas (alineado a la rúbrica oficial)

| Criterio (peso) | Pregunta |
|---|---|
| Complejidad (30%) | ¿Tiene integraciones, datos, modelos y una arquitectura de verdad? |
| Funciona (25%) | ¿Podemos tener el flujo completo en vivo desde una URL pública en ~20 h? |
| Calidad (20%) | ¿Podemos dejar un repo limpio y entendible a tiempo? |
| Problema (15%) | ¿Conseguimos hoy un usuario real del track que lo confirme? |
| Claridad (10%) | ¿Las decisiones y tradeoffs se explican fácil? |
| Extra (+0,5) | ¿Gente de fuera lo puede usar y volver a usar antes del pitch? |
| Seguridad | ¿Evita poner en riesgo a las víctimas (represalias, filtración de datos)? |

---

## 8. Fuentes
- Evento: [hacktheandes.com](https://hacktheandes.com/) · [Guía para equipos](https://hacktheandes.com/guide) · [Condiciones de entrega](https://hacktheandes.com/participation-terms) · [Términos](https://hacktheandes.com/terms)
- Extorsión: [RPP: más de 12,000 denuncias en el primer semestre 2026](https://rpp.pe/peru/actualidad/ministerio-publico-informo-que-mas-de-12-000-denuncias-por-extorsion-se-registraron-en-el-primer-semestre-de-2026-noticia-1697877) · [Canal N: 12,600 en el semestre](https://canaln.pe/actualidad/ministerio-publico-reporta-mas-12600-denuncias-extorsion-primer-semestre-2026-n493520) · [Swissinfo: 13,000 entre enero y julio](https://www.swissinfo.ch/spa/per%C3%BA-registra-m%C3%A1s-de-13.000-denuncias-por-extorsi%C3%B3n-entre-enero-y-julio-de-2026/91995447) · [El Comercio: de 4,761 a 26,217](https://elcomercio.pe/peru/extorsion-denuncias-pasan-de-4761-a-26217-pero-presos-sentenciados-bajan-de-712-a-650-apuesplan-noticia/) · [La República: más de 80 conductores asesinados](https://larepublica.pe/sociedad/2026/10/04/extorsion-al-transporte-en-lima-y-callao-deja-mas-de-80-conductores-asesinados-y-160-atentados-en-2026-376216) · [Caretas: más de 60 choferes](https://caretas.pe/sociedad/extorsion-en-el-peru-mas-de-60-choferes-fueron-asesinados-en-lo-que-va-del-2026-segun-la-pnp/) · [Infobae: suben precios por los cupos](https://www.infobae.com/peru/2026/03/31/pnp-alerta-aumento-de-extorsiones-en-lima-transportistas-y-comercios-suben-precios-por-cobros-ilegales/) · [Infobae: 2,000 casos a febrero](https://www.infobae.com/peru/2026/02/20/peru-supera-los-2000-casos-de-extorsion-en-lo-que-va-de-2026-lima-y-la-libertad-concentran-la-mayoria-de-los-casos/)
- Canales del Estado: [Central 111](https://canaln.pe/actualidad/central-111-contra-extorsiones-ha-recibido-188-llamadas-n477223) · [1.5 millones de celulares bloqueados](https://caretas.pe/?p=769466) · [Decreto contra líneas fantasma](https://panamericana.pe/buenosdiasperu/locales/465099-adios-llamadas-fantasma-decreto-legislativo-propone-bloquear-numeros-usados-extorsiones) · [Cómo denunciar](https://lpderecho.pe/como-denunciar-llamadas-extorsionadoras/)
- Estafas: [Infobae: voz con IA y comprobantes falsos](https://www.infobae.com/peru/2026/08/19/ciberdelitos-con-inteligencia-artificial-suplantacion-de-voz-y-comprobantes-falsos-el-nuevo-riesgo-en-yape-y-whatsapp/) · [Scamwatch: Yape/Plin 2026](https://scamwatchhq.com/peru-scams-2026-yape-digital-wallet-fraud/) · [Reevalua: estafas comunes](https://reevalua.com/blog/estafas-yape-plin-como-evitar-peru) · [Business Empresarial: mypes](https://www.businessempresarial.com.pe/pymes-peruanas-fraude-via-whatsapp-y-suplantacion-de-yape-son-las-modalidades-mas-utilizadas-por-ciberdelincuentes/)
- Desinformación: [CEPLAN: 704 alertas](https://observatorio.ceplan.gob.pe/ficha/tg60) · [Infobae: 700 alertas del JNE](https://www.infobae.com/peru/2026/03/05/elecciones-2026-en-medio-de-fake-news-jne-detecta-700-alerta-de-desinformacion/) · [Fact checking del JNE](https://factchecking.jne.gob.pe/) · [El Comercio: proyecto contra deepfakes](https://elcomercio.pe/politica/actualidad/elecciones-2026-congresista-carlos-anderson-presenta-proyecto-para-prevenir-la-desinformacion-electoral-y-sancionar-deepfake-noticia/) · [Caretas: jóvenes e IA](https://caretas.pe/sociedad/ia-y-fake-news-en-elecciones-2026-academia-y-expertos-trazan-ruta-contra-la-desinformacion/)
- Latinoamérica: [AppGate Fraud Beat 2026](https://lanotaeconomica.com.co/movidas-empresarial/el-informe-fraud-beat-2026-de-appgate-revela-la-industrializacion-del-fraude-digital-en-latinoamerica/) · [BioCatch: estafas en LatAm](https://www.biocatch.com/blog/scams-in-latin-america-what-the-data-really-tells-us) · [Contxto: fraude con IA en LatAm](https://contxto.substack.com/p/ai-driven-frauds-are-growing-in-latin) · [ITSitio: predicciones 2026](https://www.itsitio.com/ch/seguridad/cinco-predicciones-que-marcaran-el-fraude-y-el-acceso-seguro-en-latinoamerica-en-2026/)

> ⚠️ Algunas cifras vienen de prensa o de fuentes secundarias. En el pitch digan "según el Ministerio Público / IPE", y no presenten las estimaciones de especialistas como cifras oficiales.
