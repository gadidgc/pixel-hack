package pe.pixelhack.bloqueopantalla

import android.app.Activity
import android.app.KeyguardManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.WindowManager
import androidx.core.app.NotificationCompat
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
        "bloqueoSeguro" to llave.isDeviceSecure, "bloqueado" to llave.isDeviceLocked,
        "pantallaCompleta" to puedePantallaCompleta(ctx))
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
    // Android 14+: el permiso de pantalla completa es un ajuste que el usuario puede quitar.
    AsyncFunction("abrirPermisoPantallaCompleta") { promesa: Promise ->
      if (Build.VERSION.SDK_INT < 34) { promesa.resolve(true); return@AsyncFunction }
      abrir(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
        Uri.parse("package:${contexto().packageName}")), promesa)
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
    /**
     * Muestra el "¿Todo bien?" encima de la pantalla de bloqueo, como un despertador: el dueño cancela
     * con el PIN de la app sin desbloquear Android. Solo la pantalla de la alerta queda visible; al
     * terminar la alerta se quita y vuelve la pantalla de bloqueo normal. Devuelve `false` si Android
     * no deja abrirla sola (sin permiso de pantalla completa): queda la notificación.
     */
    Function("mostrarSobreBloqueo") { titulo: String, texto: String ->
      val ctx = contexto()
      sobreBloqueo = true
      appContext.currentActivity?.let { aplicar(it, true) }
      notificar(ctx, titulo, texto)
      puedePantallaCompleta(ctx)
    }
    Function("ocultarSobreBloqueo") {
      sobreBloqueo = false
      appContext.currentActivity?.let { aplicar(it, false) }
      (contexto().getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(ID_NOTIFICACION)
    }
    // Si Android recrea la actividad durante la alerta, vuelve a quedar encima del bloqueo.
    OnActivityEntersForeground {
      if (sobreBloqueo) appContext.currentActivity?.let { aplicar(it, true) }
    }
  }

  private fun aplicar(actividad: Activity, activo: Boolean) {
    actividad.runOnUiThread {
      if (Build.VERSION.SDK_INT >= 27) {
        actividad.setShowWhenLocked(activo)
        actividad.setTurnScreenOn(activo)
      } else {
        @Suppress("DEPRECATION")
        val banderas = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        if (activo) actividad.window.addFlags(banderas) else actividad.window.clearFlags(banderas)
      }
    }
  }

  private fun notificar(ctx: Context, titulo: String, texto: String) {
    val gestor = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) {
      gestor.createNotificationChannel(NotificationChannel(CANAL, "Alerta sobre la pantalla de bloqueo",
        NotificationManager.IMPORTANCE_HIGH).apply { setSound(null, null); vibrationPattern = longArrayOf(0, 400, 150, 400) })
    }
    val abrirApp = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
    } ?: return
    val pendiente = PendingIntent.getActivity(ctx, 0, abrirApp,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    val aviso = NotificationCompat.Builder(ctx, CANAL)
      .setSmallIcon(ctx.applicationInfo.icon)
      .setContentTitle(titulo)
      .setContentText(texto)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setContentIntent(pendiente)
      .setFullScreenIntent(pendiente, true)
      .build()
    try { gestor.notify(ID_NOTIFICACION, aviso) } catch (_: SecurityException) { /* sin permiso de notificaciones */ }
  }

  private fun puedePantallaCompleta(ctx: Context): Boolean =
    Build.VERSION.SDK_INT < 34 ||
      (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()

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

  companion object {
    private const val CANAL = "alerta-sobre-bloqueo"
    private const val ID_NOTIFICACION = 4417
    @Volatile private var sobreBloqueo = false
  }
}
