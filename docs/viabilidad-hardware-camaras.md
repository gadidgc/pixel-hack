# Viabilidad técnica del hardware: cámaras para Juntas Vecinales

> Investigación del sábado 17 de octubre de 2026, 15:37 · Pedido de Gabriel: "las cámaras son lo más importante".
> Complementa el [playbook de la comunidad](playbook-juntas-vecinales.md).
> Precios en soles de tiendas peruanas (referenciales, verificar antes de comprar). Las cifras en dólares son de fuentes de EE. UU.

---

## Resumen (lo que hay que saber en 1 minuto)

1. **Es viable y barato** usar cámaras en un barrio peruano. Una cámara WiFi de exterior con visión nocturna cuesta **S/ 80–260**, y una "caja de IA" que analiza **4–5 cámaras** a la vez cuesta unos **S/ 900**. Flock Safety, el referente de EE. UU., cobra unos **US$ 2500 por cámara al año**.
2. **El cuello de botella no es la cámara, es todo lo demás:** luz, internet, mantenimiento y seguridad informática. En Lima, la Contraloría encontró **10,9% de las cámaras municipales inoperativas** (2025). A nivel nacional, entre 20% y 29% según el operativo.
3. **No hay que mandar video a la nube.** Una cámara en vivo gasta cientos de GB al mes. La IA tiene que correr **en el barrio** (en el borde) y subir **solo eventos**: "moto, 7:42 pm, foto y clip de 20 s".
4. **Leer placas es posible pero difícil**, sobre todo de noche y en motos. El mejor estudio peruano llega a un mAP@50 de 0,896 con YOLOv10n + PaddleOCR, pero no publica cifras separadas para noche ni para motos. **"Moto sin placa" se detecta como atributo**, y es justo el caso que más reportan los vecinos.
5. **Ya hay precedente en el Perú:** en **Trujillo**, cada estación municipal monitorea en promedio unas **40 cámaras de vecinos** instaladas en fachadas de casas y negocios. Miraflores tiene 565 cámaras con IA y apunta a 2400 a fines de 2026.
6. **Para el hackathon (quedan ~17 horas):** no compramos hardware. La demo usa **celulares como cámaras** y, si alguien tiene una Tapo, **una cámara real por RTSP** procesada en una laptop.

---

## 1. Las cámaras: qué comprar o qué aprovechar

### 1.1 Lo que ya existe en el barrio
La forma más barata es **aprovechar las cámaras que vecinos y bodegas ya tienen**. Es el modelo de Trujillo. El costo es cero en cámaras, pero son de marcas, calidades y ángulos distintos.

### 1.2 Precios en el Perú (Sodimac y Mercado Libre, referenciales)

| Tipo | Ejemplos | Precio aprox. | Comentario |
|---|---|---|---|
| WiFi exterior genérica 2 MP | Buypal | **S/ 80** | Barata, calidad y firmware dudosos |
| WiFi exterior 2K–3 MP | Ezviz H8C, IMOU Cruiser, Tapo C520WS | **S/ 155–199** | Buena relación calidad/precio; Tapo e IMOU soportan RTSP/ONVIF (verificar el modelo) |
| WiFi exterior doble lente | Ezviz H9c, IMOU Cruiser Dual 8 MP | **S/ 249–259** | Más cobertura |
| Kit solar + batería (sin cable de luz) | Tapo C660 kit 4K | **~S/ 495** | Para postes o fachadas sin enchufe; todavía necesita WiFi |
| Solar + 4G (sin luz ni internet) | Varias marcas | **No encontré precio en soles** | En Chile, entre CLP 183 000 y 273 000. Hay que sumar el plan de datos. |
| Kit DVR con cable (4–8 cámaras 1080p) | Hikvision y otros | **S/ 519–659** (4 cámaras) | Para un comercio; graba en disco local |

### 1.3 Requisitos mínimos de una cámara útil
- **Resolución 2K (3–4 MP) o más**, y el lente correcto: una cámara gran angular de 2 MP no lee una placa a más de unos pocos metros.
- **Visión nocturna (IR)**. Las placas reflectivas con IR "se queman" y salen blancas; la IR ayuda a ver formas y movimiento, no siempre a leer.
- **RTSP u ONVIF** (los protocolos estándar para sacar el video). Sin eso, la cámara solo funciona en la app del fabricante y no podemos analizarla.
- **Altura y ángulo:** para placas, a unos 2–3 m de altura, mirando la calle en diagonal, no de frente desde arriba.

