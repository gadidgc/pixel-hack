# App móvil (Expo SDK 58 · iPhone, Android y web)

La lógica de detección vive en [`@pixel-hack/detector`](../../packages/detector). Aquí está la interfaz (diseño "Negro cálido", ver [PLAN §7](../../docs/PLAN.md#7-interfaz)).

```
App.tsx              Navegación entre pantallas
src/ui/              Tema (noche y día), íconos, componentes, mapa estilizado
src/pantallas/       Una pantalla por archivo (Bienvenida, Inicio, TodoBien, Cerca, Tu…)
src/servicio.ts      Protección: detector, alerta, pausa, aviso a la red
src/preferencias.ts  Nombre, red y tiempo de espera (solo en el celular)
assets/fotos/        Fotos de ejemplo de Cerca (generadas con Nano Banana)
```

**Páginas solo web:** con `npm run start` y `w`, agrega a la URL `?ver=contacto` (lo que ve tu contacto, con datos de ejemplo hasta que exista el backend) o `?ver=yo` ("Me robaron", la primera hora). Ej.: `http://localhost:8081/?ver=contacto`.

> **La protección en segundo plano necesita la app compilada** (incluye nuestro módulo nativo
> [`modules/sensores-fondo`](modules/sensores-fondo)). En **Expo Go** y en la **web** solo funciona con la app abierta,
> y la pantalla lo avisa.

**Permisos que exige al activar (sin ellos no se activa):** movimiento, ubicación **"Permitir siempre"** y un **PIN**.
El PIN se pide para cancelar una alerta y para apagar la protección. En Android hay un botón para quitar la optimización de batería.

```bash
npm run start          # desde esta carpeta (o `npm run movil` en la raíz). w = web, a = Android, i = iPhone
npx expo run:android   # build nativo en un emulador o celular conectado (Java 17: JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home)
npx expo run:ios       # build nativo en el simulador de iPhone (necesita Xcode; usa LANG=en_US.UTF-8)
npm run exportar:web   # web estática en dist/ para desplegar con HTTPS
```

- Variables: `EXPO_PUBLIC_URL_ALERTAS` (backend de alertas; si no está, todo queda local). Copia `.env.example` a `.env`.
- Sensores: `src/sensores.ts` (iPhone/Android, expo-sensors) y `src/sensores.web.ts` (web, `devicemotion` directo:
  en la web el `Accelerometer` de expo-sensors entrega ángulos, no aceleración).
- En la web los sensores necesitan **HTTPS** y, en iPhone, tocar "Activar protección" para dar el permiso.

## Instalar la app en un iPhone de verdad

Necesitas una Mac con Xcode y el iPhone con su cable. La carpeta `ios/` no está en el repo: se genera en cada Mac.

1. **Generar el proyecto de iOS** (desde esta carpeta):
   ```bash
   LANG=en_US.UTF-8 npx expo prebuild --platform ios
   ```
2. **Conectar el iPhone** con cable, desbloquearlo y tocar **"Confiar en esta computadora"**.
3. **Abrir el proyecto en Xcode:** `open ios/AlertaArrebato.xcworkspace` (el `.xcworkspace`, no el `.xcodeproj`).
   En **Window → Devices and Simulators** (⇧⌘2) debe aparecer el iPhone; espera a que termine "Preparing…".
   - Si no aparece o sale "no disponible", desconéctalo, vuelve a conectarlo desbloqueado y confía otra vez.
     Si sigue igual: en esa ventana, clic derecho sobre el iPhone → **Unpair Device**, y vuelve a conectarlo.
4. **Activar el Modo de desarrollador** en el iPhone: Ajustes → Privacidad y seguridad → al final, en "Seguridad",
   **Modo de desarrollador** → activar. El celular se reinicia y pide confirmar con el código.
   La opción **solo aparece después** de que Xcode se conectó bien al iPhone (paso 3); cierra y abre Ajustes si no la ves.
5. **Firmar la app:** en Xcode, clic en el ícono azul **AlertaArrebato** → en **TARGETS** elige **AlertaArrebato** →
   pestaña **Signing & Capabilities** → marca **Automatically manage signing** y elige tu **Team** (tu Apple ID;
   si no está, "Add an Account…").
   - *"PLA Update available"*: entra a [developer.apple.com/account](https://developer.apple.com/account), acepta el
     nuevo acuerdo y toca **Try Again** en Xcode.
   - *"Device isn't registered"*: toca **Register Device**.
   - Con un Apple ID **gratis** ("Personal Team"): borra la sección **Push Notifications** (la ✕ a su izquierda) y,
     si el Bundle Identifier ya está usado, cámbialo (ej. `pe.pixelhack.alertaarrebato.tunombre`).
     La app deja de abrir a los **7 días**; vuelve a instalarla. Con la cuenta pagada no hay ese límite.
6. **Compilar en Release** (lleva el código adentro y funciona en la calle, sin la Mac): clic en **AlertaArrebato**
   en la barra de arriba (a la izquierda del nombre del iPhone) → **Edit Scheme…** → **Run** → pestaña **Info** →
   **Build Configuration: Release**. Elige tu iPhone como destino y presiona **▶**.
   Una build **Debug** solo funciona con `npm run start` corriendo en la Mac y el celular en el mismo Wi‑Fi.
7. **La primera vez**, si el iPhone dice que el desarrollador no es de confianza: Ajustes → General →
   **VPN y gestión de dispositivos** → tu cuenta → **Confiar**.
8. **En la app:** crea el PIN y da los permisos de ubicación **"Siempre"**, movimiento y notificaciones; luego
   "Activar protección".

> Si vuelves a correr `expo prebuild`, Xcode olvida el Team: repite el paso 5.
