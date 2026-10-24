// Configuración de Expo: parte de app.json y solo ajusta lo que cambia según el build.
//
// TestFlight / App Store: Apple solo deja distribuir el permiso de Tiempo de uso
// (com.apple.developer.family-controls) después de aprobar un formulario aparte, que tarda días.
// Mientras no llegue, el perfil "production" de eas.json pone SIN_TIEMPO_DE_USO=1 y lo quitamos:
// la app funciona igual, pero el diálogo de Apple para autorizar Tiempo de uso nunca aparece.
// `extra.sinTiempoDeUso` avisa a la app (src/bloqueo.ts) para que esconda ese botón y lo explique
// (ver docs/bloqueo-por-arrebato.md).
module.exports = ({ config }) => {
  // iPhone: con la tilde de "Vigía", EAS busca un target de Xcode que no existe ("Could not find
  // target 'Viga'"). Los perfiles de iOS en eas.json ponen NOMBRE_SIN_TILDE=1 (EAS lo usa en esta Mac
  // y en sus servidores): el proyecto se llama "Vigia" y en el celular se sigue viendo "Vigía"
  // (CFBundleDisplayName). Android acepta la tilde sin problema.
  if (process.env.NOMBRE_SIN_TILDE === '1') {
    config.ios = { ...config.ios, infoPlist: { ...config.ios?.infoPlist, CFBundleDisplayName: config.name } };
    config.name = 'Vigia';
  }
  if (process.env.SIN_TIEMPO_DE_USO === '1') {
    if (config.ios?.entitlements) {
      const { 'com.apple.developer.family-controls': _quitado, ...resto } = config.ios.entitlements;
      config.ios.entitlements = resto;
    }
    config.extra = { ...config.extra, sinTiempoDeUso: true };
  }
  return config;
};
