# Ficha de Vigía en las tiendas

Textos y respuestas que se copian en Google Play Console y App Store Connect. Si cambias algo en la consola,
cámbialo aquí también: este archivo es la memoria de lo que pusimos. Idioma de la ficha: español (es-419 en Play,
"Spanish (Mexico)" o "Spanish (Spain)" en Apple; Apple no tiene es-PE).

## Datos generales

| Campo | Valor |
|---|---|
| Nombre | Vigía |
| Paquete / Bundle ID | `pe.pixelhack.alertaarrebato` (no se puede cambiar después de publicar) |
| Nombre de desarrollador (Play) | pixel-hack |
| Categoría | Play: Herramientas · Apple: Utilidades |
| Precio | Gratis, sin anuncios, sin compras |
| Países | Perú primero; luego el resto de Latinoamérica |
| Política de privacidad | https://alerta-arrebato.gabrieldgc1999.workers.dev/privacidad/ |
| Sitio / soporte | https://github.com/gadidgc/pixel-hack |
| Correo de contacto | el de la cuenta de desarrollador de Gabriel (no lo copiamos aquí) |

## Textos

**Subtítulo (Apple, máx. 30):** `Avisa si te arranchan el celular`

**Descripción corta (Play, máx. 80):** `Detecta cuando te arranchan el celular desde una moto y avisa al toque a tu familia.`

**Palabras clave (Apple, máx. 100, separadas por coma):**
`robo,celular,arrebato,moto,seguridad,alerta,familia,ubicación,Lima,Perú,antirrobo,emergencia`

**Descripción completa:**

> Te arranchan el celular desde una moto y en segundos ya no está. Vigía se da cuenta sola y avisa a tu familia
> al instante, con tu ubicación y la ruta por donde se fue el ladrón.
>
> CÓMO FUNCIONA
> • Usa el acelerómetro, el giroscopio y el GPS del celular para reconocer el jalón y la huida en moto, también con
>   la pantalla apagada.
> • Si detecta un arrebato, manda un aviso por WhatsApp y SMS a los contactos que tú elegiste, con un enlace a la
>   ruta de huida en vivo.
> • Si fue una falsa alarma, la cancelas y les llega un "estoy bien".
>
> TAMBIÉN
> • Graba evidencia en video o audio cuando sea seguro para ti.
> • Mira en un mapa los reportes de la comunidad cerca de ti y reporta zonas peligrosas.
> • Tu familia recibe una lista de pasos para bloquear el celular, las cuentas del banco y la línea.
>
> TU PRIVACIDAD
> Tu ubicación solo sale del celular cuando Vigía detecta un robo o cuando tú la compartes en un reporte.
> No vendemos datos ni mostramos anuncios.
>
> Vigía detecta un caso concreto, el arrebato desde una moto; no reconoce todos los robos.
>
> Hecho en Lima por el equipo pixel-hack (Gabriel, Cesar, Mauricio y Piero) en Hack the Andes 2026.

**Notas para el revisor (Apple: App Review Information · Play: Instrucciones de acceso):**

> No hace falta iniciar sesión. Vigía usa la ubicación en segundo plano y el acelerómetro/giroscopio para detectar
> el arrebato de un celular desde una moto, también con la pantalla apagada; por eso pide la ubicación "siempre".
> La ubicación solo se envía al servidor cuando se detecta un robo o cuando el usuario publica un reporte.
> Para probar sin un robo real: abrir la app, agregar un contacto, activar la protección y usar la prueba guiada
> del inicio; el aviso de prueba le llega al contacto marcado como prueba.

## Gráficos (pendiente)

| Pieza | Tamaño | Estado |
|---|---|---|
| Ícono Play | 512×512 PNG | sale de `assets/icon.png` |
| Gráfico de funciones Play | 1024×500 | falta |
| Capturas de celular (Play) | 2 a 8, 9:16 | falta |
| Capturas iPhone 6,9" (Apple) | 1320×2868, 3 a 10 | falta |
| Capturas iPad 13" (Apple) | 2064×2752 | solo si `supportsTablet` queda en `true` |

## Respuestas de los formularios

**Clasificación de contenido (IARC / Apple):** sin violencia, sin contenido sexual, sin apuestas, sin drogas.
Hay contenido generado por usuarios (reportes de la comunidad, con nota de máx. 140 caracteres) → se declara.
Edad: 18+ en el público objetivo de Play (no está dirigida a niños).

**Anuncios:** no. **Compras:** no. **App de noticias / gobierno / finanzas / salud:** no.

**Seguridad de los datos (Play) y Privacidad de la app (Apple).** Ver la tabla del servidor en
`apps/api/migrations/`. Todo va cifrado en tránsito (HTTPS). Nada se usa para publicidad ni para rastrear.

| Dato | Para qué | ¿Sale del celular? | ¿Ligado a la persona? |
|---|---|---|---|
| Ubicación precisa | Aviso de robo y ruta de huida; reportes (redondeada a ~100 m) | Solo al detectar un robo o al reportar | Sí, durante la alerta |
| Nombre de la persona | Que su red sepa quién avisa | Sí, con la alerta | Sí |
| Nombre y teléfono de contactos | Mandarles el aviso por WhatsApp/SMS | Sí, con la alerta | Sí |
| Video y audio | Evidencia que el usuario decide grabar y subir | Solo si el usuario la graba | Por identificador anónimo |
| Identificador de la instalación | Agrupar alertas y reportes de un mismo celular | Sí | No (aleatorio, no es el IMEI) |
| Acelerómetro y giroscopio | Detectar el arrebato | **No** (se procesa en el celular) | — |

¿El usuario puede pedir que se borren sus datos? Sí: escribiendo al correo de contacto (declararlo en Play).

**Permisos sensibles de Android (declaraciones):**
- *Ubicación en segundo plano:* "Vigía detecta el arrebato del celular desde una moto aunque la pantalla esté apagada
  o se use otra app. Para confirmar la huida necesita la velocidad y la ubicación en ese momento y mandarlas a la
  familia. La ubicación solo se envía cuando se detecta un robo." Video: mostrar la pantalla que explica el permiso,
  activar la protección, simular el jalón y que llegue el aviso.
- *Servicio en primer plano (ubicación):* la protección corre como servicio con notificación visible mientras está activa.
- *Ignorar optimización de batería:* sin eso Android pausa los sensores con la pantalla apagada y la detección falla.
