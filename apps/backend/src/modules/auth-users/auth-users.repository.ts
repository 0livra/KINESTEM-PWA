import { PoolClient } from 'pg';
import { postgresService } from '../../config/postgres';
import { UsuarioEntity, CreateUsuarioParams } from './auth-users.types';

export interface IAuthUsersRepository {
  findById(userId: number): Promise<UsuarioEntity | null>;
  findByRfidUid(rfidUid: string): Promise<UsuarioEntity | null>;
  findByUsername(username: string): Promise<UsuarioEntity | null>;
  findManyByIds(userIds: number[]): Promise<UsuarioEntity[]>;
  create(params: CreateUsuarioParams): Promise<UsuarioEntity>;
  generatePin(userId: number): Promise<string>;
  linkRfid(pinTemporal: string, rfidUid: string, client: PoolClient): Promise<UsuarioEntity | null>;
  addPoints(userId: number, delta: number, client: PoolClient): Promise<number>;
}

export class AuthUsersRepository implements IAuthUsersRepository {
  public async findById(userId: number): Promise<UsuarioEntity | null> {
    const res = await postgresService.query<UsuarioEntity>(
      'SELECT * FROM usuarios WHERE user_id = $1', [userId]
    );
    return res.rows[0] ?? null;
  }

  public async findByRfidUid(rfidUid: string): Promise<UsuarioEntity | null> {
    const res = await postgresService.query<UsuarioEntity>(
      'SELECT * FROM usuarios WHERE rfid_uid = $1', [rfidUid]
    );
    return res.rows[0] ?? null;
  }

  public async findByUsername(username: string): Promise<UsuarioEntity | null> {
    const res = await postgresService.query<UsuarioEntity>(
      'SELECT * FROM usuarios WHERE username = $1', [username]
    );
    return res.rows[0] ?? null;
  }

  public async findManyByIds(userIds: number[]): Promise<UsuarioEntity[]> {
    if (userIds.length === 0) return [];
    const res = await postgresService.query<UsuarioEntity>(
      'SELECT * FROM usuarios WHERE user_id = ANY($1::int[])', [userIds]
    );
    return res.rows;
  }

  public async create(params: CreateUsuarioParams): Promise<UsuarioEntity> {
    const res = await postgresService.query<UsuarioEntity>(
      'INSERT INTO usuarios (username) VALUES ($1) RETURNING *', [params.username]
    );
    return res.rows[0]!;
  }

  public async generatePin(userId: number): Promise<string> {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    await postgresService.query(
      'UPDATE usuarios SET pin_temporal = $1 WHERE user_id = $2', [pin, userId]
    );
    return pin;
  }

  public async linkRfid(
    pinTemporal: string,
    rfidUid: string,
    client: PoolClient
  ): Promise<UsuarioEntity | null> {
    const res = await client.query<UsuarioEntity>(
      `UPDATE usuarios
         SET rfid_uid = $1, pin_temporal = NULL
       WHERE pin_temporal = $2 AND rfid_uid IS NULL
       RETURNING *`,
      [rfidUid, pinTemporal]
    );
    return res.rows[0] ?? null;
  }

  public async addPoints(
    userId: number,
    delta: number,
    client: PoolClient
  ): Promise<number> {
    const res = await client.query<{ saldo_puntos: number }>({
      text: `UPDATE usuarios
         SET saldo_puntos = saldo_puntos + $1
       WHERE user_id = $2 AND saldo_puntos + $1 >= 0
       RETURNING saldo_puntos`,
      values: [delta, userId],
    });
    if (!res.rows[0]) throw new Error('Saldo insuficiente o usuario no encontrado');
    return res.rows[0].saldo_puntos;
  }
}

export const authUsersRepository = new AuthUsersRepository();
