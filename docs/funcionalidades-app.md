# Funcionalidades de la app: robo de celular, bloqueo y extorsión

> Propuesta de Cesar (sábado 17 de octubre de 2026), trabajada con Claude. **Es un borrador para que el equipo decida.**
> Parte de la investigación de Gabriel: [docs/viabilidad-deteccion-arrebato-moto.md](./viabilidad-deteccion-arrebato-moto.md).
> Lo marcado como *estimación* o *hipótesis* no está comprobado. Lo que viene de blogs, foros o prensa está marcado como fuente secundaria.
> **Todavía no hay entrevistas a personas de fuera del equipo.**

---

## 1. Resumen en 1 minuto

1. **Google ya bloquea el celular** cuando detecta un arrebato, pero casi nadie lo tiene activado o lo conoce, y **solo bloquea: no avisa a nadie**.
2. Las herramientas que existen (Google, el operador, OSIPTEL, el banco, WhatsApp, la PNP) están **separadas**. En pánico, nadie se acuerda de las 6.
3. Nuestra app cubre **3 problemas**: (1) el **robo** del celular, (2) el **bloqueo** del celular, y (3) la **extorsión**: reportar mensajes y números.
4. **La estrella:** detectar sola el arrebato en moto y mandar al toque la ubicación y la ruta de huida a la familia.
5. **Para los robos que los sensores no ven** (carterista, descuido, a mano armada): botón **"Me robaron" desde el celular de un amigo**, que activa todo en segundos.
6. **La app nunca bloquea ni le responde al extorsionador.** Junta los reportes de muchas víctimas y arma un expediente para la autoridad, que es quien puede suspender la línea.

---

## 2. Lo que ya existe y por qué casi no se usa

### 2.1 La protección antirrobo de Google (Android 10 o más nuevo)
En **Ajustes → Google → Todos los servicios → Protección antirrobo** (en algunos celulares está en Seguridad y privacidad):

| Función de Google | Qué hace |
|---|---|
| **Bloqueo por detección de robo** | Con los sensores y la IA detecta que alguien arranchó el celular y se fue corriendo, en bici o en carro, y bloquea la pantalla. |
| **Bloqueo sin conexión** | Si el ladrón corta el internet varias veces, el celular se bloquea solo. |
| **Bloqueo remoto** | Desde otro celular, en **android.com/lock**, se bloquea la pantalla **solo con el número de teléfono** (más una pregunta de seguridad opcional). Tiene que estar activado **antes** del robo. |

Solo sirve si el celular tiene PIN, patrón o huella.

### 2.2 Por qué la gente no usa estas herramientas

| Razón | Fuente |
|---|---|
| **No saben que existen.** El 23% de quienes no usan una app de seguridad móvil dijo que ni sabía que existía. | Encuesta de Bitdefender (empresa que vende antivirus: fuente interesada) |
| **Hay que activarlas antes del robo**, y nadie se prepara. | *Hipótesis* |
| **Falsas alarmas.** Hay quejas de que el bloqueo de Google se activó al trotar o en el bus. En otra prueba tuvieron que simular varios robos antes de que se activara. | Foros y Android Authority (fuente secundaria) |
| **Desconfianza** hacia apps que piden muchos permisos. | *Hipótesis* |
| **No resuelven el problema de fondo:** el celular igual se pierde y la víctima no sabe qué hacer en la primera hora. | [CONTEXT.md](../CONTEXT.md) §5 |
| **Están separadas:** una app para bloquear, otra para ubicar, otra para denunciar. | *Hipótesis* |

### 2.3 Apps parecidas en el Perú, en Sudamérica y en el mundo