---

## 2. La IA en el barrio (procesamiento en el borde)

### 2.1 Por qué no se puede mandar todo a la nube
- Un stream 1080p en H.264 usa unos **2–4 Mbps continuos**: entre **650 GB y 1,3 TB al mes por cámara**. Ningún internet de casa ni plan 4G aguanta eso para varias cámaras. *(Cálculo propio a partir de bitrates típicos.)*
- Un **clip de 20 s** a 2 Mbps pesa unos **5 MB**. Subir solo eventos cabe en cualquier conexión.

### 2.2 Opciones de hardware de IA

| Equipo | Potencia | Precio (dólares, EE. UU.) | Rendimiento | Comentario |
|---|---|---|---|---|
| **Raspberry Pi 5 + AI HAT+ (Hailo-8L)** | 13 TOPS | HAT ~US$ 70 + Pi 5 | Corre YOLOv8s; con Frigate analiza **4–5 cámaras** en tiempo real (benchmark de un tutorial) | **La opción recomendada** para una cuadra o un pasaje |
| Raspberry Pi 5 + AI HAT+ (Hailo-8) | 26 TOPS | ~US$ 110 + Pi 5 | YOLOv8n a 136 FPS, YOLOv8m a 50–60 FPS | Para más cámaras |
| Raspberry Pi AI HAT+ 2 (Hailo-10H) | 40 TOPS | ~US$ 130 + Pi 5 | YOLOv8m a más de 60 FPS | Lanzado en enero de 2026 |
| NVIDIA Jetson Orin Nano Super | 67 TOPS | ~US$ 249 | Excelente para YOLO (no encontré FPS medidos) | Más potente y más caro; consume 7–25 W |
| Google Coral (USB) | 4 TOPS | ~US$ 35 | ~400 FPS en MobileNetV2 | **Riesgo:** Google lo tiene casi abandonado |

### 2.3 Software: Frigate (open source)
- **Frigate** es un grabador de video (NVR) open source con detección de objetos local. Funciona con **cualquier cámara RTSP u ONVIF** (Hikvision, Dahua, Tapo, Reolink…), soporta **Hailo y Coral**, y graba solo cuando detecta un objeto en una zona ("persona en la puerta de la bodega", "moto en la esquina").
- Publica eventos por **MQTT**, y nosotros los tomamos para subirlos a la plataforma.
- ⚠️ Su API (puerto 5000) **no tiene autenticación**: nunca debe quedar expuesta a internet.

### 2.4 Costo de una "caja de IA" por cuadra (estimación propia)

| Pieza | Aprox. |
|---|---|
| Raspberry Pi 5 (8 GB) | ~US$ 80 |
| AI HAT+ 13 TOPS | ~US$ 70 |
| SSD, case, fuente y tarjeta | ~US$ 40 |
| UPS pequeño (aguanta cortes de luz) | ~US$ 40 |
| **Total** | **~US$ 230 ≈ S/ 860** |

Si además hay que comprar 4 cámaras de S/ 150–200, una cuadra cuesta **~S/ 1500–1700 una sola vez**. Flock Safety cobra **~US$ 2500 por cámara al año** (en alquiler) y en EE. UU. tiene polémicas por instalar sin permisos y por la privacidad.

---

## 3. Placas (ALPR): qué se puede y qué no

- **Cómo funciona:** un detector (YOLO) encuentra la placa, la recorta, y un OCR lee los caracteres (fast-plate-ocr o PaddleOCR). FastALPR junta los dos y es open source.
- **Precisión publicada:**
  - Un estudio peruano (UPeU) con YOLOv10n + PaddleOCR llegó a mAP@50 = 0,896 en escenarios de día, de noche y con varios vehículos, aunque **no separa la noche**.
  - fast-plate-ocr reporta 94% en placas **argentinas** recortadas.
  - **No encontramos cifras publicadas para motos, de noche, con IR, en Latinoamérica.** Habría que medirlo con video propio y probablemente reentrenar.
- **Las motos son lo más difícil:** placa chica, solo atrás, a veces doblada o tapada.
- **El hallazgo útil:** muchos reportes vecinales son de **"moto sin placa"**. Eso **no requiere leer nada**: se detecta "moto + sin placa visible" como atributo, junto con el color y si van dos personas. Es más robusto que el OCR.
- **Línea roja: sin reconocimiento facial.** Es de alto riesgo, se equivoca con personas inocentes y choca con la regla "conductas, no personas". Solo vehículos y objetos.

