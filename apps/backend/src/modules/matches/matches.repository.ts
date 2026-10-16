import { PoolClient } from 'pg';
import { postgresService } from '../../config/postgres';

export type MatchEstado = 'creada' | 'en_curso' | 'finalizada';

export interface PartidaEntity {
  match_id: number;
  estado: MatchEstado;
  fecha_inicio: Date;
}

export interface IMatchesRepository {
  create(): Promise<PartidaEntity>;
  findById(matchId: number): Promise<PartidaEntity | null>;
  updateEstado(matchId: number, estado: MatchEstado, client?: PoolClient): Promise<PartidaEntity | null>;
}

export class MatchesRepository implements IMatchesRepository {
  public async create(): Promise<PartidaEntity> {
    const res = await postgresService.query<PartidaEntity>(
      `INSERT INTO partidas (estado) VALUES ('creada') RETURNING *`
    );
    return res.rows[0]!;
  }

  public async findById(matchId: number): Promise<PartidaEntity | null> {
    const res = await postgresService.query<PartidaEntity>(
      'SELECT * FROM partidas WHERE match_id = $1', [matchId]
    );
    return res.rows[0] ?? null;
  }

  public async updateEstado(
    matchId: number,
    estado: MatchEstado,
    client?: PoolClient
  ): Promise<PartidaEntity | null> {
    const runQuery = client
      ? (t: string, p: unknown[]) => client.query<PartidaEntity>(t, p)
      : (t: string, p: unknown[]) => postgresService.query<PartidaEntity>(t, p);
    const res = await runQuery(
      `UPDATE partidas SET estado = $1 WHERE match_id = $2 RETURNING *`, [estado, matchId]
    );
    return res.rows[0] ?? null;
  }
}

export const matchesRepository = new MatchesRepository();
