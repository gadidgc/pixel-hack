-- "Cerca de ti": reportes de la comunidad, y evidencias (video o audio) subidas a R2.
-- Privacidad: la ubicación de un reporte se redondea a ~100 m (3 decimales) antes de guardarla, y el
-- `dispositivo` (id anónimo de la instalación) solo sirve para limitar cuántos reportes manda cada uno:
-- nunca se devuelve en la API.

CREATE TABLE reportes (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,                  -- 'arrebato_moto' | 'arrebato_a_pie' | 'intento' | 'robo' | 'sospechoso' | 'zona_oscura'
  lat REAL NOT NULL,                   -- redondeada a ~100 m
  lon REAL NOT NULL,
  nota TEXT,                           -- opcional, máximo 140 caracteres
  dispositivo TEXT NOT NULL,
  origen TEXT NOT NULL,                -- 'comunidad' (alguien lo reportó) | 'alerta' (la app lo detectó y se avisó a la red)
  alerta_id TEXT,                      -- si nació de una alerta: se borra si la alerta se cancela
  creado INTEGER NOT NULL
);
CREATE INDEX reportes_por_lugar ON reportes (lat, lon, creado);
CREATE INDEX reportes_por_dispositivo ON reportes (dispositivo, creado);
CREATE INDEX reportes_por_alerta ON reportes (alerta_id);

-- El archivo vive en R2 (bucket alerta-arrebato-evidencias) con la misma clave que `id`.
CREATE TABLE evidencias (
  id TEXT PRIMARY KEY,                 -- token aleatorio de 16 caracteres: el enlace no se puede adivinar
  dispositivo TEXT NOT NULL,
  alerta_id TEXT,                      -- la alerta abierta de ese celular cuando se subió (si había)
  tipo TEXT NOT NULL,                  -- 'video' | 'audio'
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  lat REAL,
  lon REAL,
  creado INTEGER NOT NULL
);
CREATE INDEX evidencias_por_alerta ON evidencias (alerta_id);
CREATE INDEX evidencias_por_dispositivo ON evidencias (dispositivo, creado);
