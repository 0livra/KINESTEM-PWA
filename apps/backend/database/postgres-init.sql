-- ============================================================================
-- KINESTEM - Esquema Canónico PostgreSQL - Hito 2 (Fase 2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "usuarios" (
  "user_id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) UNIQUE NOT NULL,
  -- Sin UNIQUE: una misma tarjeta fisica puede usarse por distintos usuarios
  -- a lo largo del tiempo; la tarjeta "activa" se reasigna al ultimo vinculado.
  "rfid_uid" VARCHAR(32),
  "pin_temporal" VARCHAR(4),
  "saldo_puntos" INT NOT NULL DEFAULT 0 CHECK ("saldo_puntos" >= 0),
  "avatar_id" VARCHAR(32) NOT NULL DEFAULT 'led_red_happy',
  "fecha_creacion" TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);

-- Migraciones idempotentes para instalaciones existentes
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "avatar_id" VARCHAR(32) NOT NULL DEFAULT 'led_red_happy';
ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_rfid_uid_key";
ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "rfid_uid_key";

CREATE TABLE IF NOT EXISTS "partidas" (
  "match_id" SERIAL PRIMARY KEY,
  "estado" VARCHAR(20) DEFAULT 'creada',
  "fecha_inicio" TIMESTAMP DEFAULT (CURRENT_TIMESTAMP)
);

-- Participantes por partida: garantiza a nivel BD que no existan 2 jugadores
-- con el mismo rfid_uid dentro de la misma partida activa (match_id).
CREATE TABLE IF NOT EXISTS "participantes_partida" (
  "participacion_id" SERIAL PRIMARY KEY,
  "match_id" INT NOT NULL,
  "user_id" INT NOT NULL,
  "rfid_uid" VARCHAR(32) NOT NULL,
  "fecha_ingreso" TIMESTAMP DEFAULT (CURRENT_TIMESTAMP),
  CONSTRAINT "uq_partida_rfid" UNIQUE ("match_id", "rfid_uid")
);

ALTER TABLE "participantes_partida"
  ADD CONSTRAINT "fk_participantes_partida"
  FOREIGN KEY ("match_id") REFERENCES "partidas" ("match_id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "participantes_partida"
  ADD CONSTRAINT "fk_participantes_usuario"
  FOREIGN KEY ("user_id") REFERENCES "usuarios" ("user_id") DEFERRABLE INITIALLY IMMEDIATE;

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
