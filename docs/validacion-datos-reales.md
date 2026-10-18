# Validación con datos reales (no simulados)

> Sábado 17 de octubre de 2026, noche · Pedido de Gabriel: "asegúrate de que lo que estás probando es data real".
> Resumen: **el simulador nos estaba engañando en varias cosas.** Con datos reales encontramos 6 fallas y las corregimos.
> Todos los números de abajo vienen de grabaciones reales de terceros, salvo donde dice *simulación* o *semi-real*.

---

## 1. Resumen en 1 minuto

| Pregunta | Respuesta con datos reales | Fuente |
|---|---|---|
| ¿Detecta el **jalón** de un robo real? | **23 de 24** robos escenificados reales (96%): 6/6 de mano, 7/7 de cartera, 6/7 de bolsillo, 4/4 con el ladrón corriendo | Dataset SPU |
| ¿Cuántas **falsas alarmas** en la vida diaria? | **5 en 93 horas** de 3 personas con el celular **en la mano** (caminar, correr, bici, auto, bus, tren, metro). User2 y User3: **0 en 51 h** | Dataset SHL, 9 días |
| ¿Y en los días que **nunca** usamos para ajustar? | **0 en 24,4 h** (User3, 3 días, prueba a ciegas con la configuración congelada) | SHL |
| ¿Detecta un arrebato **completo** (caminar → jalón → huida en vehículo)? | **81,5–86,9%**, alerta a los **~4,5 s** | Prueba *semi-real*: empalme de 3 grabaciones reales |
| ¿Funciona sin GPS? | **No alerta automáticamente.** Con datos reales, alertar solo con sensores daba decenas de falsas alarmas por día | SHL y SPU |

**No existe ningún dataset público de arrebatos desde moto.** Lo buscamos a fondo (GitHub, Kaggle, Hugging Face, papers; ver §6). La validación final de la detección **tiene que hacerse con nuestras grabaciones** (PLAN §4.5).

---

## 2. Qué datos reales usamos

| Dataset | Qué es | Para qué lo usamos | Licencia |
|---|---|---|---|
| **SHL preview** (Sussex-Huawei Locomotion) | 3 personas, 9 días, 4 celulares a la vez. Usamos el **celular en la mano**: 100 Hz, acelerómetro, giroscopio y GPS (sin columna de velocidad), con la actividad anotada (quieto, caminar, correr, bici, auto, bus, tren, metro) | **Falsas alarmas** en la vida real (93 h) | Dominio público, con pedido de cita (Gjoreski et al., ACM SenSys 2017). Por eso podemos incluir recortes en el repo |
| **SPU Capstone** (github.com/collinlojane05-cloud/Capstone-Project-SPU-) | 46 sesiones de 5 a 20 s grabadas con un celular a ~42 Hz: robos escenificados (**arranchar de la mano, de la cartera, del bolsillo, salir corriendo**) y actividades normales. Sin GPS | **¿Se detecta el jalón?** | **Sin licencia**: lo usamos solo para validar, **no está en el repo** |
| US-TMD (Univ. de Bolonia) | 13 personas en bus, auto, tren, caminando, con velocidad GPS | **Descartado**: el acelerómetro solo registra 2–5 muestras por segundo y un jalón dura 0,1–0,5 s | Sin licencia indicada |
| Liu, Wagner y Egelman (UC Berkeley, 2018) | 120 robos escenificados + 3 semanas de 53 personas | **Solo el paper**: los datos no se publicaron | — |

Los datasets **no se suben al repo** (pesan ~1 GB por día y SPU no tiene licencia). Cada uno puede descargarlos (§7). En el repo solo hay **2 recortes reales de SHL** usados en las pruebas automáticas: `packages/detector/datos/reales/`.

---

## 3. Lo que el simulador hacía mal (y cómo lo corregimos)