| App | Dónde | Qué hace | Lección para nosotros |
|---|---|---|---|
| **Lima Segura** | Lima | Reportar robos a la municipalidad | Existe, pero casi nadie la conoce |
| **Alerta Chorrillos** y otras municipales | Distritos de Lima | Botón para avisar al serenazgo | Cada distrito tiene la suya; están fragmentadas |
| **Reach** | Perú (startup) | "Waze de los robos": mapa de incidentes | 20 mil usuarios en 2018; no sabemos si sigue activa |
| **Bloqueo de IMEI (OSIPTEL)** | Perú | El operador bloquea el celular en todas las redes del país | Funciona, pero solo si la víctima se acuerda de llamar |
| **SOSAFE** | Chile | El "Citizen de Sudamérica": reportes de vecinos que llegan a Carabineros y a la municipalidad | Anunció su llegada al Perú, pero no encontramos que esté funcionando acá |
| **Celular Seguro** ⭐ | Brasil (gobierno) | **Un botón** bloquea la línea, el celular y las apps del banco. Una persona de confianza puede activarlo por ti. Más de 3 millones de usuarios. | **La que más se usa es la que junta todo en un solo lugar** |
| **Citizen** | EE. UU. | Red social de alertas de delitos | Polémica: genera miedo y gente que persigue por su cuenta |
| **Life360** | Mundo | Ubicación de la familia | |
| **Prey** | Nació en Chile | Antirrobo: ubica el celular | |
| **Truecaller** | Mundo | Identifica y bloquea llamadas de spam | Parecido a nuestro historial de números, pero sin enfoque en extorsión |

**Lo que no encontramos** (búsqueda rápida, hay que revisar mejor antes del pitch): ninguna app que **detecte sola el arrebato en moto y avise al toque a la familia**.

---

## 3. Tipos de robo de celular y cuáles detectamos

Diferencia legal: **hurto** es sin violencia (Código Penal, art. 185); **robo** es con violencia o amenaza (art. 188).

| Grupo | Tipo | ¿La app lo detecta sola? |
|---|---|---|
| Arrebato | **En moto** | ✅ **Sí: es nuestro caso** |
| Arrebato | En bicicleta | 🟡 Quizás (velocidad más baja) |
| Arrebato | A pie, corriendo | 🟡 A veces (Google sí lo cubre) |
| Arrebato | Por la ventana del bus, la combi o el carro ("bujiazo") | 🟡 Hay jalón; depende de cómo huya |
| Sin que te des cuenta | Carterista ("lanza") | ❌ |
| Sin que te des cuenta | Descuido (mesa, asiento, cargando) | ❌ |
| Sin que te des cuenta | Multitudes (conciertos, Metropolitano) | ❌ |
| Con amenaza | A mano armada | 🟡 Solo si huyen en moto; si no, PIN de emergencia o botón |
| Con amenaza | Cogoteo | 🟡 Difícil de separar de una caída |
| Con amenaza | En taxi o colectivo | ❌ |
| Con amenaza | "Peperas" (te drogan la bebida) | ❌ |
| Con engaño | Falso comprador de Marketplace, "¿me prestas tu celular?" | 🟡 Si se va en moto |
| Sin tocar el celular | Duplicado de chip | ❌ Es otro problema |

**Todo lo que tiene ❌ se cubre con el botón "Me robaron" desde otro celular** (§4.4).

**Dato que nos falta:** no encontramos qué porcentaje de los robos en el Perú son arrebato en moto. Hay **728 493 celulares reportados como robados** en el primer semestre de 2025 (RENTESEG/OSIPTEL), con picos a las 10 a. m. y a las 7 p. m., pero sin separar por tipo. En Londres, los robos **sin violencia** son unas 4 veces más que los robos **con violencia** (2022-23), pero ese grupo también incluye arrebatos. **Hay que preguntarlo en las entrevistas.**

---

## 4. Funcionalidades para el hackathon

Todo en una **app web (PWA)** que se abre desde una URL pública. La detección solo funciona **con la pantalla prendida** (ver la investigación de Gabriel, §3).

### 4.1 Registro (onboarding)
| # | Función |
|---|---|
| 1.1 | **Contactos de confianza:** se agregan a mano. |
| 1.2 | **Datos del celular:** IMEI (marcando `*#06#`), marca y operador. La web no puede leer el IMEI sola: lo escribe la persona. |
| 1.3 | **PIN normal y PIN de emergencia** de la app (mejor si son distintos al PIN de pantalla). |
| 1.4 | **Checklist "prepara tu celular":** activar la protección antirrobo de Google, el **Bloqueo remoto**, "Encontrar mi dispositivo" y el PIN de pantalla. |
| 1.5 | **Forma de entrar sin el celular:** DNI o correo + PIN o contraseña (ver §4.4). |

