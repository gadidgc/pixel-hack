// Configuración de Expo: parte de app.json y solo ajusta lo que cambia según el build.
//
// TestFlight / App Store: Apple solo deja distribuir el permiso de Tiempo de uso
// (com.apple.developer.family-controls) después de aprobar un formulario aparte, que tarda días.
// Mientras no llegue, el perfil "production" de eas.json pone SIN_TIEMPO_DE_USO=1 y lo quitamos:
// la app funciona igual y el bloqueo de apps responde "sin_autorizacion" (ver docs/bloqueo-por-arrebato.md).
module.exports = ({ config }) => {
  if (process.env.SIN_TIEMPO_DE_USO === '1' && config.ios?.entitlements) {
    const { 'com.apple.developer.family-controls': _quitado, ...resto } = config.ios.entitlements;
    config.ios.entitlements = resto;
  }
  return config;
};
