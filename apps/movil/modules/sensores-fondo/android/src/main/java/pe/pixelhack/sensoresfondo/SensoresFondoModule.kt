package pe.pixelhack.sensoresfondo

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.HandlerThread
import android.os.PowerManager
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Acelerómetro + giroscopio que siguen funcionando con la app en segundo plano.
 *
 * expo-sensors deja de escuchar cuando la app pasa a segundo plano (onHostPause). Aquí registramos
 * los sensores sin atarlos a la pantalla y tomamos un "wake lock" parcial para que la CPU no se duerma.
 * El proceso sigue vivo gracias al servicio en primer plano de expo-location (notificación fija):
 * desde Android 9 los sensores continuos (acelerómetro, giroscopio) solo llegan a apps en primer plano
 * o con un servicio en primer plano.
 *
 * Unidades que entrega: aceleración en m/s² CON gravedad (convención de Android), giro en rad/s,
 * tiempo en ms de época Unix (el mismo reloj que Date.now()).
 */
class SensoresFondoModule : Module(), SensorEventListener {
  private var sensorManager: SensorManager? = null
  private var hilo: HandlerThread? = null
  private var manejador: Handler? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var periodoUs = 20_000
  private val lote = ArrayList<DoubleArray>()
  private var giro: FloatArray? = null
  private var tGiroMs = 0.0
  private var ultimoEnvio = 0L

  // Diagnóstico (pantalla "Herramientas del equipo"): para comprobar en un celular real que con la
  // pantalla apagada siguen llegando muestras.
  @Volatile private var ultimaMuestra = 0L // SystemClock.elapsedRealtime() de la última muestra
  @Volatile private var muestras = 0L
  @Volatile private var reinicios = 0

  /**
   * Vigilante: algunos celulares (capas de Xiaomi, Samsung, Huawei) dejan de entregar eventos de
   * sensores al apagar la pantalla aunque la app siga viva. Si pasan 2 s sin muestras, volvemos a
   * registrar los sensores. Corre en nuestro hilo (no depende de los temporizadores de JavaScript,
   * que en Android se congelan con la app en segundo plano).
   */
  private val vigilante = object : Runnable {
    override fun run() {
      val sm = sensorManager ?: return
      val h = manejador ?: return
      if (SystemClock.elapsedRealtime() - ultimaMuestra > SILENCIO_MAXIMO_MS) {
        sm.unregisterListener(this@SensoresFondoModule)
        registrarSensores(sm, h)
        reinicios++
        ultimaMuestra = SystemClock.elapsedRealtime() // damos otros 2 s antes de reintentar
      }
      h.postDelayed(this, SILENCIO_MAXIMO_MS)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("SensoresFondo")
    Events("onMuestras")

    Function("disponible") {
      val sm = contexto().getSystemService(Context.SENSOR_SERVICE) as SensorManager
      mapOf(
        "acelerometro" to (sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) != null),
        "giroscopio" to (sm.getDefaultSensor(Sensor.TYPE_GYROSCOPE) != null),
      )
    }

    Function("iniciar") { intervaloMs: Int ->
      iniciar(intervaloMs)
    }

    Function("detener") {
      detener()
    }

    Function("diagnostico") {
      mapOf(
        "activo" to (sensorManager != null),
        "muestras" to muestras.toDouble(),
        "msDesdeUltimaMuestra" to
          (if (ultimaMuestra == 0L) -1.0 else (SystemClock.elapsedRealtime() - ultimaMuestra).toDouble()),
        "reinicios" to reinicios,
        "wakeLock" to (wakeLock?.isHeld == true),
      )
    }

    /** `true` si el usuario ya sacó la app de la "optimización de batería" (Doze no la duerme). */
    Function("sinOptimizacionBateria") {
      val ctx = contexto()
      val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(ctx.packageName)
    }

    OnDestroy {
      detener()
    }
  }

  private fun contexto(): Context =
    appContext.reactContext ?: throw IllegalStateException("Sin contexto de Android")

  /**
   * Sin `maxReportLatencyUs`: el sistema entrega cada muestra al momento (no las junta en lotes de
   * varios segundos con la pantalla apagada, que atrasarían la alerta).
   */
  private fun registrarSensores(sm: SensorManager, handler: Handler) {
    val acc = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
      ?: throw IllegalStateException("Este celular no tiene acelerómetro")
    sm.registerListener(this, acc, periodoUs, handler)
    sm.getDefaultSensor(Sensor.TYPE_GYROSCOPE)?.let { sm.registerListener(this, it, periodoUs, handler) }
  }

  private fun iniciar(intervaloMs: Int) {
    detener()
    val ctx = contexto()
    val sm = ctx.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    val h = HandlerThread("SensoresFondo").apply { start() }
    val handler = Handler(h.looper)
    periodoUs = intervaloMs * 1000
    registrarSensores(sm, handler)
    val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AlertaArrebato:sensores").apply {
      setReferenceCounted(false)
      acquire(12 * 60 * 60 * 1000L) // máximo 12 h, por seguridad de batería
    }
    sensorManager = sm
    hilo = h
    manejador = handler
    muestras = 0
    reinicios = 0
    ultimaMuestra = SystemClock.elapsedRealtime()
    handler.postDelayed(vigilante, SILENCIO_MAXIMO_MS)
  }

  private fun detener() {
    manejador?.removeCallbacks(vigilante)
    manejador = null
    sensorManager?.unregisterListener(this)
    sensorManager = null
    hilo?.quitSafely()
    hilo = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    synchronized(lote) { lote.clear() }
    giro = null
  }

  /** El tiempo del evento es "desde que prendió el celular": lo pasamos a época Unix. */
  private fun aEpocaMs(timestampNs: Long): Double =
    System.currentTimeMillis() - SystemClock.elapsedRealtime() + timestampNs / 1_000_000.0

  override fun onSensorChanged(event: SensorEvent) {
    val t = aEpocaMs(event.timestamp)
    when (event.sensor.type) {
      Sensor.TYPE_GYROSCOPE -> {
        giro = event.values.clone()
        tGiroMs = t
      }
      Sensor.TYPE_ACCELEROMETER -> {
        val ahora = SystemClock.elapsedRealtime()
        ultimaMuestra = ahora
        muestras++
        val g = giro?.takeIf { Math.abs(t - tGiroMs) < 100 }
        val fila = doubleArrayOf(
          t,
          event.values[0].toDouble(), event.values[1].toDouble(), event.values[2].toDouble(),
          g?.get(0)?.toDouble() ?: Double.NaN, g?.get(1)?.toDouble() ?: Double.NaN, g?.get(2)?.toDouble() ?: Double.NaN,
        )
        val enviar: List<List<Double>>?
        synchronized(lote) {
          lote.add(fila)
          // Mandamos en lotes de ~100 ms para no saturar el puente con JavaScript.
          enviar = if (ahora - ultimoEnvio >= 100) {
            ultimoEnvio = ahora
            val copia = lote.map { it.toList() }
            lote.clear()
            copia
          } else null
        }
        if (enviar != null) sendEvent("onMuestras", mapOf("muestras" to enviar))
      }
    }
  }

  override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

  private companion object {
    const val SILENCIO_MAXIMO_MS = 2000L
  }
}
