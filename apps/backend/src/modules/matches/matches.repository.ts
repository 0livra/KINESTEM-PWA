import { PoolClient } from 'pg';
import { postgresService } from '../../config/postgres';

export type MatchEstado = 'creada' | 'en_curso' | 'finalizada';

export interface PartidaEntity {
  match_id: number;
  estado: MatchEstado;
  fecha_inicio: Date;
}

export interface ParticipantePartidaRow {
  user_id: number;
  username: string;
  avatar_id: string;
  rfid_uid: string;
  saldo_puntos: number;
  fecha_ingreso: Date;
}

export type AdmitResult = 'ADMITTED' | 'DUPLICATED_RFID';

export interface IMatchesRepository {
  create(): Promise<PartidaEntity>;
  findById(matchId: number): Promise<PartidaEntity | null>;
  findActive(): Promise<PartidaEntity | null>;
  updateEstado(matchId: number, estado: MatchEstado, client?: PoolClient): Promise<PartidaEntity | null>;
  admitParticipant(matchId: number, userId: number, rfidUid: string): Promise<AdmitResult>;
  findParticipants(matchId: number): Promise<ParticipantePartidaRow[]>;
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

  public async findActive(): Promise<PartidaEntity | null> {
    const res = await postgresService.query<PartidaEntity>(
      `SELECT * FROM partidas WHERE estado IN ('creada', 'en_curso') ORDER BY match_id DESC LIMIT 1`
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

  /**
   * Admite un jugador a la partida. La restriccion UNIQUE(match_id, rfid_uid)
   * garantiza a nivel BD que no existan 2 jugadores con la misma tarjeta
   * dentro de la misma partida activa. Re-escanear la propia tarjeta del
   * mismo usuario es idempotente (mismo asiento); la de otro jugador se
   * rechaza como DUPLICATED_RFID.
   */
  public async admitParticipant(
    matchId: number,
    userId: number,
    rfidUid: string
  ): Promise<AdmitResult> {
    const inserted = await postgresService.query<{ participacion_id: number }>(
      `INSERT INTO participantes_partida (match_id, user_id, rfid_uid)
       VALUES ($1, $2, $3)
       ON CONFLICT (match_id, rfid_uid) DO NOTHING
       RETURNING participacion_id`,
      [matchId, userId, rfidUid]
    );
    if (inserted.rows[0]) return 'ADMITTED';

    const existing = await postgresService.query<{ user_id: number }>(
      'SELECT user_id FROM participantes_partida WHERE match_id = $1 AND rfid_uid = $2',
      [matchId, rfidUid]
    );
    return existing.rows[0]?.user_id === userId ? 'ADMITTED' : 'DUPLICATED_RFID';
  }

  public async findParticipants(matchId: number): Promise<ParticipantePartidaRow[]> {
    const res = await postgresService.query<ParticipantePartidaRow>(
      `SELECT u.user_id, u.username, u.avatar_id, p.rfid_uid, u.saldo_puntos, p.fecha_ingreso
         FROM participantes_partida p
         JOIN usuarios u ON u.user_id = p.user_id
        WHERE p.match_id = $1
        ORDER BY p.fecha_ingreso ASC`,
      [matchId]
    );
    return res.rows;
  }
}

export const matchesRepository = new MatchesRepository();