### 4.2 Detección automática del arrebato ⭐
| # | Función |
|---|---|
| 2.1 | **Activar protección:** la app empieza a leer los sensores con la pantalla prendida. |
| 2.2 | **Detecta el jalón** con el acelerómetro y el giroscopio. |
| 2.3 | **Confirma la huida:** velocidad de moto (más de 15 km/h) casi al mismo tiempo que el jalón. |
| 2.4 | **Descarta las falsas alarmas:** caídas, tirar el celular a la mochila, subirse a un mototaxi, correr. |
| 2.5 | **Botón de pánico manual**, por si la detección falla. |

### 4.3 Alerta a la familia
| # | Función |
|---|---|
| 3.1 | **Aviso inmediato:** *"⚠️ Posible robo, confirmando..."* |
| 3.2 | **Ubicación en vivo** cada 1 o 2 segundos, desde el primer segundo. |
| 3.3 | **Ruta de huida y velocidad** en el mapa. |
| 3.4 | **Alerta silenciosa:** el celular no suena (sonar puede provocar violencia). |
| 3.5 | **Cancelar con PIN** si fue falsa alarma (ver §5). |
| 3.6 | **PIN de emergencia:** parece que se canceló, pero la alerta sigue en secreto. |
| 3.7 | **Mensaje de seguridad para la familia:** *"No lo persigas. Llama al 105."* |

### 4.4 "Me robaron" desde otro celular
Para todos los robos que los sensores no detectan.

1. Entras a nuestra página desde el celular de un amigo o desde una computadora.
2. Te identificas **sin código por SMS**, porque **el SMS llegaría al celular robado**. Opciones: DNI + PIN, correo + contraseña, o **tu contacto de confianza lo activa por ti** con su propia cuenta (idea tomada de Celular Seguro de Brasil).
3. Aprietas **"🔴 Me robaron"** y la app avisa a la familia, cambia el estado a "Robado" y te muestra los pasos de §4.5.

### 4.5 La primera hora: bloquear todo
**Nuestra app no bloquea directamente:** Google, los operadores y los bancos no dan esa conexión a cualquier app. Lo que hace es **llevarte a cada uno en un toque, con tus datos listos**.

| Qué se bloquea | Quién lo bloquea | Cómo ayuda la app |
|---|---|---|
| La pantalla (Android) | Google, en android.com/lock | Botón que abre la página. Solo funciona si el Bloqueo remoto ya estaba activado. |
| La pantalla (iPhone) | Apple, en icloud.com/find | Botón que abre la página |
| La línea y el IMEI | El operador. Con el reporte, el celular queda bloqueado en todas las redes del país (OSIPTEL) | Botón para llamar al operador + IMEI y número en pantalla para dictarlos |
| WhatsApp | Soporte de WhatsApp | Botón con el correo listo (**hay que confirmar** el procedimiento actual) |
| Yape y el banco | El banco | Botón para llamar al banco |
| La denuncia | PNP | Datos listos: hora, lugar, IMEI, última ubicación |
| Tus contactos | La app (por WhatsApp con Zavu, disponible el domingo 18) | *"Me robaron el celular. Si te piden plata desde mi número, NO soy yo."* |

### 4.6 Reportar extorsión
| # | Función |
|---|---|
| 6.1 | **Pegar el mensaje** que llegó, o **reenviarlo al bot de WhatsApp** (Zavu). La app **no lee** las llamadas ni los chats: la persona elige qué compartir. |
| 6.2 | **La IA lo analiza:** tipo (cupo, amenaza con fotos de la familia, préstamo falso, estafa) y datos (número, cuenta de Yape o Plin, monto y plazo). |
| 6.3 | **Qué hacer ahora:** no responder, guardar las pruebas, llamar a la Central 111, denunciar. |
| 6.4 | **El mismo analizador detecta estafas** (Yape falso, premio falso): mismo código, cubre otra área del track. |

### 4.7 Historial de números
| # | Función |
|---|---|
| 7.1 | **Buscar un número:** *"Reportado por 10 usuarios en Ate."* Cada usuario ve no solo su reporte, sino todo lo que hizo ese número con otros. |
| 7.2 | **Solo se muestra con 3 reportes o más** de personas distintas, para que nadie "queme" el número de otra persona. |
| 7.3 | **Número tapado en público** (999 *** 123). |
| 7.4 | **Cuentas de Yape o Plin repetidas:** *"Esta cuenta aparece en 5 extorsiones con 3 números distintos"*: es la misma banda cambiando de chip (versión simple de [Cupo Cero](./fase-1/members/cesar/cupo-cero-resumen.md)). |
| 7.5 | **Expediente para la autoridad:** número, cuántas víctimas, fechas y cuentas, listo para que la PNP y el Ministerio Público pidan a OSIPTEL suspender la línea. |
| 7.6 | **Estado de mis reportes:** reportado → 3 víctimas → expediente listo → línea suspendida. |