| # | Lo que creíamos (simulador) | Lo que mostraron los datos reales | Qué cambiamos |
|---|---|---|---|
| 1 | Una mano quieta casi no se mueve: 0,008 g | La mano real de alguien parado mirando el celular varía **0,06–0,2 g** y gira hasta **2–5 rad/s** (SPU) | Recalibramos el simulador con esos valores |
| 2 | Sin GPS, el acelerómetro distingue "a pie" de "en vehículo" | Una mano quieta y la vibración de un vehículo se ven **iguales**. La regla descartaba **7 de 7** robos de bolsillo reales | **Eliminamos esa regla.** Solo el GPS dice si ya íbamos en vehículo |
| 3 | Los picos falsos son raros (~2 por hora) | Caminando con el celular en la mano hay **15 a 140 picos por hora**; corriendo, **más de 300** (SHL). Berkeley encontró lo mismo: ~220 picos de más de 4 g por persona al día | La confirmación de huida es la que tiene que filtrar. Por eso agregamos los arreglos 4 a 6 |
| 4 | — | **Auto parado en un semáforo**: la persona mueve el celular y el auto arranca. Para el detector, igual a un arranchón. **22 falsas alarmas en un día** | **Historial de vehículo**: si en los últimos 2 min hubo velocidad ≥ 11 km/h, seguimos "en vehículo". Además, **huida inmediata**: el ladrón ya viene rápido, así que la primera señal de huida debe llegar en ≤ 7 s; un auto que arranca de cero es más lento |
| 5 | Alertar sin GPS (con "confianza media") es útil | **18 falsas alarmas en 3,3 h** sin GPS (SHL), y 3 de 4 caídas de personas (SPU) | Sin GPS **ya no se alerta** automáticamente: solo se avisa "posible jalón" (salvo en modo demo) |
| 6 | Después de un pico, "quieto" = se cayó | Dentro de un auto o bus el celular en la mano también se ve quieto (SHL), y se descartaban robos reales | "Quieto" solo descarta si en **4 s** el GPS **no** muestra movimiento |
| 7 | — | Caminando, un pico falso **justo antes** del arranchón tapaba el pico verdadero, y su plazo de 7 s vencía | Un pico **nuevo** reinicia la cuenta, solo si el GPS aún no mostró movimiento |
| 8 | 40 m en 10 s = huida | En **bici** se hacen 40 m en 10 s (4 falsas alarmas) | El desplazamiento solo cuenta si la **velocidad promedio** también es de huida |

**Cómo evitamos "hacer trampa":** ajustamos con los días de User1 y User2 y **guardamos los 3 días de User3 sin mirarlos**. Con la configuración congelada, User3 dio **0 falsas alarmas en 24,4 h**. Después corregimos los puntos 6 y 7, que mejoran la detección, y volvimos a medir los 9 días: el resultado final es 5 falsas alarmas en 93 h, todas en días de User1.

---

## 4. Resultados finales (versión actual del detector)

### 4.1 Falsas alarmas en la vida real (SHL, celular en la mano, 9 días, 3 personas)
| Persona | Horas | Falsas alarmas | Dónde |
|---|---|---|---|
| User1 (3 días) | 33,1 | 5 | 3 en auto (arranca tras estar **más de 2 min** parado), 1 corriendo a ~20 km/h, 1 en bici (salto del GPS) |
| User2 (3 días) | 25,9 | 0 | — |
| User3 (3 días) | 24,4 | 0 | — |
| **Total** | **93,4** | **5** | ≈ **1 cada 19 h** de uso con el celular en la mano |

Actividades reales cubiertas: quieto, caminar, correr, bici (4,7 h), auto (8,5 h), bus, tren, metro.

### 4.2 Detección del jalón (SPU, robos escenificados reales, sin GPS)
| Tipo | Detectado el posible jalón |
|---|---|
| Arranchar de la mano | **6/6** |
| De la cartera | **7/7** |
| Del bolsillo | **6/7** |
| Ladrón corriendo | **4/4** |

Picos reales del jalón: **2,8–5,4 g** de aceleración total y **6,6–16 rad/s** de giro, por encima de nuestros umbrales (1,5 g y 4 rad/s). Berkeley midió más de 4 g en el 100% de sus 120 robos.

### 4.3 Arrebato completo semi-real (empalmes de grabaciones reales)
Cada caso une: **20 s caminando** (SHL, real) + **el jalón de un robo** (SPU, real) + **20 s de un vehículo en marcha** (SHL, real, con el GPS trasladado al lugar del robo). Son 13 jalones × 10 combinaciones = 130 casos.

| Variante | Detectados | Tiempo hasta la alerta |
|---|---|---|
| GPS sin velocidad (peor caso, como viene SHL) | **106/130 (81,5%)** | ~6 s |
| Con velocidad estimada de las posiciones reales | **113/130 (86,9%)** | mediana 4,5 s, p90 5,6 s |

**Limitaciones (decirlas siempre):** el vehículo es un auto o bus, no una moto (una moto vibra más, lo que ayuda); los empalmes tienen saltos de orientación; el jalón es de un robo a pie. Los celulares reales dan la velocidad por Doppler, más limpia que nuestra estimación, así que esperamos estar en el rango alto.

### 4.4 Simulación (para comparar)
98,8% de detección, 0% de falsas alarmas en escenarios trampa y 0,24 falsas alarmas por día simulado ([reportes/evaluacion.md](../packages/detector/reportes/evaluacion.md)). **Ya no es la medida principal**: los datos reales mandan.

---

## 5. Lo que aprendimos de Google, Apple y otros proyectos

- **Google "Theft Detection Lock"** (Android 10+, desde 2024) es **cerrado**: va dentro de Google Play services, no hay código en AOSP ni una patente que lo describa. Lo público:
  - Usa IA en el celular con sensores de movimiento.
  - **No se activa con Wi-Fi o Bluetooth estables** (en casa, la oficina o el auto).
  - Se pausa tras varias activaciones seguidas.
  - Solo bloquea la pantalla; no avisa.
