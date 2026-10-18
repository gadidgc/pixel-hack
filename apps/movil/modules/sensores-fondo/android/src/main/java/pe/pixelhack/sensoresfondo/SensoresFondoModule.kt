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
 * El proceso sigue vivo gracias al servicio en primer plano de expo-location (notificación fija).
 *
 * Unidades que entrega: aceleración en m/s² CON gravedad (convención de Android), giro en rad/s,
 * tiempo en ms de época Unix (el mismo reloj que Date.now()).
 */
class SensoresFondoModule : Module(), SensorEventListener {
  private var sensorManager: SensorManager? = null
  private var hilo: HandlerThread? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private val lote = ArrayList<DoubleArray>()
  private var giro: FloatArray? = null
  private var tGiroMs = 0.0
  private var ultimoEnvio = 0L

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

    OnDestroy {
      detener()
    }
  }

  private fun contexto(): Context =
    appContext.reactContext ?: throw IllegalStateException("Sin contexto de Android")

  private fun iniciar(intervaloMs: Int) {
    detener()
    val ctx = contexto()
    val sm = ctx.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    val acc = sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
      ?: throw IllegalStateException("Este celular no tiene acelerómetro")
    val gyr = sm.getDefaultSensor(Sensor.TYPE_GYROSCOPE)
    val h = HandlerThread("SensoresFondo").apply { start() }
    val handler = Handler(h.looper)
    val periodoUs = intervaloMs * 1000
    sm.registerListener(this, acc, periodoUs, handler)
    if (gyr != null) sm.registerListener(this, gyr, periodoUs, handler)
    val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "AlertaArrebato:sensores").apply {
      setReferenceCounted(false)
      acquire(12 * 60 * 60 * 1000L) // máximo 12 h, por seguridad de batería
    }
    sensorManager = sm
    hilo = h
  }

  private fun detener() {
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
        val g = giro?.takeIf { Math.abs(t - tGiroMs) < 100 }
        val fila = doubleArrayOf(
          t,
          event.values[0].toDouble(), event.values[1].toDouble(), event.values[2].toDouble(),
          g?.get(0)?.toDouble() ?: Double.NaN, g?.get(1)?.toDouble() ?: Double.NaN, g?.get(2)?.toDouble() ?: Double.NaN,
        )
        val ahora = SystemClock.elapsedRealtime()
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
}