### 4.8 Dashboard (panel)
| # | Función |
|---|---|
| 8.1 | **Estado del celular (semáforo):** 🟢 Protegido · 🟡 Posible robo · 🔴 Robado · ⚫ Bloqueado · 🔵 Recuperado. Sale de lo que detecta la app y de los pasos que marca la persona, **no de leer el celular**. |
| 8.2 | **Avance del bloqueo:** *"3 de 6 listos"*. La familia también lo ve y ayuda. |
| 8.3 | **Línea de tiempo del robo** y **última ubicación conocida** (*"se apagó a las 14:05 en Av. Grau"*). |
| 8.4 | **Gráfico de sensores en vivo:** se ve la curva del jalón (para el jurado). |
| 8.5 | **Mapa de incidentes por tipo:** 🏍️ robo · 📩 extorsión · ⚠️ otro. Sin datos de las víctimas. |
| 8.6 | **Tiempo hasta que apagan el celular:** promedio de todos los robos. **Un dato que hoy nadie tiene en el Perú.** |
| 8.7 | **"Lo recuperé"** para cerrar el caso. |

### 4.9 Herramientas del equipo (por detrás)
| # | Función |
|---|---|
| 9.1 | **Modo "grabar":** guarda los datos de los sensores en CSV con su etiqueta. |
| 9.2 | **Modo "repetir":** el detector analiza una grabación real paso a paso, para la demo. |
| 9.3 | **Modo demo:** umbral de velocidad bajo para simular corriendo frente al jurado. **Se dice con honestidad en el pitch.** |
| 9.4 | **Tabla de aciertos:** *"Con 40 grabaciones detectó 18 de 20 robos y tuvo 2 falsas alarmas"* (números de ejemplo). |
| 9.5 | **Contador de uso:** cuántas personas de fuera la usaron (prueba para el +0,25 extra). |

---

## 5. Cómo funciona "cancelar con PIN"

```
1. La app detecta el jalón
        ↓
2. AL TOQUE manda a la familia: "⚠️ Posible robo, confirmando..."
   y empieza a mandar la ubicación cada 1-2 segundos
        ↓
3. En la pantalla: "¿Fue un error? Escribe tu PIN para cancelar" (30 s)
        ↓
   ┌──────────────────────────┬───────────────────────────────┐
   │ PIN correcto (el dueño)  │ Nadie pone el PIN (el ladrón) │
   ↓                          ↓
   "✅ Falsa alarma"           "🚨 ROBO CONFIRMADO"
   Se deja de mandar          + ubicación y ruta en vivo
   la ubicación               + checklist de la primera hora
```

- **¿Por qué un PIN y no un botón "estoy bien"?** Porque el ladrón también podría apretar el botón.
- **¿Por qué avisar antes de que pongan el PIN?** Porque el ladrón puede apagar el celular en segundos. Es mejor avisar primero y corregir después.
- **PIN de emergencia:** si obligan a la víctima a cancelar, pone el segundo PIN. El ladrón ve "Alerta cancelada", pero la alerta sigue y la familia recibe *"🚨 lo están obligando a cancelar"*.
- **Si el ladrón cierra la app o apaga el celular,** no puede cancelar, pero tampoco llega más ubicación. Lo que se mandó hasta ese momento ya le llegó a la familia.
- Los **30 segundos** son una *estimación*: hay que ajustarlos con las grabaciones.

---

## 6. Extorsión: ¿por qué la app no bloquea al extorsionador?

**Pregunta que hará el jurado:** *"¿No es peligroso bloquear al extorsionador?"*

- Sí puede serlo: si la víctima lo bloquea sola, el extorsionador se entera de que lo ignoró y puede tomar más medidas.
- La PNP y el Mininter recomiendan **no responder, guardar las pruebas, denunciar y mantener reserva**.
- **El bloqueo de verdad ya lo hace el Estado:** en noviembre de 2025, OSIPTEL ordenó suspender **3766 líneas** a pedido de la PNP y el Ministerio Público. El Mininter también anunció el bloqueo del **equipo completo**, no solo del chip. Lo que falta es que alguien les lleve los casos bien armados.

