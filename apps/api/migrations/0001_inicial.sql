-- Vigía: tablas del backend (Cloudflare D1, SQLite).
-- Los teléfonos de la red son datos de terceros: se guardan solo mientras dura la alerta (para avisar,
-- decir "está bien" o "alguien se encarga") y se borran al cancelarla o a las 24 h.

CREATE TABLE alertas (
  id TEXT PRIMARY KEY,                 -- token del enlace público /a/<id> (aleatorio, no adivinable)
  dispositivo TEXT NOT NULL,           -- id anónimo de la instalación
  nombre TEXT NOT NULL,                -- cómo se llama la persona (lo ve su red)
  estado TEXT NOT NULL,                -- 'en_espera' | 'avisada' | 'cancelada'
  prueba INTEGER NOT NULL DEFAULT 0,   -- 1 = la prueba guiada del onboarding
  via TEXT,
  confianza TEXT,
  velocidad_ms REAL,
  t_jalon INTEGER,
  lat_jalon REAL,
  lon_jalon REAL,
  contactos_json TEXT,                 -- [{nombre, telefono}] · se borra al terminar
  encargado TEXT,                      -- nombre del contacto que dijo "yo me encargo"
  creada INTEGER NOT NULL,
  avisada INTEGER,
  cancelada INTEGER,
  actualizada INTEGER NOT NULL
);
CREATE INDEX alertas_por_dispositivo ON alertas (dispositivo, creada DESC);

CREATE TABLE ubicaciones (
  alerta_id TEXT NOT NULL REFERENCES alertas (id) ON DELETE CASCADE,
  t INTEGER NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  velocidad REAL,
  precision REAL,
  PRIMARY KEY (alerta_id, t)
);

-- Registro de cada mensaje (WhatsApp/SMS) que intentamos mandar. El destino va enmascarado.
CREATE TABLE envios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alerta_id TEXT NOT NULL,
  tipo TEXT NOT NULL,                  -- 'alerta' | 'esta_bien' | 'encargado' | 'prueba'
  destino TEXT NOT NULL,               -- +51 9•• ••• 123
  canal TEXT,
  ok INTEGER NOT NULL,
  detalle TEXT,
  creado INTEGER NOT NULL
);

-- "¿Qué pasó?" de una falsa alarma: sirve para mejorar el detector. Sin datos personales.
CREATE TABLE motivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispositivo TEXT NOT NULL,
  motivo TEXT NOT NULL,
  creado INTEGER NOT NULL
);
