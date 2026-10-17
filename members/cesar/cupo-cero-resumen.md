# Cupo Cero: red de cámaras vecinales que vigila sola

Propuesta de Cesar (17 de octubre de 2026), trabajada con Claude a partir de [cupo-cero-ideas.md](cupo-cero-ideas.md).
Es un borrador para que el equipo lo revise. **Todavía no hay entrevistas**: todo lo que diga "le serviría" o "usaría" es hipótesis.

---

## 1. Propuesta de valor (en dos líneas)

> **Tus vecinos ya tienen cámaras, pero nadie las mira.**
> **Las unimos en una red que vigila sola tu barrio y tu negocio, y te avisa por WhatsApp solo cuando alguien sospechoso está rondando.**

En una palabra: **alguien vigila por ti.** Nadie tiene que mirar pantallas, reportar ni llenar nada.

## 2. Cómo llegamos aquí

| Versión | Problema que tenía |
|---|---|
| Expediente de extorsión para la policía | La gente no confía en la policía y denunciar solo te pone en la mira |
| Avisos entre transportistas (el "Waze de los ataques") | Dependía de que la gente reporte constantemente, y la gente no reporta |
| **Red de cámaras vecinales (esta)** | **Las cámaras "reportan" solas.** No depende de la confianza en la policía ni de que alguien escriba |

## 3. El problema

- La extorsión y la inseguridad golpean barrios enteros: unas 70 denuncias por extorsión al día (Ministerio Público, 2026), pero denunciar no sirve (alrededor de 1 condena por cada 76 denuncias, según RPP) y da miedo.
- Antes de amenazar o atacar, los extorsionadores **rondan y fotografían** el local. Eso queda grabado en las cámaras de los vecinos, pero nadie lo ve a tiempo.
- Lo que ya tienen no alcanza:

| Hoy tienen | Su problema | Lo que les damos |
|---|---|---|
| Su cámara con su app | Avisa por cualquier movimiento y terminan silenciándola | Avisos solo de **conductas sospechosas** |
| Una cámara por casa, cada una por su lado | Nadie ve el panorama completo | La red ve que **la misma moto pasó por 3 casas** en 10 minutos |
| El video grabado | Se revisa **después** del robo o del ataque | Se enteran **antes**, cuando están rondando |
| El grupo de WhatsApp del barrio | Rumores, audios y alarmas falsas | Avisos con hora, lugar y un clip corto |
| Nadie vigila de noche | El vecino duerme | La red vigila las 24 horas |

## 4. Para quién

1. **Primero, la vecindad:** la junta vecinal o el grupo de vecinos de unas cuadras (por ejemplo, 20 casas, de las cuales 10 tienen negocio).
2. **Después, el negocio del vecino:** quien tiene bodega, pollería o taller recibe además la vigilancia detallada de su local.

No es para empresas grandes, que tienen su propia seguridad.

## 5. Cómo funciona

```
Casa 1 (bodega)    ─┐
Casa 4 (pollería)  ─┼─▶ Cerebro de la red ──▶ Detecta: persona o moto que se queda
Casa 7 (taller)    ─┤   (mini PC o nube)       frente a un local, que pasa varias veces
Casa 9 (casa)      ─┘                          o que recorre varias cámaras
                                                       │
                                                       ▼
                                          Bot de WhatsApp de la junta
                                   "Moto roja pasó por 3 cámaras en 10 min
                                    y se quedó 6 min frente a la casa 4"
```

1. **La cámara graba**, como ya lo hace hoy.
2. **El sistema mira el video solo**, las 24 horas: detecta personas y motos, cuánto tiempo se quedan y si pasan por varias cámaras.
3. **Si ve algo sospechoso, avisa solo** por WhatsApp, con un clip corto.

**Lo que hace la persona:** conectar su cámara una vez y leer los avisos. Nada más.

**Opcional (nunca obligatorio):**
- Un toque en el aviso, "¿era sospechoso? Sí / No", para que el sistema mande menos avisos falsos.
- Reenviar al bot una amenaza de extorsión, que se cruza con lo que vieron las cámaras ("esta moto rondó tu local el martes").

## 6. Cómo se une alguien

| Quién | Qué hace | Cuánto le toma |
|---|---|---|
| Vecino con cámara | Escribe al bot (link o QR del barrio), el coordinador lo aprueba y conecta su cámara con los pasos que le manda el bot | ~10 min, una sola vez |
| Vecino sin cámara | Escribe al bot y lo aprueban. Recibe los avisos del barrio igual | 2 min |
| Coordinador | Le escribe al bot "quiero armar la red de mi barrio", recibe su link y aprueba a los vecinos | ~15 min al inicio |

- Todo por WhatsApp: nada que descargar ni formularios.
- El coordinador **aprueba a cada vecino**, para que un extorsionador no pueda unirse a ver los avisos.
- Con 3 cámaras conectadas, la red empieza a funcionar.