**Respuesta para el jurado:**
> *"La app nunca bloquea ni le responde al extorsionador. Junta los reportes de muchas víctimas del mismo número. Cuando hay 3 o más, arma un expediente listo para que la PNP y el Ministerio Público pidan a OSIPTEL suspender la línea. Como reportan 10 personas, el extorsionador no sabe quién fue. Denuncia el grupo, no la persona."*

**Datos de extorsión para el pitch** (Ministerio Público, vía prensa):
- Unas **12 600 denuncias** entre enero y junio de 2026: unas **70 al día**.
- Zonas con más denuncias: **Lima Este**, La Libertad, Lima Centro, Lima Norte y Lima Sur. Las cifras por zona cambian según la fuente (Lima Este aparece con 1638 o con 1806): usar la más prudente.
- El **38%** de las personas en Lima recibió por WhatsApp algún mensaje con fines de extorsión o fraude (Gestión).
- Alrededor de **1 condena por cada 76 denuncias** (RPP con datos del Poder Judicial, ver [Cupo Cero](./fase-1/members/cesar/cupo-cero-resumen.md)).

---

## 7. Lo que sigue (no entra en la demo)

| Función | Por qué no ahora |
|---|---|
| Detectar con la pantalla apagada (app nativa de Android) | Una app web no puede |
| Detectar que el celular se aleja de tu reloj o tus audífonos | Necesita Bluetooth: solo en app nativa |
| Detectar que **otra persona** lleva el celular (forma de caminar) | Existe en investigación, pero es muy difícil |
| Detectar cambio de chip o modo avión | Solo en app nativa |
| Aviso al entrar a una zona peligrosa | Necesita muchos reportes primero |
| "Viaje seguro": avisar si no llegas en X minutos | Más pantallas |
| Reporte descargable para la denuncia | Si sobra tiempo |
| Mapa de calor por calles y horas | Necesita muchos datos |
| Envío al serenazgo | Necesita un convenio con la municipalidad |
| **Convenios con operadores, bancos y OSIPTEL** para que un solo botón bloquee todo de verdad | Es lo que hizo Celular Seguro en Brasil |
| Alerta a vecinos cercanos | Riesgo de que persigan al ladrón |

## 8. Lo que NO tendrá
- **Cámara ni foto del ladrón:** problemas legales (datos personales).
- **Alarma que suena:** puede provocar violencia.
- **Leer las llamadas o los chats de WhatsApp:** WhatsApp no lo permite, Google Play solo deja leer el historial de llamadas a la app de teléfono principal y una página web no puede. Además, da desconfianza.
- **Bloquear al extorsionador desde la app:** es peligroso; lo hace la autoridad.
- **Red social completa tipo Citizen** (comentarios, perfiles, seguidores): no alcanza el tiempo. Solo el mapa con el tipo de incidente.

## 9. Si falta tiempo, se recorta en este orden
1. Historial de números (§4.7).
2. Reportar extorsión (§4.6).
3. Mapa de incidentes (8.5).

**No se tocan:** la detección (§4.2), la alerta a la familia (§4.3) y la primera hora (§4.4 y §4.5).

---

## 10. Riesgos y cómo taparlos

| Riesgo | Cómo lo tapamos |
|---|---|
| **Abarcar demasiado** (robo + bloqueo + extorsión + mapa) | Orden de recorte de §9. Mejor 10 funciones que anden perfecto que 30 a medias. |
| **La demo no puede ser en moto** y puede parecer trampa | Decirlo con honestidad y mostrar una grabación real de un arrebato simulado en bici (modo "repetir"). |
| **Solo funciona con la pantalla prendida** | Preguntar a las víctimas si les robaron mientras usaban el celular. |
| **Falsas alarmas** | Dos condiciones juntas (jalón + velocidad de moto) y cancelar con PIN. ⚠️ En Lima la gente sube a la combi en movimiento: hay que probarlo. |
| **El ladrón apaga el celular en segundos** | La ubicación se manda desde el primer segundo. |
| **No tenemos datos** | Grabar hoy (caminar, caídas, taxi, arrebato simulado en bici). Nunca delante de una moto real. |
| **Nadie de fuera entrevistado** | Según Cesar, los integrantes del equipo hemos sido víctimas de robo de celular: cada uno escribe su caso. Igual hace falta **al menos 1 víctima de fuera** (vale 15% de la nota). |
| **La familia persigue al ladrón** | Mensaje *"No lo persigas. Llama al 105."* |
| **Alguien reporta un número inocente** | Mínimo 3 reportes de personas distintas y número tapado en público. |
| **Datos personales** | Nada de llamadas ni chats; el mapa sin datos de las víctimas. Revisar la Ley 29733 de Protección de Datos Personales. |

