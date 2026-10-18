# Capturas de la bienvenida (onboarding)

Capturas del simulador de iPhone (iPhone 17 Pro, build Release) antes y después del rediseño.
Diseño de referencia: lienzo "Onboarding nuevo" (https://claude.ai/artifact/ShZvNcrkX6HRiE1f3eqxyQ).

- `antes/`: la bienvenida vieja (4 pasos; el de permisos ocupaba 4 pantallas de scroll con Atajos y Tiempo de uso).
- `nuevo/`: la nueva, una idea por pantalla: bienvenida → nombre → contacto → permisos → («Siempre», solo si falta) → PIN →
  bloqueo con Atajos (solo iPhone) → prueba.

Ojo al leerlas:

- Se grabaron con el backend apagado (`EXPO_PUBLIC_URL_ALERTAS=ninguno`) para no mandar mensajes reales. Por eso la prueba dice
  "no enviado"; con el backend, la misma pantalla dice "¡Funciona!" y muestra el mensaje de PRUEBA.
- El simulador no tiene acelerómetro: por eso `nuevo/6-sin-proteccion.png` no puede encender la protección. Antes, en ese caso,
  la app caía en "Protección apagada" sin decir por qué; ahora lo explica y da la salida.
- El contacto y el número son de ejemplo (999 999 999), no de una persona real.
