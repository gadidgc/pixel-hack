-- La tarjeta de un audio en "Cerca de ti" dibuja su onda: la app mide el volumen mientras graba y lo manda
-- junto con el archivo (48 niveles del 0 al 9, como texto: "0137…"). También guardamos cuánto dura cada
-- grabación, para mostrar "0:42" sin descargar el archivo.

ALTER TABLE evidencias ADD COLUMN onda TEXT;
ALTER TABLE evidencias ADD COLUMN duracion_ms INTEGER;
