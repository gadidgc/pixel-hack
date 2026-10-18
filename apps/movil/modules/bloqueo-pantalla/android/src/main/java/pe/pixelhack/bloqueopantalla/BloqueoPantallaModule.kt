package pe.pixelhack.bloqueopantalla

import android.app.KeyguardManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Bloqueo del sistema independiente del PIN de la app y del envío de alertas. */
class BloqueoPantallaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BloqueoPantalla")
    Function("consultarEstado") {
      val ctx = contexto()
      val disponible = ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_DEVICE_ADMIN)
      val llave = ctx.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      mapOf("disponible" to disponible,
        "administradorActivo" to (disponible && administrador(ctx).isAdminActive(componente(ctx))),
        "bloqueoSeguro" to llave.isDeviceSecure, "bloqueado" to llave.isDeviceLocked)
    }
    AsyncFunction("solicitarAutorizacion") { promesa: Promise ->
      val ctx = contexto()
      abrir(Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
        putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, componente(ctx))
        putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
          "Al confirmar un arrebato bloquearemos el celular. Necesitarás tu clave de Android para volver a entrar.")
      }, promesa)
    }
    AsyncFunction("abrirBloqueoSeguro") { promesa: Promise ->
      abrir(Intent(DevicePolicyManager.ACTION_SET_NEW_PASSWORD), promesa)
    }
    // Síncrona: no espera al servidor ni al plazo para avisar a la familia.
    Function("bloquearAhora") {
      try {
        val ctx = contexto()
        if (!ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_DEVICE_ADMIN)) {
          resultado("no_disponible", "Este Android no admite bloqueo mediante administración.")
        } else if (!(ctx.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isDeviceSecure) {
          resultado("sin_clave", "Configura un PIN, patrón o contraseña de Android antes de usar el bloqueo.")
        } else if (!administrador(ctx).isAdminActive(componente(ctx))) {
          resultado("sin_autorizacion", "Falta autorizar el bloqueo de pantalla en Android.")
        } else {
          administrador(ctx).lockNow()
          // Orden aceptada no demuestra por sí sola que ya se mostró la pantalla de bloqueo.
          resultado("solicitado", "Android recibió la orden de bloqueo; exige tu clave del sistema para desbloquear.")
        }
      } catch (_: SecurityException) {
        resultado("sin_autorizacion", "Android rechazó el bloqueo. Revisa la autorización de administrador.")
      } catch (_: Exception) {
        resultado("error", "No se pudo ordenar el bloqueo. La alerta continúa.")
      }
    }
  }
  private fun contexto(): Context = appContext.reactContext ?: throw IllegalStateException("Sin contexto de Android")
  private fun componente(ctx: Context) = ComponentName(ctx, AdministradorBloqueo::class.java)
  private fun administrador(ctx: Context) = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
  private fun resultado(estado: String, detalle: String) = mapOf("estado" to estado, "detalle" to detalle)
  private fun abrir(intent: Intent, promesa: Promise) {
    val actividad = appContext.currentActivity
    if (actividad == null) { promesa.resolve(false); return }
    actividad.runOnUiThread {
      try { actividad.startActivity(intent); promesa.resolve(true) }
      catch (_: Exception) { promesa.resolve(false) }
    }
  }
}
