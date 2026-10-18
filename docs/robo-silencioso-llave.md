# Robo silencioso: la llave por Bluetooth (Android)

## El problema

El detector de arrebato necesita un jalón (pico de aceleración y giro) y una huida rápida. Hay robos
**sin jalón**: te sacan el celular de la mochila en el bus, o se lo llevan de la mesa del restaurante.
Para esos casos usamos una **llave**: otro objeto que va contigo. Si el celular se aleja de la llave,
alguien se lo llevó.

La llave podría ser una pulsera o un smartwatch. Por ahora (hackathon) **la llave es otro celular** con la
misma app, en modo "Este celular es tu llave".

## Cómo funciona

1. El celular **llave** anuncia por Bluetooth de bajo consumo (BLE) un paquete con nuestro identificador
   (UUID) y un **código de 4 dígitos**. No lleva el nombre del celular ni datos personales.
2. El celular **protegido** escucha solo ese identificador y ese código, y mide con qué fuerza le llega
   la señal (RSSI, en dBm).
3. Con la señal calcula la distancia: `d = 10^((RSSI a 1 m − RSSI) / (10 · n))`. El "RSSI a 1 m" se mide
   al vincular (calibración, 4 s con los dos celulares a 1 m) y `n = 2,5` (bajo techo; estimación).
4. Si la distancia pasa el límite **y sigue así un tiempo**, es una alerta. Perder la señal también
   cuenta como "lejos" (la llave quedó fuera de alcance).
5. La alerta va por el **mismo camino que un arrebato**: bloquea Android, muestra "¿Todo bien?" encima de
   la pantalla de bloqueo, avisa al panel al instante y a la red si nadie pone el PIN a tiempo
   ([bloqueo por arrebato](bloqueo-por-arrebato.md)). En el backend llega con `via: 'separacion_llave'`.

| | Modo demo | Modo normal |
|---|---|---|
| Distancia para "lejos" | **5 m** | 8 m (estimación) |
| Tiempo lejos para alertar | **5 s** | 20 s (estimación) |
| Sin señal cuenta como lejos tras | 3 s | 10 s |
| Mediana de la señal | 2 s | 3 s |

El modo demo es el mismo interruptor de **Herramientas › Modo demo**. Los valores del modo normal **no
están medidos**: son una estimación conservadora (con el celular en la mochila y la llave en el
bolsillo, el cuerpo baja la señal y la llave "parece" más lejos).

La lógica está en [`packages/detector/src/llave.ts`](../packages/detector/src/llave.ts)
(`VigilanteLlave`). Como el detector de arrebato, no usa el reloj del sistema: solo el `t` de las lecturas.

### "Olvidé mi llave"

En el "¿Todo bien?" (también sobre la pantalla de bloqueo) y en "Fue falsa alarma" aparece
**"Olvidé mi llave"**. Pide el **mismo PIN** (si no, el ladrón lo tocaría). Cancela la alerta y deja de
vigilar la llave por **8 horas**. La protección contra arrebatos sigue. Pasadas las 8 h vuelve sola, y desde
**Tú › Llave** se puede volver antes ("Ya tengo mi llave").

### Detalles que evitan falsas alarmas

- **No alerta sin haber visto la llave cerca.** Al activar la protección (o después de un "Estoy bien")
  espera a ver la llave cerca. Si no aparece en 15 s, el registro avisa: "No encontramos tu llave".
- **"Estoy bien" con la llave todavía lejos** no vuelve a alertar a los 5 s: espera a que la llave
  vuelva a estar cerca.
- **Pausa:** mientras dura no se vigila la llave, y al terminar hay que verla cerca otra vez.

## Cómo usarlo (y la demo)

Hace falta la **app de Android compilada** (`npm run android` o el APK del CI). **No funciona en Expo
Go**, ni en iPhone, ni en la web.

1. **Celular llave:** en la Bienvenida toca "Este celular será la llave de otro" (no hace falta el primer
   uso completo), o ve a **Tú › Llave › Usar este celular como llave**. Acepta "Dispositivos cercanos".
   Muestra un código de 4 dígitos. **Deja la app abierta en esa pantalla** (la pantalla no se apaga sola).
2. **Celular protegido:** activa la protección, ve a **Tú › Llave**, escribe el código, pon los celulares
   a 1 m y toca "Vincular y calibrar".
3. Activa **Herramientas › Modo demo**. En Herramientas se ve en vivo la distancia y la señal.
4. **Demo:** deja el celular protegido en una mesa y aléjate más de 5 m con la llave. A los ~5 s (más 1
   o 2 s de la mediana) se bloquea y aparece "¿Todo bien?". Desde ahí: PIN + "Estoy bien", o PIN +
   "Olvidé mi llave".

## Límites (decirlo en el pitch)

- **La distancia es aproximada:** el RSSI falla por 2 a 3 m a esta distancia, y cambia con paredes,
  personas, la funda y la posición. "5 m" es "más o menos 5 m".
- **Solo Android.** iPhone no deja anunciarse ni escanear así con la app en segundo plano.
- **El celular llave tiene que quedarse con la app abierta** en su pantalla. Si la cierras, deja de
  anunciar. Que siga en segundo plano necesita su propio servicio en primer plano (pendiente).
- **El celular protegido** vigila con la pantalla apagada gracias al servicio en primer plano que ya
  usamos para el GPS, y con un filtro de escaneo (sin filtro, Android no entrega resultados con la
  pantalla apagada). **Falta probarlo en celulares reales**: algunas marcas reducen el escaneo con la
  pantalla apagada.
- **Una llave falsa:** quien copie el paquete Bluetooth (el código viaja sin cifrar) podría hacerse pasar
  por la llave para que no salte la alerta. Solución pendiente: un código que cambie cada pocos minutos
  (firmado con una clave compartida al vincular).
- **Batería:** escanear sin parar (modo de baja latencia) gasta más que solo los sensores. No lo hemos medido.

## Pruebas

- Automáticas: [`packages/detector/test/llave.test.ts`](../packages/detector/test/llave.test.ts) (la lógica
  con lecturas inventadas: alejarse, volver a tiempo, ruido, sin señal, modo normal) y
  [`apps/movil/test/servicio-llave.test.ts`](../apps/movil/test/servicio-llave.test.ts) (el servicio:
  bloqueo y "¿Todo bien?", "Olvidé mi llave" 8 h, pausa, calibración, Bluetooth apagado, PIN para quitarla).
  **Usan lecturas simuladas, no un Bluetooth real.**
- El CI compila el APK con el módulo [`modules/llave-ble`](../apps/movil/modules/llave-ble).
- **Pendiente (con dos Android):** medir el RSSI a 1, 3, 5 y 8 m (en la mano, en el bolsillo y en la
  mochila) para ajustar `n` y los límites del modo normal; probar con la pantalla apagada del celular
  protegido; probar "Olvidé mi llave" y que vuelva sola a las 8 h.
