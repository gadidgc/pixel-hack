-- Las grabaciones (Grabar evidencia) se publican en "Cerca de ti": cada evidencia con ubicación queda
-- colgada de un reporte del mapa, y lleva una miniatura (un cuadro del video, JPEG) para la tarjeta.
-- La miniatura vive en R2 con la clave `<id>.jpg`.

ALTER TABLE evidencias ADD COLUMN reporte_id TEXT;
ALTER TABLE evidencias ADD COLUMN miniatura INTEGER NOT NULL DEFAULT 0; -- 1 si ya se subió `<id>.jpg`
CREATE INDEX evidencias_por_reporte ON evidencias (reporte_id, creado);
