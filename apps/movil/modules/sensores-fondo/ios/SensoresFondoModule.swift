import CoreMotion
import ExpoModulesCore

/// Acelerómetro + giroscopio con CoreMotion en su propia cola, para que sigan llegando mientras la app
/// está en segundo plano (el proceso sigue vivo por la ubicación en segundo plano de expo-location).
///
/// Unidades que entrega (iguales a Android): aceleración en m/s² CON gravedad y con la convención de
/// Android (+9,8 hacia arriba con el celular boca arriba; CoreMotion da g con el signo opuesto),
/// giro en rad/s, tiempo en ms de época Unix.
public class SensoresFondoModule: Module {
  private let motion = CMMotionManager()
  private let cola = OperationQueue()
  private var lote: [[Double]] = []
  private var giro: CMRotationRate?
  private var tGiro: Double = 0
  private var ultimoEnvio: TimeInterval = 0
  private let G = 9.80665

  public func definition() -> ModuleDefinition {
    Name("SensoresFondo")
    Events("onMuestras")

    Function("disponible") { () -> [String: Bool] in
      ["acelerometro": self.motion.isAccelerometerAvailable, "giroscopio": self.motion.isGyroAvailable]
    }

    Function("iniciar") { (intervaloMs: Int) in
      self.iniciar(intervaloMs: intervaloMs)
    }

    Function("detener") {
      self.detener()
    }

    OnDestroy {
      self.detener()
    }
  }

  /// El tiempo de CoreMotion es "desde que prendió el celular": lo pasamos a época Unix.
  private func aEpocaMs(_ timestamp: TimeInterval) -> Double {
    (Date().timeIntervalSince1970 - ProcessInfo.processInfo.systemUptime + timestamp) * 1000
  }

  private func iniciar(intervaloMs: Int) {
    detener()
    cola.maxConcurrentOperationCount = 1
    let intervalo = Double(intervaloMs) / 1000
    if motion.isGyroAvailable {
      motion.gyroUpdateInterval = intervalo
      motion.startGyroUpdates(to: cola) { [weak self] datos, _ in
        guard let self, let datos else { return }
        self.giro = datos.rotationRate
        self.tGiro = self.aEpocaMs(datos.timestamp)
      }
    }
    motion.accelerometerUpdateInterval = intervalo
    motion.startAccelerometerUpdates(to: cola) { [weak self] datos, _ in
      guard let self, let datos else { return }
      let t = self.aEpocaMs(datos.timestamp)
      let g = (self.giro != nil && abs(t - self.tGiro) < 100) ? self.giro : nil
      self.lote.append([
        t,
        -datos.acceleration.x * self.G, -datos.acceleration.y * self.G, -datos.acceleration.z * self.G,
        g?.x ?? .nan, g?.y ?? .nan, g?.z ?? .nan,
      ])
      let ahora = ProcessInfo.processInfo.systemUptime
      // Lotes de ~100 ms para no saturar el puente con JavaScript.
      if ahora - self.ultimoEnvio >= 0.1 {
        self.ultimoEnvio = ahora
        let enviar = self.lote
        self.lote.removeAll()
        self.sendEvent("onMuestras", ["muestras": enviar])
      }
    }
  }

  private func detener() {
    motion.stopAccelerometerUpdates()
    motion.stopGyroUpdates()
    cola.cancelAllOperations()
    lote.removeAll()
    giro = nil
  }
}
