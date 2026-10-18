# Evaluación del detector (simulación)

> Generado con `npm run evaluar` en 42 s · 100 corridas por escenario · 200 h de "día normal".
> ⚠️ **Son datos simulados**, no grabaciones reales. Los números del simulador (fuerza del jalón, vibración de la moto,
> error del GPS) son **estimaciones** nuestras. Sirven para probar la lógica y detectar regresiones; los umbrales
> finales se ajustan con las grabaciones reales (`datos/`). Ver [docs/PLAN.md](../../../docs/PLAN.md).

## Resumen

| Modo | Detección (escenarios de arrebato) | Falsas alarmas (escenarios trampa) |
|---|---|---|
| Normal | **98.8%** | **0.0%** |
| Demo (velocidad de huida = correr) | 96.2% | 0.5% |

**Día normal sin robos (modo normal):** 8 falsas alarmas en 200 h simuladas
→ **0.64 por día** de 16 h despierto. Posibles jalones evaluados: 741.
Descartes: ya_en_vehiculo 783, arranque_gradual 249, sin_huida 136, quieto_despues 110.

Falsas alarmas por actividad: moto_propia 4, combi 1, caminar 1, mototaxi 1, sacudir 1.

## Robustez (modo normal, 33 corridas por escenario)

Mismos escenarios, pero con un "mundo" peor que el que usamos para ajustar los umbrales.

| Variante | Detección | Falsas alarmas |
|---|---|---|
| Sensores con el triple de ruido (gama baja) | 99.5% | 0.0% |
| GPS cada 2 s y con 2–3 s de retraso | 98.0% | 0.0% |
| Acelerómetro que satura en ±4 g | 98.5% | 0.0% |
| GPS malo: 30 m de error y 30% sin velocidad | 98.0% | 0.0% |

## Modo normal

| Escenario | Esperado | Alertas | Tiempo hasta la alerta (mediana / p90) | Cómo se confirmó | Por qué se descartó |
|---|---|---|---|---|---|
| `arrebato_moto` | alerta | ✅ 100.0% (100/100) | 2.7 s / 3.3 s | velocidad_gps 100 | — |
| `arrebato_moto_al_bolsillo` | alerta | ✅ 100.0% (100/100) | 2.8 s / 3.4 s | velocidad_gps 100 | — |
| `arrebato_moto_gps_sin_velocidad` | alerta | ✅ 100.0% (100/100) | 5.4 s / 6.6 s | velocidad_gps 98, desplazamiento_gps 2 | — |
| `arrebato_moto_gps_impreciso` | alerta | ✅ 100.0% (100/100) | 2.8 s / 3.3 s | velocidad_gps 100 | — |
| `arrebato_moto_sin_gps` | fuera_de_alcance | · 0.0% (0/100) | — / — | — | sin_huida 100 |
| `arrebato_moto_sin_giroscopio` | alerta | ✅ 95.0% (95/100) | 2.7 s / 3.5 s | velocidad_gps 95 | — |
| `arrebato_bici` | alerta | ✅ 98.0% (98/100) | 2.8 s / 3.6 s | velocidad_gps 98 | — |
| `arrebato_a_pie` | fuera_de_alcance | · 4.0% (4/100) | 7.9 s / 9.8 s | desplazamiento_gps 3, velocidad_gps 1 | arranque_gradual 35, sin_huida 35 |
| `demo_en_el_local` | fuera_de_alcance | · 0.0% (0/100) | — / — | — | sin_huida 71 |
| `caminar` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | — |
| `caida_al_piso` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | quieto_despues 100 |
| `caida_sin_gps` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | quieto_despues 100 |
| `lanzar_a_mochila` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | arranque_gradual 56, quieto_despues 42, sin_huida 2 |
| `lanzar_a_mochila_sin_gps` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | sin_huida 99 |
| `sacar_del_bolsillo` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | arranque_gradual 38 |
| `sacar_del_bolsillo_sin_gps` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | sin_huida 36 |
| `sacar_del_bolsillo_sin_giroscopio` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | arranque_gradual 42 |
| `lanzar_a_mochila_sin_giroscopio` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | arranque_gradual 53, quieto_despues 37 |
| `combi_sin_gps` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | sin_huida 93 |
| `bache_en_moto_sin_gps` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | sin_huida 100 |
| `sacudir_celular` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | arranque_gradual 86, quieto_despues 2 |
| `subir_a_mototaxi` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | — |
| `subir_rapido_a_mototaxi` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | — |
| `bache_en_moto_propia` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | ya_en_vehiculo 97 |
| `frenazo_en_combi` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | ya_en_vehiculo 94 |
| `correr_al_bus` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | — |

