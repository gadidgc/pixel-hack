-- "Tus notas de falsas alarmas" (Atomic Memory, opcional). La app no tiene cuentas: el servidor entrega una
-- llave aleatoria al celular y aquí guarda solo su hash, con un sujeto aleatorio que es el `user_id` de Atomic
-- Memory. Así nadie puede leer ni borrar las notas de otra persona cambiando un id en la petición.
CREATE TABLE memoria_llaves (
  llave_hash TEXT PRIMARY KEY,         -- SHA-256 de la llave (la llave misma solo la tiene el celular)
  sujeto TEXT NOT NULL UNIQUE,         -- 'vigia-<uuid>' aleatorio: no se deriva del dispositivo ni del nombre
  creada INTEGER NOT NULL
);

-- Cuotas de la memoria (Atomic Memory se paga por uso): cuántas llaves se entregaron y cuántas notas se
-- guardaron o buscaron en cada ventana de tiempo. `clave` es 'llave:global', 'llave:red:<hmac>' (HMAC de la IP con
-- un secreto, nunca la IP), 'escribir:<sujeto>', 'escribir:global' o 'buscar:<sujeto>'. La tarea de cada minuto
-- borra las ventanas de más de 2 días.
CREATE TABLE memoria_uso (
  clave TEXT NOT NULL,
  ventana INTEGER NOT NULL,            -- inicio de la ventana (ms): hora o día según la cuota
  n INTEGER NOT NULL,
  PRIMARY KEY (clave, ventana)
);