## 7. Arquitectura técnica

- **Cámaras:** las que ya se venden en el Perú (Tapo, Imou, Ezviz, DVR) suelen transmitir video por **RTSP** (un "enchufe" de video que otro programa puede leer).
- **Conexión:** cada casa usa su propio internet y se conecta al cerebro por un túnel seguro (WireGuard o Tailscale). **Ninguna cámara queda abierta a internet.**
- **Detección:** YOLO (modelo de visión ya entrenado) para personas y motos, con rastreo para medir cuánto tiempo se quedan.
- **Red:** nuestra lógica une eventos entre cámaras (misma moto por tipo y color, en cámaras distintas, en pocos minutos) y decide cuándo avisar.
- **Avisos:** bot de WhatsApp con Zavu. Hay que confirmar con Zavu si el bot puede entrar a grupos; si no, manda el aviso a cada vecino.
- **Web pública:** mapa de cámaras, eventos en vivo y opción de **subir un video** para que el jurado pruebe el flujo desde la URL aunque nuestras cámaras estén apagadas.
- **Referencia:** Frigate (programa libre de videovigilancia con detección) para la versión real en barrios.

## 8. Privacidad y reglas

1. **Nadie ve el video en vivo de otro vecino.** Al grupo solo le llega el aviso con un clip corto; el video completo es del dueño. Si no, la red se vuelve espionaje entre vecinos.
2. **El dueño decide:** puede pausar su cámara o salirse cuando quiera.
3. **Videovigilancia legal** (Ley 29733 y la directiva de videovigilancia): cartel de "zona videovigilada", enfocar el propio local con la mínima vista de la calle, borrar los videos tras un plazo (confirmar cuántos días).
4. **Sin acceso automático para la policía:** los videos solo salen si su dueño los comparte. (Lección del Ring de Amazon en Estados Unidos.)
5. **Detectamos motos y conductas, no caras.** Nada de reconocimiento facial ni de buscar a personas.
6. **Pocos avisos y buenos:** en el Perú hay mototaxis y delivery todo el día. Solo se avisa ante conductas raras; si no, todos silencian el bot.

## 9. Viabilidad para el hackathon

| Pieza | ¿Entra? |
|---|---|
| Celulares viejos como cámaras (app IP Webcam) | ✅ |
| Detectar personas y motos (YOLO) | ✅ |
| "Se quedó X minutos frente al local" | ✅ |
| "La misma moto pasó por varias cámaras" (versión simple: tipo, color y tiempo) | ⚠️ |
| Leer placas de moto | ❌ Solo si sobra tiempo |
| Avisos por WhatsApp (Zavu) | ✅ |
| Web pública con mapa, eventos y subida de video | ✅ |
| Cámaras en casas reales, túneles VPN, Frigate | ❌ Va en el pitch como "así se instala en un barrio" |

**Riesgos:**
- El detector corre en una laptop en el local; por eso la web debe permitir subir un video y analizarlo en la nube.
- El Wi-Fi del evento puede bloquear la conexión entre celulares y laptop. Plan B: hotspot de un celular.

**Demo:** 3 o 4 celulares como cámaras en distintos puntos del local. Un compañero pasa varias veces en bici o moto (con su permiso). El jurado ve en la web cómo la red sigue su recorrido y llega el aviso al WhatsApp. Es video real y en vivo, no simulado.

**Reparto sugerido:**

| Persona | Tarea |
|---|---|
| 1 | Celulares como cámaras + detector (YOLO, rastreo, tiempo frente a la puerta) |
| 2 | Lógica de la red: unir eventos entre cámaras y decidir los avisos |
| 3 | Servidor en la nube + web pública |
| 4 | Bot de WhatsApp con Zavu + entrevista con una junta vecinal |

## 10. Lo que falta validar (entrevista con una junta vecinal o vecinos)

- *¿Cuántos negocios de tu cuadra tienen cámara?* Si casi nadie tiene, la idea pierde fuerza.
- *¿Qué haces hoy con los avisos de tu cámara?* Si los silenciaron, confirma el problema.
- *¿Conectarías tu cámara a la red del barrio si nadie ve tu video?*
- *¿Qué haces hoy cuando ves a alguien sospechoso rondando?*
- *¿Pagarías algo al mes (tú o la junta)?*

## 11. Ideas que quedan para después

- Unir casos de extorsión aunque cambien de número (cuenta de cobro, misma víctima, misma imagen, texto).
- Círculo familiar y verificación ante un "tenemos a tu hijo" (se conecta con NEXUS Rescate de Piero).
- Conectar a grupos que no se hablan (dos mercados, dos juntas) cuando los golpea la misma banda.
- Cámaras municipales (requiere convenio con la municipalidad).
- Las Tías (Gabriel) como módulo aparte solo para estafas.