---

## 4. Lo que realmente falla: mantenimiento y operación

| Problema | Qué pasa en la realidad | Cómo lo mitigamos |
|---|---|---|
| **Cámaras malogradas** | 10,9% inoperativas en Lima (Contraloría, 2025); 20–29% a nivel nacional | La caja de IA hace un **"latido"**: si una cámara deja de mandar video, avisa al coordinador ("cámara de Jr. Lima caída hace 2 días") y el mapa muestra las **zonas ciegas** |
| **Cortes de luz** | Frecuentes en algunos distritos | UPS en la caja de IA; cámaras solares donde no hay enchufe |
| **Internet caído** | WiFi del vecino que se apaga o cambia de clave | La caja guarda los eventos y los sube cuando vuelve la conexión |
| **Lentes sucios, telarañas, árboles** | La imagen se degrada sin que nadie lo note | Detección automática de imagen borrosa u obstruida, y alerta |
| **Robo o vandalismo de la cámara** | Ocurre | Altura, soportes antivandálicos; la caja queda **adentro** de una casa |
| **¿Quién paga y quién mantiene?** | La junta no tiene presupuesto | Modelo mixto: vecinos y bodegas ponen sus cámaras; la municipalidad o un aporte por cuadra paga la caja de IA (S/ 860 entre ~20 casas ≈ **S/ 43 por casa**, una vez) |
| **El grabador sobrescribe el video** | Se pierde la evidencia en días | La plataforma pide el clip **apenas** hay un caso 🟠/🔴 (ver el playbook) |

---

## 5. Seguridad informática (crítico)

Las cámaras baratas son una de las puertas de entrada más comunes para los hackers:
- **Hikvision:** en septiembre de 2025 hubo una ola de ataques contra cámaras viejas usando **CVE-2017-7921**, una falla corregida hace 8 años que sigue sin parche en muchos equipos expuestos a internet.
- **Dahua:** en 2025, Bitdefender reportó **CVE-2025-31700 y CVE-2025-31701**, que dan control total sin contraseña (ya tienen parche). Hay reportes de DVR tomados con la clave por defecto **root/root** para botnets.
- **La mayoría de los ataques** usan contraseñas por defecto, firmware viejo y puertos abiertos a internet.

**Nuestro diseño:**
1. **Las cámaras nunca se exponen a internet.** La caja de IA las lee por la **red local**.
2. **Solo conexiones de salida:** la caja se conecta a nuestra nube (por ejemplo con una VPN como WireGuard). Nadie abre puertos en el router del vecino.
3. **Checklist de instalación:** cambiar la contraseña por defecto, actualizar el firmware y desactivar el acceso remoto del fabricante si no se usa.
4. **Nunca guardamos las contraseñas** de las cámaras en la nube.

---

## 6. Marco legal en el Perú (resumen, no es asesoría legal)

- **DL 1218** (y su reglamento, **DS 007-2020-IN**): regula las cámaras en espacios públicos, el transporte público y los comercios con aforo de 50 personas o más, y **obliga a entregar las grabaciones** a la PNP o al Ministerio Público cuando se presume un delito.
- **Ley 29733 de Protección de Datos Personales** (reglamento DS 016-2024-JUS): la imagen de una persona es un **dato personal**.
- **Directiva de videovigilancia** de la Autoridad Nacional de Protección de Datos (RD 02-2020-JUS/DGTAIPD, enero de 2020): regula el tratamiento de datos por videovigilancia. **No confirmamos** su plazo de conservación ni lo que exige en carteles. Hay que leer el texto antes del pitch.
- **Principios para nuestro diseño:** proporcionalidad (enfocar la calle o la fachada propia, no la ventana del vecino), cartel de "zona videovigilada", conservar solo los clips de casos, borrar al cerrar el caso, y nada de reconocimiento facial.

---

## 7. Precedentes