## Modo demo

| Escenario | Esperado | Alertas | Tiempo hasta la alerta (mediana / p90) | Cómo se confirmó | Por qué se descartó |
|---|---|---|---|---|---|
| `arrebato_moto` | alerta | ✅ 96.0% (96/100) | 2.7 s / 3.3 s | velocidad_gps 96 | ya_en_vehiculo 4 |
| `arrebato_moto_al_bolsillo` | alerta | ✅ 99.0% (99/100) | 2.6 s / 3.3 s | velocidad_gps 99 | ya_en_vehiculo 1 |
| `arrebato_moto_gps_sin_velocidad` | alerta | ✅ 100.0% (100/100) | 4.4 s / 5.4 s | velocidad_gps 57, desplazamiento_gps 43 | — |
| `arrebato_moto_gps_impreciso` | alerta | ✅ 98.0% (98/100) | 2.6 s / 3.3 s | velocidad_gps 98 | ya_en_vehiculo 2 |
| `arrebato_moto_sin_gps` | alerta | ✅ 100.0% (100/100) | 10.0 s / 10.0 s | solo_sensores 100 | — |
| `arrebato_moto_sin_giroscopio` | alerta | ✅ 92.0% (92/100) | 2.6 s / 3.4 s | velocidad_gps 92 | ya_en_vehiculo 3 |
| `arrebato_bici` | alerta | ✅ 96.0% (96/100) | 2.7 s / 3.6 s | velocidad_gps 96 | ya_en_vehiculo 4 |
| `arrebato_a_pie` | alerta | ✅ 91.0% (91/100) | 2.7 s / 3.3 s | velocidad_gps 91 | — |
| `demo_en_el_local` | alerta | ✅ 94.0% (94/100) | 10.0 s / 10.1 s | solo_sensores 94 | — |
| `caminar` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | — |
| `caida_al_piso` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | quieto_despues 87, sin_huida 9, ya_en_vehiculo 4 |
| `caida_sin_gps` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | quieto_despues 100 |
| `lanzar_a_mochila` | sin_alerta | ✅ 4.0% (4/100) | — / — | desplazamiento_gps 3, velocidad_gps 1 | sin_huida 57, quieto_despues 34, ya_en_vehiculo 5 |
| `lanzar_a_mochila_sin_gps` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | ritmo_de_pasos 100 |
| `sacar_del_bolsillo` | sin_alerta | ✅ 2.0% (2/100) | — / — | desplazamiento_gps 1, velocidad_gps 1 | sin_huida 55, ya_en_vehiculo 2 |
| `sacar_del_bolsillo_sin_gps` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | ritmo_de_pasos 49 |
| `sacar_del_bolsillo_sin_giroscopio` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | sin_huida 39, ya_en_vehiculo 3 |
| `lanzar_a_mochila_sin_giroscopio` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | sin_huida 54, quieto_despues 34, ya_en_vehiculo 2 |
| `combi_sin_gps` | fuera_de_alcance | · 81.0% (81/100) | — / — | solo_sensores 81 | ritmo_de_pasos 15 |
| `bache_en_moto_sin_gps` | fuera_de_alcance | · 100.0% (100/100) | — / — | solo_sensores 100 | — |
| `sacudir_celular` | sin_alerta | ✅ 1.0% (1/100) | — / — | velocidad_gps 1 | sin_huida 84, ya_en_vehiculo 5, quieto_despues 1 |
| `subir_a_mototaxi` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | — |
| `subir_rapido_a_mototaxi` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | — |
| `bache_en_moto_propia` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | ya_en_vehiculo 97 |
| `frenazo_en_combi` | sin_alerta | ✅ 0.0% (0/100) | — / — | — | ya_en_vehiculo 98 |
| `correr_al_bus` | fuera_de_alcance | · 0.0% (0/100) | — / — | — | — |

## Cómo leer esto
- **Esperado = alerta:** queremos ≥ 90% (✅). **sin_alerta:** queremos ≤ 5% (✅). **fuera_de_alcance:** no cuenta.
- **Tiempo hasta la alerta:** desde el jalón real hasta que la app manda la alerta. Incluye el retraso del GPS (0,5–1,5 s).
- **Cómo se confirmó:** `velocidad_gps` (2 lecturas seguidas > 15 km/h), `desplazamiento_gps` (> 40 m), `solo_sensores` (sin GPS).
