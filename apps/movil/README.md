# App móvil (Expo SDK 58 · iPhone, Android y web)

Pantalla simple a propósito: la lógica vive en [`@pixel-hack/detector`](../../packages/detector).

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