## 11. Preguntas para las entrevistas
- *¿Cómo te robaron?* (mostrar la lista de §3 y que elijan).
- *¿Tenías el celular en la mano y la pantalla prendida?*
- *¿Cuánto tardó el celular en apagarse o desaparecer de "Encontrar mi dispositivo"?*
- *¿Sabías que existe el bloqueo por robo de Google? ¿Lo tenías activado?*
- *Después del robo, ¿qué hiciste primero? ¿Sabías qué hacer?*
- *¿Te escribieron a tus contactos desde tu número pidiendo plata?*
- *¿Qué apps de seguridad tienes o tuviste? ¿Por qué dejaste de usarlas?*
- *¿A quién habrías querido avisar en ese momento?*
- *(Extorsión) ¿Te llegó algún mensaje de extorsión? ¿Lo bloqueaste? ¿Denunciaste?*

**Evidencia que nos haría cambiar de opinión:** si la mayoría de las víctimas fueron carteristas y no arrebatos, o si dicen que sí sabían qué hacer después del robo.

## 12. Frases para el pitch
- *"Google bloquea tu celular. Nosotros avisamos a tu familia."*
- *"Si te arranchan el celular en moto, la app lo detecta sola. Para cualquier otro robo, entras desde el celular de un amigo y en 10 segundos se activa todo."*
- *"Hoy tienes que acordarte de 6 lugares para bloquear todo, y en pánico nadie se acuerda. Nosotros los juntamos en uno."*
- *"Es como Celular Seguro de Brasil, pero se activa solo."*
- *"La app nunca bloquea al extorsionador. Denuncia el grupo, no la persona."*

## 13. Pendientes por confirmar
- [ ] Números oficiales de Movistar, Claro, Entel y Bitel para reportar un robo (sacarlos de sus webs, no inventarlos).
- [ ] Procedimiento actual de WhatsApp para desactivar la cuenta de un celular robado.
- [ ] Porcentaje de robos por tipo en el Perú (tablas del INEI/ENAPRES o entrevistas).
- [ ] Si ya está vigente la ley para que las víctimas pidan bloquear líneas de extorsionadores.
- [ ] Que el equipo apruebe qué funciones entran.

---

