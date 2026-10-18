# App de iPhone en TestFlight

Cómo subimos la app nativa de iPhone a **TestFlight** (la app de Apple para probar betas) con un **enlace público**,
para que los jurados la instalen sin pasar por la App Store.

> Las cuentas de Expo y de Apple son de Gabriel. Los comandos que piden usuario, contraseña o código 2FA
> los corre él en su terminal; nunca se escriben claves en el repo ni en el chat.

## Para los jurados (lo que tienen que hacer)

1. En el iPhone, instalar **TestFlight** desde la App Store (es gratis y es de Apple).
2. Abrir el enlace público de la beta (o escanear el QR de la página de descarga) y tocar **Aceptar** → **Instalar**.
3. Abrir **Alerta Arrebato** y aceptar los permisos de **ubicación "siempre"** y **movimiento**: con ellos la app
   detecta el arrebato aunque la pantalla esté apagada.

Requisito: iOS reciente (el que pida TestFlight). La beta dura 90 días.

## Configuración en el repo

- `apps/movil/eas.json`: perfil `production` para EAS Build (el servicio de Expo que compila la app en la nube).
  `distribution: "store"` sirve para App Store Connect / TestFlight, y `autoIncrement` sube el número de build solo
  (`appVersionSource: "remote"`: el número lo guarda Expo, no `app.json`).
- `apps/movil/app.json`: `ios.config.usesNonExemptEncryption: false`. Solo usamos el cifrado estándar de iOS (HTTPS),
  así que Apple no pregunta por "export compliance" en cada build.
- El módulo nativo `modules/sensores-fondo` se compila solo con EAS (por eso no sirve Expo Go).
- **Sin Tiempo de uso en TestFlight:** el permiso `com.apple.developer.family-controls` (bloquear las demás apps,
  ver [bloqueo-por-arrebato.md](bloqueo-por-arrebato.md)) solo se puede distribuir cuando Apple aprueba un
  formulario aparte, que tarda días. Por eso el perfil `production` pone `SIN_TIEMPO_DE_USO=1` y
  `apps/movil/app.config.js` lo quita del build. En la beta el bloqueo de apps responde "sin autorización";
  la detección, los avisos y el bloqueo con Atajos funcionan igual. Al llegar la aprobación de Apple se borra
  esa variable de `eas.json`.

## Paso a paso (Gabriel)

Todo desde `apps/movil`.

1. Iniciar sesión en Expo (una vez):

   ```bash
   npx eas-cli login
   ```

2. Compilar y mandar a App Store Connect en un solo paso. La primera vez pregunta por el Apple ID y el 2FA,
   crea el certificado, el perfil de distribución y, si falta, el registro de la app en App Store Connect:

   ```bash
   npx eas-cli build -p ios --profile production --auto-submit
   ```

   Si el build ya terminó sin `--auto-submit`, se manda así:

   ```bash
   npx eas-cli submit -p ios --latest
   ```

3. Esperar a que App Store Connect termine de **procesar** el build (5 a 30 min; llega un correo).

4. En [App Store Connect](https://appstoreconnect.apple.com) → **Apps → Alerta Arrebato → TestFlight**:
   - **Información de prueba** (Test Information), en español:
     - *Descripción de la beta:* "Alerta Arrebato detecta cuando un ladrón en moto te arrancha el celular y avisa al
       instante a tu familia con tu ubicación y la ruta de huida. Prototipo del hackatón Hack the Andes 2026 (Lima)."
     - *Correo de contacto para comentarios:* el de Gabriel.
     - *Notas para la revisión (Beta App Review):* "No hace falta iniciar sesión. La app usa la ubicación en segundo
       plano y el acelerómetro/giroscopio para detectar el arrebato de un celular desde una moto, también con la
       pantalla apagada. Para probar sin robo real: abrir la app, activar la protección y usar el botón de prueba /
       simulación; el aviso se manda a los contactos que el usuario registra."
   - **Pruebas externas** → **+** → crear el grupo **Jurados** → agregar el build.
   - Activar **Enlace público** (Public Link) en el grupo y, si pide límite, poner 100.
   - **Enviar a revisión** (Submit for Review). La primera revisión de una beta externa puede tardar horas;
     las siguientes builds de la misma versión suelen pasar sin revisión.

5. Cuando Apple apruebe, copiar el enlace público (`https://testflight.apple.com/join/XXXXXXXX`) y cambiar el QR
   de iPhone en la página `/descargar` (hasta entonces apunta a la versión web).

## Si algo falla

- **"Missing compliance"** en el build: responder "No" al cifrado no exento (ya debería venir resuelto por `app.json`).
- **Rechazo por ubicación "siempre"**: explicar en las notas que la detección necesita seguir funcionando con la
  pantalla apagada y que la ubicación solo se envía si se detecta un robo.
- **Sin enlace público todavía**: se puede invitar por correo a testers **internos** (miembros del equipo en App Store
  Connect, hasta 100) sin esperar la revisión.
