# Fase 2 de Gabriel: app que detecta el arrebato desde una moto

**La idea ya está elegida:** una app que, con el acelerómetro, el giroscopio y el GPS del celular, detecta cuando un ladrón en moto arrancha el celular y avisa al instante con la ubicación y la ruta de huida. Solo ese caso.

Lee primero la investigación técnica: [docs/viabilidad-deteccion-arrebato-moto.md](../../../docs/viabilidad-deteccion-arrebato-moto.md).

## Tarea sugerida para Gabriel (propuesta de Claude, el equipo decide)
- **Detector y arquitectura:** la máquina de estados (reposo → posible jalón → confirmando huida → alerta), los umbrales y el backend en tiempo real.

## Qué subir aquí
- Notas de entrevistas con víctimas de arrebato (sin nombres ni teléfonos; pide permiso antes de grabar).
- Grabaciones de sensores (CSV) con su etiqueta: `caminar`, `caida`, `mototaxi`, `arrebato-simulado`…
- Capturas, dudas técnicas, bocetos de pantallas.

## Preguntas que nos faltan responder
- ¿A la víctima le arrancharon el celular con la pantalla prendida, en la mano?
- ¿Cuánto tardó el celular en apagarse o desaparecer de "Encontrar mi dispositivo"?
- ¿A quién habría querido avisar en ese momento?

⚠️ Nada de pruebas delante de una moto real. Las simulaciones se hacen caminando rápido o en bici, en un lugar vacío y con el celular en una funda.
