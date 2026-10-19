import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // PostgreSQL
  DATABASE_URL: z.string().optional(),
  PG_HOST: z.string().default('localhost'),
  PG_PORT: z.coerce.number().int().positive().default(5432),
  PG_USER: z.string().default('postgres'),
  PG_PASSWORD: z.string().default('postgres'),
  PG_DATABASE: z.string().default('kinestem_db'),
  PG_POOL_MAX: z.coerce.number().int().positive().default(20),
  PG_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  PG_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // MongoDB
  MONGODB_URI: z.string().default('mongodb://localhost:27017/kinestem_telemetry'),

  // Seguridad
  SESSION_SECRET: z.string().min(32).default('kinestem_super_secret_session_key_2026_dev_32chars'),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_CAPACITY: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_REFILL_RATE_PER_MS: z.coerce.number().positive().default(0.1),

  // Hardware
  SERIAL_PORT: z.string().default('COM6'),
  BAUD_RATE: z.coerce.number().int().positive().default(Number(process.env['SERIAL_BAUD_RATE'] ?? 9600)),
  USE_MOCK_SERIAL: z.preprocess((v) => process.env['SERIAL_MOCK'] === 'true' || v === 'true' || v === true, z.boolean()).default(false),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Variables de entorno inválidas:', JSON.stringify(parseResult.error.format(), null, 2));
  process.exit(1);
}

export const env = parseResult.data;
export type EnvConfig = typeof env;