| Dónde | Qué | Lección |
|---|---|---|
| 🇵🇪 **Trujillo** | Estaciones municipales que monitorean cámaras **de vecinos** (~40 por estación); más de 1000 cámaras en 2026 | **El modelo ya existe en el Perú.** Nosotros agregamos los reportes humanos, la IA y el playbook |
| 🇵🇪 Miraflores | 565 cámaras con IA, meta de 2400 a fines de 2026 | Los municipios ya compran IA: podemos integrarnos, no competir |
| 🇵🇪 Lima (MML) | ~1000 cámaras, meta de 4500 conectadas a un centro C5 | Futura integración por convenio |
| 🇺🇸 Flock Safety | Cámaras de placas solares con LTE para barrios; ~US$ 2500 por cámara al año | Funciona, pero es caro y polémico por privacidad. Nuestro diferencial: barato, comunitario y con líneas rojas |
| 🇨🇱 SOSAFE | App vecinal con 5 millones de usuarios (cifra propia) y convenio con Carabineros | El reporte humano escala; las cámaras no son imprescindibles |

---

## 8. Veredicto de viabilidad

| Pieza | ¿Viable hoy? | Nota |
|---|---|---|
| Mapa de cámaras de vecinos y pedido de clips | ✅ **Sí** | Sin hardware nuevo |
| Analizar clips subidos (vehículo, color, moto sin placa) | ✅ **Sí** | YOLO en la nube; solo se procesan clips cortos |
| Leer placas de autos de día | 🟡 **Parcial** | Depende de la cámara y el ángulo; hay que medirlo |
| Leer placas de motos de noche | 🔴 **No confiable** | Sin cifras publicadas; requiere datos propios |
| Caja de IA en vivo (Pi 5 + Hailo + Frigate) | 🟡 **Piloto** | Viable técnicamente; el reto es la instalación y el mantenimiento |
| Cámaras solares 4G donde no hay luz ni internet | 🟡 **Piloto** | Existen; falta precio local y el costo de datos |
| Reconocimiento facial | ⛔ **No** | Línea roja (legal y ética) |

---

## 9. Qué hacemos en el hackathon (~17 horas)

1. **"Tu celular viejo es una cámara":** una página web que usa la cámara del celular (`getUserMedia`) y sube clips con detección de movimiento. Funciona **desde la URL pública** ✔ y es la demo en vivo.
2. **Si alguien del equipo tiene una Tapo, Ezviz o IMOU:** se lee por RTSP con YOLO en una laptop, para mostrar que funciona con hardware real. No hace falta comprar nada.
3. **Analizar clips en la nube:** detectar vehículo, color y "moto sin placa", con un intento de leer placas solo como "indicio".
4. **Contar la arquitectura de escala con una diapositiva:** caja Pi 5 + Hailo + Frigate por cuadra, ~S/ 860, comparada con Flock Safety.
5. **Para la rúbrica:**
   - **Complejidad (30%):** visión por computadora + reportes + patrones + playbook es una "arquitectura no trivial".
   - **Funciona (25%):** si la demo usa video **real** del barrio grabado hoy, no de juguete, sube a 4–5.
   - **Claridad (10%):** este documento es la explicación de decisiones y tradeoffs.

---

