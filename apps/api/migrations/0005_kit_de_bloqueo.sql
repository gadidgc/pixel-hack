-- Kit de bloqueo: cuando un contacto confirma que SÍ fue un robo, la página de la alerta le muestra una lista
-- de llamadas (bancos por el 1820, operadora, denuncia) con los datos que le van a pedir.
-- `estado` ahora también puede ser 'robo_confirmado'.

-- Lo que la dueña guardó en la app para este momento (bancos, operadora, línea, IMEI y, si quiso, su DNI).
-- Es un dato personal: solo se muestra después de confirmar el robo y se borra con los teléfonos de la red
-- (al cancelar la alerta o a las 24 h).
ALTER TABLE alertas ADD COLUMN bloqueo_json TEXT;
ALTER TABLE alertas ADD COLUMN robo_confirmado_por TEXT;
ALTER TABLE alertas ADD COLUMN robo_confirmado INTEGER;

-- Avance compartido del kit: quién ya hizo cada paso, para que dos familiares no repitan la misma llamada.
CREATE TABLE bloqueos (
  alerta_id TEXT NOT NULL REFERENCES alertas (id) ON DELETE CASCADE,
  paso TEXT NOT NULL,                  -- 'bancos' | 'operador' | 'denuncia' | 'verificar_imei'
  quien TEXT NOT NULL,                 -- nombre del contacto (como lo guardó la dueña)
  hecho INTEGER NOT NULL,
  actualizado INTEGER NOT NULL,
  PRIMARY KEY (alerta_id, paso)
);
