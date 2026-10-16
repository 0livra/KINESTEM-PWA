import mongoose from 'mongoose';
import { env } from './env';

class MongoService {
  private static instance: MongoService | null = null;
  private _isConnected = false;

  private constructor() {}

  public static getInstance(): MongoService {
    if (!MongoService.instance) {
      MongoService.instance = new MongoService();
    }
    return MongoService.instance;
  }

  public isConnected(): boolean {
    return this._isConnected;
  }

  public async connect(): Promise<boolean> {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      this._isConnected = true;
      console.log(`[MongoDB] Conectado a: ${env.MONGODB_URI}`);
      await this.ensureIndexes();
      return true;
    } catch (err) {
      this._isConnected = false;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[MongoDB] No disponible (${msg}). Modo degradado para telemetría.`);
      return false;
    }
  }

  private async ensureIndexes(): Promise<void> {
    try {
      const db = mongoose.connection.db;
      if (!db) return;
      const col = db.collection('telemetry_events');
      await col.createIndex({ match_id: 1, ronda: 1 }, { background: true });
      await col.createIndex({ match_id: 1, user_id: 1 }, { background: true });
      await col.createIndex({ timestamp: -1 }, { background: true });
      console.log('[MongoDB] Índices de telemetría verificados.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[MongoDB] No se pudieron crear índices: ${msg}`);
    }
  }

  public async healthcheck(): Promise<boolean> {
    return mongoose.connection.readyState === 1;
  }

  public async disconnect(): Promise<void> {
    await mongoose.disconnect();
    this._isConnected = false;
    console.log('[MongoDB] Conexión cerrada.');
  }
}

export const mongoService = MongoService.getInstance();