## Fuentes
- Protección antirrobo de Android: [Google: android.com/lock](https://android.com/lock) · [Android Authority: Bloqueo remoto](https://www.androidauthority.com/android-remote-lock-3601241) · [Android Authority: prueba del bloqueo por robo](https://www.androidauthority.com/android-theft-detection-lock-test-3491674/) · [Android Authority: falla en Android 15](https://androidauthority.com/android-15-theft-detection-lock-glitch-3541557) · [Droid Life](https://www.droid-life.com/2024/10/07/androids-theft-protection-and-remote-lock-start-rolling-out/) · [Beebom](https://beebom.com/androids-theft-detection-feature-turning-onautomatically-several-users/amp/) · [Tech Advisor](https://www.techadvisor.com/article/3145647/android-theft-protection-5-minutes-to-secure-your-phone.html)
- Por qué no se usan: [Bitdefender](https://www.bitdefender.com/blog/hotforsecurity/top-reasons-why-consumers-shun-mobile-security-apps/) · [Alkaldi y Renaud](https://strathprints.strath.ac.uk/75118)
- Permisos de Google Play: [Permisos sensibles](https://support.google.com/googleplay/android-developer/answer/9888170) · [SMS y llamadas](https://support.google.com/googleplay/android-developer/answer/9047303)
- Apps parecidas: [RPP: Lima Segura](https://rpp.pe/lima/actualidad/motociclistas-reportaran-delitos-a-traves-del-aplicativo-lima-segura-noticia-1609566) · [Perú21: Alerta Chorrillos](https://peru21.pe/noticias/aplicativo/3/) · [iProUP: Reach](https://www.iproup.com/startups/123-tecnologia-dise%C3%B1o-emprendedor-Peru-una-startup-crea-el-Waze-de-los-robos-callejeros) · [Pauta: SOSAFE](https://www.pauta.cl/ciudad/2023/10/04/sosafe-llega-a-tribunales-ahora-los-medios-digitales-son-validos-para-una-denuncia.html) · [DF: SOSAFE](https://www.df.cl/df-mas/punto-de-partida/el-despegue-internacional-de-sosafe-con-miras-a-ee-uu-y-mexico) · [Chilevisión: SOSAFE](https://www.chilevision.cl/noticias/aplicacion-gratuita-ha-permitido-a-los-vecinos-mejorar-los-tiempos-de-respuesta-de-carabineros/) · [Jornal de Brasília: Celular Seguro](https://jornaldebrasilia.com.br/noticias/brasil/celular-seguro-20-mil-aparelhos-sao-bloqueados-apos-envio-de-alertas/) · [Metrópoles: Celular Seguro](https://www.metropoles.com/brasil/app-do-governo-bloqueia-38-mil-celulares-em-1-semana-veja-como-usar)
- Robo de celulares: [La República: 728 493 robos en 2025](https://larepublica.pe/sociedad/2025/07/15/osiptel-de-enero-a-junio-se-reportaron-728493-robos-de-telefonos-celulares-1118310) · [La República: más de un millón de bloqueados en 2026](https://larepublica.pe/sociedad/2026/05/12/osiptel-mas-de-un-millon-de-celulares-bloqueados-en-2026-robo-de-celulares-hnews-821352) · [RPP: horas con más robos](https://rpp.pe/campanas/valor-compartido/robo-de-celulares-en-peru-a-las-10-am-se-reportan-la-mayor-cantidad-de-casos-noticia-1653754) · [El Peruano: bloqueo de celulares](https://elperuano.pe/noticia/289851-osiptel-inicia-hoy-tercer-bloqueo-de-celulares-no-registrados-y-con-historial-negativo) · [Expreso: víctimas de robo 2023](https://www.expreso.com.pe/actualidad/inei-revela-alarmantes-cifras-mas-de-3-millones-fueron-victimas-de-robos-en-2023-madre-de-dios-lima-metropolitana-noticia/1113484/) · [Southwark News: Londres](https://southwarknews.co.uk/?p=58859) · [LBC: Londres 2024](https://www.lbc.co.uk/news/uk/phone-theft-epidemic-uk-europes-hotspot)
- Extorsión: [Expreso: 12 mil denuncias](https://www.expreso.com.pe/actualidad/mas-de-12-mil-denuncias-por-extorsion-en-el-primer-semestre-del-2026-las-cifras-reflejan-70-casos-diarios-y-casi-tres-cada-hora-mp-noticia/1302327/) · [Infobae: 12 mil en seis meses](https://www.infobae.com/peru/2026/07/18/mas-de-12-mil-denuncias-por-extorsion-se-registraron-en-peru-en-solo-seis-meses-segun-el-ministerio-publico/) · [América TV: 14 mil casos](https://www.americatv.com.pe/noticias/actualidad/fiscalia-reporta-14-mil-casos-extorsion-2026-n522272) · [Gestión](https://gestion.pe/noticias/extorsion/) · [Panamericana: OSIPTEL suspende 3700 líneas](https://panamericana.pe/24horas/locales/458910-osiptel-ordena-suspender-3-700-lineas-telefonicas-vinculadas-extorsiones) · [Canal N: apagón de líneas y equipos](https://canaln.pe/actualidad/malaver-no-se-puede-desmerecer-esfuerzo-ejecutivo-n487261) · [Correo: bloqueo a pedido de víctimas](https://diariocorreo.pe/politica/congreso-aprueba-medida-para-que-victimas-soliciten-bloquear-lineas-usadas-por-extorsionadores-pnp-noticia/) · [El Peruano: recomendaciones](https://www.elperuano.pe/noticia/216147-campana-yo-no-caigo-en-la-extorsion-yo-denuncio-revisa-estas-recomendaciones) · [gob.pe: denunciar llamadas extorsionadoras](https://www.gob.pe/573-denunciar-llamadas-extorsionadoras) · [RPP: qué hacer si eres víctima](https://rpp.pe/lima/policiales/lo-que-debes-hacer-si-eres-victima-de-extorsion-noticia-920778)
