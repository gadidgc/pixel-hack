# Guion de la demo en vivo (propuesta de Cesar)

> **Borrador para discutir en equipo.** Nada de esto está ensayado todavía.
> Objetivo: que el jurado **vea un robo en vivo** y **vea llegar el aviso**, cumpliendo las reglas del evento.

---

## 1. Las reglas que tenemos que cumplir

De la hoja oficial "Cómo se evalúa a los equipos" ([rubrica-oficial.pdf](rubrica-oficial.pdf), **Paso 0**):

| Requisito | Qué dice la hoja |
|---|---|
| URL pública | "Desplegado. Localhost no cuenta." |
| **Demo en vivo** | "**Slides o video grabado no cuentan.**" |
| Código en GitHub | "El repo se entrega con la URL." |
| Hora límite | Domingo 18, 09:00. "**Si falta uno, el equipo no se puntúa.**" |

Y en **Funciona (25%)**: "El flujo completo corre en vivo desde la URL pública". 3 = "Corre con datos de juguete"; **5 = "Datos reales y aguanta preguntas fuera del guion"**.

Formato del pitch: **3 min + 2 min de preguntas**, en la computadora de la organización ([CONTEXT.md](../CONTEXT.md) §1).

Qué significa para nosotros:
- La demo **tiene que ser en vivo**. Solo capturas o un video = no nos puntúan.
- Un video corto **además** de la demo en vivo, como apoyo en las slides, debería estar permitido (la regla dice que no *cuenta como* demo). *Es nuestra interpretación: confirmarlo con la organización.*

---

## 2. Quién hace qué

| Rol | Quién | Qué hace |
|---|---|---|
| Víctima y presentador | Cesar | Habla con el celular en la mano, pantalla prendida, como si mirara un mapa |
| "Ladrón" | Mauricio | Arrancha el celular y sale corriendo por un costado de la sala |
| "Mi red" (la familia) | Piero | Recibe el WhatsApp en su celular y lo lee en voz alta |
| Pantalla | Gabriel | Maneja la laptop de la organización con la URL pública proyectada |

---

## 3. Antes de subir (checklist)

**Celular de Cesar (la app):**
- [ ] Protección activa ("Estás protegida").
- [ ] **Modo demo prendido** (Tú → Herramientas del equipo → Modo demo).
- [ ] **"Mi red" = Piero** (Tú → Mi red). Nunca un familiar real: el mensaje llega de verdad.
- [ ] "Tiempo para responder ¿Todo bien?" en **10 s**.
- [ ] Batería cargada, celular **en funda**.
- [ ] Internet propio (datos o hotspot), no el Wi-Fi del local.

**Laptop de la organización:**
- [ ] La URL pública abierta y proyectada (ver pendiente 1 en §7).
- [ ] La URL escrita en las slides para escribirla rápido.

**Celular de Piero:**
- [ ] WhatsApp abierto y con sonido.

**Sala:**
- [ ] Camino despejado para que Mauricio salga corriendo. Nada de empujones: el jalón es al celular, no a la persona.

---

## 4. Lo que ve el jurado, segundo a segundo

| Momento | Qué pasa |
|---|---|
| **0:00 – 0:30** | Cesar presenta el problema (cifra oficial e historia de un usuario real) con el celular en la mano. En la pantalla: protección activa. |
| **0:30** | **Mauricio arrancha el celular con un giro de muñeca y sale corriendo** sin parar unos 5–8 s. |
| **0:31 – 0:33** | La app detecta el jalón y la huida. |
| **0:33 – 0:43** | Cesar: *"La app le pregunta al celular '¿Todo bien?'. Si fuera yo, pongo mi PIN. Pero lo tiene el ladrón."* Corre la cuenta de 10 s. |
| **0:43** | **Sale el aviso:** a Piero le llega el WhatsApp con el enlace y lo lee en voz alta. En la pantalla grande, la página del contacto con el punto del robo en el mapa. |
| **0:45 – 1:30** | Cómo funciona: acelerómetro + giroscopio + GPS. Validado con **datos reales** de terceros ([validacion-datos-reales.md](validacion-datos-reales.md)). Frase honesta obligatoria: *"En la demo la huida corriendo cuenta; en la calle el detector exige velocidad de moto."* |
| **1:30 – 3:00** | Usuario real entrevistado, qué quedó fuera (por ejemplo, iPhone con la pantalla apagada), sponsors que usamos de verdad y cierre. |

