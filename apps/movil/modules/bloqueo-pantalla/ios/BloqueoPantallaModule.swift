import ExpoModulesCore
import FamilyControls
import LocalAuthentication
import ManagedSettings
import UIKit

/// iPhone: Apple no deja que una app bloquee la pantalla (eso solo lo hace MDM). Lo más cercano es
/// Tiempo de uso (FamilyControls + ManagedSettings): con la autorización del dueño, la app pone un
/// "escudo" sobre TODAS las demás apps y sitios web, incluida la que esté abierta cuando la arranchan.
/// No es un bloqueo: el ladrón sigue viendo el inicio, Teléfono y Ajustes.
///
/// Mismas funciones que el módulo de Android para que `src/bloqueo.ts` no tenga que distinguir, más
/// `appsBloqueadas` y `quitarBloqueoApps` (en Android no existen: el bloqueo lo quita la clave del sistema).
/// Requiere el entitlement `com.apple.developer.family-controls` (app.json) e iOS 16 o más.
public class BloqueoPantallaModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BloqueoPantalla")

    Function("consultarEstado") { () -> [String: Bool] in
      guard #available(iOS 16.0, *) else {
        return ["disponible": false, "administradorActivo": false, "bloqueoSeguro": false, "bloqueado": false, "pantallaCompleta": false]
      }
      return [
        "disponible": true,
        "administradorActivo": AuthorizationCenter.shared.authorizationStatus == .approved,
        "bloqueoSeguro": Self.tieneCodigo(),
        // `bloqueado` en Android es "está en la pantalla de bloqueo". Aquí no podemos saberlo; el escudo va aparte.
        "bloqueado": false,
        // iPhone no deja abrir pantallas sobre su bloqueo: para cancelar hay que desbloquear el iPhone.
        "pantallaCompleta": false,
      ]
    }

    // El diálogo de Apple ("¿Permitir que use Tiempo de uso?") se confirma con Face ID o el código.
    AsyncFunction("solicitarAutorizacion") { (promise: Promise) in
      guard #available(iOS 16.0, *) else { return promise.resolve(false) }
      Task { @MainActor in
        do {
          try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        } catch {
          return promise.resolve(false)
        }
        promise.resolve(AuthorizationCenter.shared.authorizationStatus == .approved)
      }
    }

    // iOS no deja abrir directamente "Face ID y código": abrimos los ajustes de la app.
    AsyncFunction("abrirBloqueoSeguro") { () -> Bool in
      guard let url = URL(string: UIApplication.openSettingsURLString) else { return false }
      UIApplication.shared.open(url)
      return true
    }.runOnQueue(.main)

    Function("bloquearAhora") { () -> [String: String] in
      guard #available(iOS 16.0, *) else {
        return ["estado": "no_disponible", "detalle": "Bloquear las apps necesita iOS 16 o más."]
      }
      guard Self.tieneCodigo() else {
        return ["estado": "sin_clave", "detalle": "El iPhone no tiene código: sin código, el ladrón quitaría el bloqueo de apps en Ajustes."]
      }
      guard AuthorizationCenter.shared.authorizationStatus == .approved else {
        return ["estado": "sin_autorizacion", "detalle": "Falta autorizar Tiempo de uso: no se bloquearon las apps."]
      }
      let tienda = Self.tienda()
      tienda.shield.applicationCategories = .all()
      tienda.shield.webDomainCategories = .all()
      // Que no puedan borrar Vigía: sin la app no sigue llegando la ruta.
      tienda.application.denyAppRemoval = true
      return ["estado": "solicitado", "detalle": "Apps del iPhone bloqueadas con Tiempo de uso (no es un bloqueo de pantalla)."]
    }

    // Sin equivalente en iPhone: el "¿Todo bien?" no puede abrirse sobre el bloqueo.
    AsyncFunction("abrirPermisoPantallaCompleta") { () -> Bool in false }
    Function("mostrarSobreBloqueo") { (_: String, _: String) -> Bool in false }
    Function("ocultarSobreBloqueo") {}

    Function("appsBloqueadas") { () -> Bool in
      guard #available(iOS 16.0, *) else { return false }
      return Self.tienda().shield.applicationCategories != nil
    }

    Function("quitarBloqueoApps") {
      guard #available(iOS 16.0, *) else { return }
      Self.tienda().clearAllSettings()
    }
  }

  @available(iOS 16.0, *)
  private static func tienda() -> ManagedSettingsStore {
    ManagedSettingsStore(named: ManagedSettingsStore.Name("alerta-arrebato"))
  }

  /// `true` si el iPhone tiene código (con o sin Face ID).
  private static func tieneCodigo() -> Bool {
    LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: nil)
  }
}
