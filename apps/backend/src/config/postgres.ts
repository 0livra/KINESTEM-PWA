import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from './env';

class PostgresService {
  private static instance: PostgresService | null = null;
  private pool: Pool;
  private _isConnected = false;

  private constructor() {
    const connectionConfig = env.DATABASE_URL
      ? { connectionString: env.DATABASE_URL }
      : {
          host: env.PG_HOST,
          port: env.PG_PORT,
          user: env.PG_USER,
          password: env.PG_PASSWORD,
          database: env.PG_DATABASE,
        };

    this.pool = new Pool({
      ...connectionConfig,
      max: env.PG_POOL_MAX,
      idleTimeoutMillis: env.PG_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: env.PG_POOL_CONNECTION_TIMEOUT_MS,
    });

    this.pool.on('error', (err) => {
      console.error('[PostgreSQL] Error en cliente idle:', err.message);
    });
  }

  public static getInstance(): PostgresService {
    if (!PostgresService.instance) {
      PostgresService.instance = new PostgresService();
    }
    return PostgresService.instance;
  }

  public isPoolConnected(): boolean {
    return this._isConnected;
  }

  public async connect(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const result = await client.query<{ current_database: string }>('SELECT current_database()');
      client.release();
      this._isConnected = true;
      console.log(`[PostgreSQL] Conectado a: ${result.rows[0]?.current_database ?? 'desconocida'}`);
      return true;
    } catch (err) {
      this._isConnected = false;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[PostgreSQL] No disponible (${msg}). Modo degradado activado.`);
      return false;
    }
  }

  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  /**
   * Helper transaccional ACID con BEGIN / COMMIT / ROLLBACK y liberación automática del cliente.
   */
  public async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async healthcheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
    this._isConnected = false;
    console.log('[PostgreSQL] Pool cerrado.');
  }
}

export const postgresService = PostgresService.getInstance();
