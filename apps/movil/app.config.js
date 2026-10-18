// Configuración de Expo: parte de app.json y solo ajusta lo que cambia según el build.
//
// TestFlight / App Store: Apple solo deja distribuir el permiso de Tiempo de uso
// (com.apple.developer.family-controls) después de aprobar un formulario aparte, que tarda días.
// Mientras no llegue, el perfil "production" de eas.json pone SIN_TIEMPO_DE_USO=1 y lo quitamos:
// la app funciona igual, pero el diálogo de Apple para autorizar Tiempo de uso nunca aparece.
// `extra.sinTiempoDeUso` avisa a la app (src/bloqueo.ts) para que esconda ese botón y lo explique
// (ver docs/bloqueo-por-arrebato.md).
module.exports = ({ config }) => {
  if (process.env.SIN_TIEMPO_DE_USO === '1') {
    if (config.ios?.entitlements) {
      const { 'com.apple.developer.family-controls': _quitado, ...resto } = config.ios.entitlements;
      config.ios.entitlements = resto;
    }
    config.extra = { ...config.extra, sinTiempoDeUso: true };
  }
  return config;
};
