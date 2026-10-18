package pe.pixelhack.llaveble

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.ParcelUuid
import android.os.SystemClock
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID

/**
 * La "llave" del robo silencioso por Bluetooth de bajo consumo (BLE).
 *
 * - El celular LLAVE anuncia (advertising) un paquete con nuestro UUID y el código de vinculación.
 * - El celular PROTEGIDO escanea solo ese UUID + código y manda a JS cada lectura con su RSSI (dBm):
 *   con eso packages/detector (llave.ts) estima la distancia.
 *
 * El escaneo lleva un filtro (UUID + código): sin filtro, Android no entrega resultados con la pantalla
 * apagada. El proceso sigue vivo gracias al servicio en primer plano de expo-location, como los sensores.
 * Ojo: Android no deja empezar más de 5 escaneos cada 30 s (si no, los ignora en silencio): por eso no
 * reiniciamos el escaneo a cada rato, solo al vincular o al activar la protección.
 *
 * Los permisos (BLUETOOTH_SCAN, BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT) los pide JS antes de llamar aquí.
 */
class LlaveBleModule : Module() {
  private var anuncio: AdvertiseCallback? = null
  private var escaneo: ScanCallback? = null

  override fun definition() = ModuleDefinition {
    Name("LlaveBle")
    Events("onLlave", "onErrorLlave")

    Function("disponible") {
      val adaptador = adaptador()
      mapOf(
        "bluetooth" to (adaptador != null),
        "encendido" to (adaptador?.isEnabled == true),
        "anunciar" to (adaptador?.isMultipleAdvertisementSupported == true),
      )
    }

    /** Empieza a anunciar este celular como llave. Se resuelve cuando Android confirma que ya anuncia. */
    AsyncFunction("anunciar") { codigo: String, promesa: Promise ->
      detenerAnuncio()
      val anunciador = adaptador()?.takeIf { it.isEnabled }?.bluetoothLeAdvertiser
      if (anunciador == null) {
        promesa.reject("SIN_BLUETOOTH", "Prende el Bluetooth para usar este celular como llave.", null)
        return@AsyncFunction
      }
      val ajustes = AdvertiseSettings.Builder()
        .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY) // ~10 veces por segundo
        .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
        .setConnectable(false)
        .setTimeout(0)
        .build()
      // Sin nombre del celular: solo el UUID y el código (25 de los 31 bytes del paquete).
      val datos = AdvertiseData.Builder()
        .setIncludeDeviceName(false)
        .setIncludeTxPowerLevel(false)
        .addServiceData(SERVICIO, codigo.toByteArray(Charsets.US_ASCII))
        .build()
      val callback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
          promesa.resolve(true)
        }

        override fun onStartFailure(errorCode: Int) {
          anuncio = null
          promesa.reject("ANUNCIO_$errorCode", mensajeAnuncio(errorCode), null)
        }
      }
      anuncio = callback
      try {
        anunciador.startAdvertising(ajustes, datos, callback)
      } catch (e: SecurityException) {
        anuncio = null
        promesa.reject("SIN_PERMISO", "Falta el permiso de Bluetooth (dispositivos cercanos).", e)
      }
    }

    Function("dejarDeAnunciar") {
      detenerAnuncio()
    }

    /** Escucha la llave con ese código. Cada lectura llega a JS como `onLlave` ({ t, rssi }). */
    Function("escanear") { codigo: String ->
      detenerEscaneo()
      val escaner = adaptador()?.takeIf { it.isEnabled }?.bluetoothLeScanner
        ?: throw IllegalStateException("Prende el Bluetooth para vigilar tu llave.")
      val filtro = ScanFilter.Builder()
        .setServiceData(SERVICIO, codigo.toByteArray(Charsets.US_ASCII))
        .build()
      val ajustes = ScanSettings.Builder()
        .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
        .setCallbackType(ScanSettings.CALLBACK_TYPE_ALL_MATCHES)
        .setReportDelay(0) // cada lectura al momento: no juntarlas en lotes que atrasen la alerta
        .build()
      val callback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
          sendEvent("onLlave", mapOf("t" to aEpocaMs(result.timestampNanos), "rssi" to result.rssi))
        }

        override fun onBatchScanResults(results: MutableList<ScanResult>) {
          for (r in results) onScanResult(ScanSettings.CALLBACK_TYPE_ALL_MATCHES, r)
        }

        override fun onScanFailed(errorCode: Int) {
          escaneo = null
          sendEvent("onErrorLlave", mapOf("detalle" to "Android no dejó buscar la llave (error $errorCode)."))
        }
      }
      try {
        escaner.startScan(listOf(filtro), ajustes, callback)
      } catch (e: SecurityException) {
        throw IllegalStateException("Falta el permiso de Bluetooth (dispositivos cercanos).", e)
      }
      escaneo = callback
    }

    Function("detenerEscaneo") {
      detenerEscaneo()
    }

    OnDestroy {
      detenerEscaneo()
      detenerAnuncio()
    }
  }

  private fun adaptador(): BluetoothAdapter? {
    val ctx = appContext.reactContext ?: return null
    return (ctx.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
  }

  @SuppressLint("MissingPermission")
  private fun detenerAnuncio() {
    val callback = anuncio ?: return
    anuncio = null
    try {
      adaptador()?.bluetoothLeAdvertiser?.stopAdvertising(callback)
    } catch (_: Exception) {
      // Bluetooth apagado o permiso quitado: ya no anuncia.
    }
  }

  @SuppressLint("MissingPermission")
  private fun detenerEscaneo() {
    val callback = escaneo ?: return
    escaneo = null
    try {
      adaptador()?.bluetoothLeScanner?.stopScan(callback)
    } catch (_: Exception) {
      // Bluetooth apagado o permiso quitado: ya no escanea.
    }
  }

  /** El tiempo del resultado es "desde que prendió el celular": lo pasamos a época Unix (como los sensores). */
  private fun aEpocaMs(timestampNs: Long): Double =
    System.currentTimeMillis() - SystemClock.elapsedRealtime() + timestampNs / 1_000_000.0

  private fun mensajeAnuncio(codigo: Int): String = when (codigo) {
    AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "Este celular no puede anunciarse por Bluetooth: no sirve como llave."
    AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Hay demasiadas apps usando Bluetooth a la vez. Cierra alguna y prueba otra vez."
    AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "El código de la llave es demasiado largo."
    AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED -> "Este celular ya está anunciándose como llave."
    else -> "No se pudo anunciar la llave por Bluetooth (error $codigo)."
  }

  private companion object {
    /** Identificador propio de Alerta Arrebato (generado al azar): solo escuchamos paquetes con este UUID. */
    val SERVICIO: ParcelUuid = ParcelUuid(UUID.fromString("7a1e0b1e-5c3b-4b8e-9f42-a1e7a2ba1e70"))
  }
}
