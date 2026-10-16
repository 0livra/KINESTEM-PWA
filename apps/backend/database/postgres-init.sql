-- ============================================================================
-- KINESTEM - Esquema Canónico PostgreSQL - Hito 2
-- ============================================================================

CREATE TABLE IF NOT EXISTS "usuarios" (
  "user_id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) UNIQUE NOT NULL,
  "rfid_uid" VARCHAR(32) UNIQUE,
  "pin_temporal" VARCHAR(4),
  "saldo_puntos" INT NOT NULL DEFAULT 0 CHECK ("saldo_puntos" >= 0),
  "fecha_creacion" TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS "partidas" (
  "match_id" SERIAL PRIMARY KEY,
  "estado" VARCHAR(20) DEFAULT 'creada',
  "fecha_inicio" TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);

CREATE TABLE IF NOT EXISTS "recompensas" (
  "recompensa_id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL,
  "stock" INT NOT NULL CHECK ("stock" >= 0),
  "descripcion" TEXT
);

CREATE TABLE IF NOT EXISTS "transacciones_puntos" (
  "transaccion_id" SERIAL PRIMARY KEY,
  "user_id" INT NOT NULL,
  "recompensa_id" INT,
  "match_id" INT,
  "tipo_transaccion" VARCHAR(50) NOT NULL,
  "puntos_involucrados" INT NOT NULL,
  "resultado_ruleta" BOOLEAN,
  "fecha_transaccion" TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);

ALTER TABLE "transacciones_puntos"
  ADD CONSTRAINT "fk_transacciones_usuario"
  FOREIGN KEY ("user_id") REFERENCES "usuarios" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transacciones_puntos"
  ADD CONSTRAINT "fk_transacciones_recompensa"
  FOREIGN KEY ("recompensa_id") REFERENCES "recompensas" ("recompensa_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transacciones_puntos"
  ADD CONSTRAINT "fk_transacciones_partida"
  FOREIGN KEY ("match_id") REFERENCES "partidas" ("match_id") DEFERRABLE INITIALLY IMMEDIATE;
