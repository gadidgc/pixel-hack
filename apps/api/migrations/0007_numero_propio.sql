-- iPhone: el número de la propia dueña, para mandarle el SMS de Atajos (AA-BLOQUEO) cuando vence el "¿Todo bien?".
-- Se guarda con la alerta para que la cuenta del servidor (cron) lo mande aunque el ladrón haya cerrado la app
-- o apagado el celular. Es un dato personal: se borra con los teléfonos de la red (al cancelar o a las 24 h).
ALTER TABLE alertas ADD COLUMN numero_propio TEXT;
