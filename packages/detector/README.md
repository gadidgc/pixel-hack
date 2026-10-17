# @pixel-hack/detector

El algoritmo que detecta el arrebato desde una moto. TypeScript puro, **sin dependencias**:
corre igual en Node (pruebas), en la app (iPhone y Android) y en la web.

```ts
import { DetectorArrebato } from '@pixel-hack/detector';

const detector = new DetectorArrebato(); // o new DetectorArrebato(CONFIG_DEMO)
detector.procesarImu({ t, ax, ay, az, gx, gy, gz }); // m/s² con gravedad, rad/s, t en ms
detector.procesarGps({ t, lat, lon, velocidad, precision }); // m/s y metros (pueden ser null)
// Ambos devuelven eventos: posible_jalon | descartado | alerta
detector.cancelar(); // falsa alarma
```

| Comando | Qué hace |
|---|---|
| `npm test` | 61 pruebas (unitarias, regresión con el simulador y con datos reales de SHL) |
| `npm run validar-reales -- --shl dia/ \| --spu archivo.csv` | Pasa datasets reales de terceros por el detector ([docs](../../docs/validacion-datos-reales.md)) |
| `npm run empalme-real -- --spu ... --shl ...` | Prueba semi-real: caminata real + jalón real + huida real en vehículo |
| `npm run evaluar` | Banco de pruebas → [reportes/evaluacion.md](reportes/evaluacion.md) |
| `npm run reproducir -- archivo.csv` | Pasa grabaciones reales por el detector |
| `npm run reproducir -- --simular arrebato_moto --guardar x.csv` | Genera una grabación simulada |

Cómo funciona, umbrales y resultados: [docs/PLAN.md §3–4](../../docs/PLAN.md).