## Fuentes
- Precios en el Perú: [Sodimac: cámaras de seguridad](https://www.sodimac.com.pe/sodimac-pe/category/cat10718/C%C3%A1maras-de-Seguridad-y-monitores) · [Sodimac: interiores](https://www.sodimac.com.pe/sodimac-pe/lista/CATG15595/Camaras-de-Seguridad-Interiores) · [Mercado Libre: PTZ 360](https://listado.mercadolibre.com.pe/camara-ptz-360) · [Mercado Libre: Tapo C460 solar](https://www.mercadolibre.com.pe/shorts/clips/skT3F6/camara-wifi-tp-link-tapo-c460-kit-4k-uhd-8mp-con-panel-solar) · [Ficha de cámara solar 4G](https://alas-la.org/wp-content/uploads/2026/02/BN8037-4GS_ESP.pdf) · [Lider Chile: cámara solar 4G](https://www.lider.cl/ip/smart-home/camara-solar-4g-exterior-doble-lente-bajo-consumo/00046919486567)
- IA en el borde: [Jeff Geerling: AI Kit](https://jeffgeerling.com/blog/2024/testing-raspberry-pis-ai-kit-13-tops-70) · [Raspberry Tips: AI HAT+](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-ai-hat-plus-ai-acceleration) · [DataRoot Labs](https://datarootlabs.com/blog/hailo-ai-kit-raspberry-pi-5-setup-and-computer-vision-pipelines) · [Comparativa Coral, Jetson y Pi 2026](https://www.aimadetools.com/blog/google-coral-vs-nvidia-jetson-vs-raspberry-pi-ai-2026/) · [Frigate con el AI Kit](https://raspberry.tips/en/raspberrypi-tutorials/raspberry-pi-ai-kit-frigate-object-detection) · [Guía de Frigate](https://github.com/theNetworkChuck/frigate-nvr-guide)
- Placas: [Estudio peruano de ALPR (UPeU)](https://repositorio.upeu.edu.pe/bitstreams/310d9afc-b2ec-4813-916c-4d5d1d7f3e7b/download) · [fast-plate-ocr](https://pypi.python.org/pypi/fast-plate-ocr) · [FastALPR](https://pypi.org/project/fast-alpr/0.1.0) · [LiteALPR](https://huggingface.co/anhone3/LiteALPR)
- Cámaras inoperativas: [Canal N: Contraloría](https://canaln.pe/actualidad/contraloria-729-camaras-y-537-vehiculos-inoperativos-n482709) · [Expreso](https://www.expreso.com.pe/actualidad/contraloria-revela-fallas-criticas-en-seguridad-mas-de-700-camaras-y-500-vehiculos-inoperativos-en-lima-metropolitana-y-callao-comas-los-olivos-san-juan-de-lurigancho-noticia/1183100/) · [Caretas](https://caretas.pe/?p=756961) · [DPL News](https://dplnews.com/?p=135250) · [Panamericana](https://panamericana.pe/nacionales/341713-casi-30-camaras-videovigilancia-peru-encuentran-inoperativas-informo-contraloria)
- Seguridad informática: [Field Effect: Hikvision](https://fieldeffect.com/blog/legacy-hikvision-vulnerability-resurfaces) · [Daily Security Review: Dahua](https://dailysecurityreview.com/podcasts/iot-security-crisis-dahua-smart-camera-vulnerabilities-expose-surveillance-systems/) · [Aviatrix: botnet en DVR Dahua 2026](https://aviatrix.ai/threat-research-center/dahua-dvr-2026-default-credentials-botnet-compromise) · [CISA: Dahua 2017](https://www.cisa.gov/ics/advisories/ICSA-17-124-02)
- Legal: [LP Derecho: videovigilancia y privacidad](https://lpderecho.pe/seguridad-vigilancia-incontrolada-desafio-proteger-privacidad/) · [Congreso: normativa aplicable](https://www.congreso.gob.pe/Docs/spa/files/resoluciones/2025/088.pdf) · [IAPP: directiva de videovigilancia](https://iapp.org/news/a/se-aprueba-y-publica-la-directiva-para-el-tratamiento-de-datos-personales-mediante-sistemas-de-videovigilancia-en-peru) · [Hiperderecho: comentarios a la directiva](https://hiperderecho.org/wp-content/uploads/2019/11/hiperderecho_videovigilancia.pdf) · [LP Derecho: Indecopi](https://lpderecho.pe/no-es-obligatorio-que-establecimientos-comerciales-tengan-sistema-de-videovigilancia-resolucion-0246-2021-sel-indecopi/)
- Precedentes: [Andina: Trujillo](https://andina.pe/agencia/noticia-seguridad-ciudadana-mas-mil-camaras-seran-los-ojos-trujillo-durante-2026-1057687.aspx) · [Caretas: Miraflores con IA](https://caretas.pe/?p=781182) · [Expreso: MML](https://www.expreso.com.pe/actualidad/mml-refuerza-la-seguridad-ciudadana-con-244-camaras-amplia-sistema-de-vigilancia-con-nuevo-centro-de-control-municipalidad-metropolitana-de-lima-noticia/1213609/) · [Canal N: meta de 4500 cámaras](https://canaln.pe/amp/actualidad/renzo-reggiardo-armas-no-letales-y-camaras-corporales-seran-usados-serenazgo-desde-este-domingo-n491174) · [Flock: precios](https://getsafeandsound.com/blog/flock-safety-pricing/) · [Spot AI: Flock](https://www.spot.ai/blog/flock-safety-pricing-2026) · [Carmel: informe sobre Flock](https://carmelresidents.org/assets/docs/2025_Feb4_Tomasi%20Flock%20Council%20Report.pdf) · [SOSAFE](https://sosafeapp.com/about)
