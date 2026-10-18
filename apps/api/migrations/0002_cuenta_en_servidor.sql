-- El backend también lleva la cuenta de "¿Todo bien?": si el ladrón apaga el celular antes de que la app
-- mande `notificar_familia`, el servidor avisa igual al terminar la espera.
ALTER TABLE alertas ADD COLUMN espera_s INTEGER;
ALTER TABLE alertas ADD COLUMN origen TEXT;
CREATE INDEX alertas_en_espera ON alertas (estado, creada);