**Por qué el detector puede alertar bajo techo** (umbrales del modo demo en [config.ts](../packages/detector/src/config.ts)):
- **Jalón:** pico de más de 1,2 g **y** un giro rápido en menos de medio segundo. Hay que tirar con decisión y girar la muñeca.
- **Huida:** energía de alguien **corriendo** (no caminando). Si el "ladrón" se detiene apenas jala, el detector lo toma como una caída y descarta.
- **Sin GPS:** en modo demo alerta solo con los sensores (confianza media).

---

## 5. Preguntas del jurado (2 min): que lo prueben ellos

Para el 5 en "Funciona" ("aguanta preguntas fuera del guion"):
- *"¿Y si se me cae?"* → Herramientas → Simular → "Se cae al piso": **no** alerta.
- *"¿Y si subo a un mototaxi?"* → Simular → "Subir a un mototaxi": **no** alerta.
- *"¿Y si voy en mi moto y paso un bache?"* → Simular → "Bache en tu moto": **no** alerta.
- Hay que decir que son **simulaciones**, no grabaciones reales.
- Mejor aún: **darle el celular a un jurado** para que lo deje caer sobre una mochila o un cojín y vea que no salta.

---

## 6. Si el robo en vivo no alerta (plan B)

Si en ~5 s no pasa nada, Cesar dice con calma: *"Bajo techo a veces no lo agarra; miren el mismo flujo con un robo real que grabamos afuera"* y aprieta **"Reproducir robo real"** (ver pendiente 2 en §7).

⚠️ **Regla de honestidad:** nadie aprieta un botón **a escondidas** mientras se actúa el robo. El botón solo se usa **abiertamente** como plan B. Si el jurado lo nota, perdemos toda la credibilidad.

---

## 7. Pendientes para que esta demo exista

| # | Quién | Qué |
|---|---|---|
| 1 | Gabriel | **No hay una URL fija para tener abierta antes del robo.** El enlace del contacto (`/api/alertas/<id>`) se crea recién cuando hay alerta y llega por WhatsApp. Opciones: una vista de "panel de demo" que muestre la última alerta del celular de Cesar, o que Piero abra el enlace en la laptop apenas llegue. Decidir cuál. |
| 2 | Gabriel | Botón **"Reproducir robo real"** en Herramientas: pasa un CSV real por el flujo completo ("¿Todo bien?" → WhatsApp → página del contacto). Hoy "Simular" solo muestra el resultado en pantalla y no avisa a nadie. |
| 3 | Gabriel | Confirmar que **Simular** se puede usar desde la URL pública en la laptop (para las preguntas). |
| 4 | Gabriel | La pantalla de bienvenida dice *"usamos un arrebato grabado"*, pero en el código es **simulado** (`servicio.probar()` usa `simular(...)`). Corregir el texto. |
| 5 | Mauricio | Esta noche: grabar **arrebatos en bici afuera** (con GPS) para el plan B, y **ensayar el robo a pie 10 veces** en un espacio parecido al del pitch. Grabar cada intento con la etiqueta `demo-a-pie`. **Meta: al menos 9 de 10.** |
| 6 | Piero | Ser "Mi red" y ensayar su parte. |
| 7 | Cesar | Guion hablado de los 3 min y la cifra oficial de robos de celular. Practicar con cronómetro. |

**Decisión con datos:** si el ensayo da 9/10 o más, hacemos el robo en vivo como está aquí. Si da menos, lo hablamos: o se ajusta el detector con las grabaciones, o el plan B pasa a ser la demo principal (sigue siendo en vivo, con datos reales grabados, y se dice).

---

## 8. Seguridad y privacidad

- **Nadie se pone delante de una moto.** Las pruebas son a pie o en bici, en un lugar vacío y con el celular en funda.
- Las grabaciones llevan la ubicación: **no empiecen a grabar en su casa** y no pongan nombres en los archivos.
- Si graban un video de apoyo, que no salgan caras de gente ajena.
