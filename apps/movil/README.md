# App móvil (Expo SDK 58 · iPhone, Android y web)

Pantalla simple a propósito: la lógica vive en [`@pixel-hack/detector`](../../packages/detector).

```bash
npm run start          # desde esta carpeta (o `npm run movil` en la raíz). w = web, a = Android, i = iPhone
npx expo run:android   # build nativo en un emulador o celular conectado (necesita Java y Android SDK)
npx expo run:ios       # build nativo en el simulador de iPhone (necesita Xcode; usa LANG=en_US.UTF-8)
npm run exportar:web   # web estática en dist/ para desplegar con HTTPS
```

- Variables: `EXPO_PUBLIC_URL_ALERTAS` (backend de alertas; si no está, todo queda local). Copia `.env.example` a `.env`.
- Sensores: `src/sensores.ts` (iPhone/Android, expo-sensors) y `src/sensores.web.ts` (web, `devicemotion` directo:
  en la web el `Accelerometer` de expo-sensors entrega ángulos, no aceleración).
- En la web los sensores necesitan **HTTPS** y, en iPhone, tocar "Activar protección" para dar el permiso.