- **Prueba de prensa** (Android Police, junio de 2026): solo bloqueó **2 de 6** arranchones. Hay quejas de bloqueos al trotar y en buses. Ni Google lo resolvió del todo.
- **Apple** prepara algo parecido ("AutoLock", visto en código de iOS 27.2 beta). Usa aceleración brusca + el reloj desconectado + vetos por "lugar conocido". No está publicado.
- **GitHub:** no hay ningún proyecto que use la velocidad de huida en vehículo; **esa es nuestra idea propia**. Los demás proyectos son umbrales simples o modelos entrenados con datos sintéticos.
  - El más serio es el código de Berkeley ([davidwagner/phone-theft-research](https://github.com/davidwagner/phone-theft-research)): sin datos y sin licencia.

**Qué copiar en la fase 2 (app nativa):** el veto por **Bluetooth del auto o Wi-Fi conocido** de Google. Eliminaría justamente nuestras falsas alarmas restantes en auto.

---

## 6. Qué falta y qué haría cambiar estos números

1. **Grabaciones nuestras de arrebatos simulados en bici** (PLAN §4.5): es la única forma de medir la detección completa con un jalón y una huida reales y con la velocidad Doppler del celular.
2. **Datos de moto:** no encontramos ninguno abierto. El de IIT Jodhpur ("Smartphone IMU and GPS", con dos ruedas) está tras una suscripción de IEEE DataPort.
3. **Celulares de gama baja peruanos:** SHL usó Huawei Mate 9 (2017). Hay que probar en Samsung A y Xiaomi.
4. **Más gente:** 3 personas en el Reino Unido no son Lima. Caminar por Gamarra o subir a una combi puede verse distinto.

---

## 7. Cómo reproducirlo

```bash
# SPU (3,5 MB): solo para validar, no subir al repo
curl -L -o sensor_data.csv https://raw.githubusercontent.com/collinlojane05-cloud/Capstone-Project-SPU-/main/sensor_data.csv
npm run validar-reales -w @pixel-hack/detector -- --spu sensor_data.csv

# SHL preview: 3 zips de ~2,5 GB en shl-dataset.org. Para no bajar todo, se pueden extraer solo
# User*/<día>/Hand_Motion.txt, Hand_Location.txt y Label.txt (por ejemplo con Python "remotezip").
npm run validar-reales -w @pixel-hack/detector -- --shl ruta/SHLDataset_preview_v1/User1/220617
npm run empalme-real -w @pixel-hack/detector -- --spu sensor_data.csv --shl ruta/User1/220617 --shl ruta/User2/180717 [--con-velocidad]

# Probar otros umbrales sin tocar el código:
npm run validar-reales -w @pixel-hack/detector -- --shl ruta/dia --config '{"huidaInmediataMs":8000}'
```

## Fuentes
- SHL Dataset: [shl-dataset.org](http://www.shl-dataset.org/) · [IEEE DataPort](https://ieee-dataport.org/documents/sussex-huawei-locomotion-and-transportation-dataset) · Gjoreski et al., ACM SenSys 2017.
- SPU Capstone: [GitHub](https://github.com/collinlojane05-cloud/Capstone-Project-SPU-).
- US-TMD: [cs.unibo.it/projects/us-tm2017](http://cs.unibo.it/projects/us-tm2017/) · [GitHub](https://github.com/vlomonaco/US-TransportationMode).
- Liu, Wagner y Egelman (2018), *Detecting Phone Theft Using Machine Learning*: [PDF](https://jasonxyliu.github.io/paper/phone-theft_iciss18.pdf) · [código](https://github.com/davidwagner/phone-theft-research).
- Google: [Keyword blog](https://blog.google/products/android/android-theft-protection/) · [Security blog](https://security.googleblog.com/2024/10/android-theft-protection.html) · [Centro de ayuda](https://support.google.com/android/answer/15146908) · [Android Police: prueba](https://www.androidpolice.com/let-friend-snatch-phone-to-test-androids-new-motion-sensor-lock/) · [Gigazine: falsos positivos al correr](https://gigazine.net/gsc_news/en/20260807-phone-detecting-run-as-snatching/).
- Apple: [9to5Mac, iOS 27.2 beta 2](https://9to5mac.com/2026/09/21/ios-27-2-beta-2-reveals-new-details-about-unnanounced-iphone-anti-snatching-feature/) · patente [US7218226](https://patents.google.com/patent/US7218226B2/en).
- Otros proyectos: [PluckLock (MIT)](https://github.com/SyntaxBlitz/PluckLock) · [anti-snatch](https://github.com/milan-jani/anti-snatch).
- Vibración de moto: [Acta IMEKO 2020](https://acta.imeko.org/index.php/acta-imeko/article/view/IMEKO-ACTA-09%20%282020%29-04-16/2504). Rango del acelerómetro en Android: [CDD](https://android.googlesource.com/platform/compatibility/cdd/+/1c74714%5E%21/).
