import { PoolClient } from 'pg';
import { postgresService } from '../../config/postgres';

export interface RecompensaEntity {
  recompensa_id: number;
  nombre: string;
  stock: number;
  descripcion: string | null;
}

export interface TransaccionEntity {
  transaccion_id: number;
  user_id: number;
  recompensa_id: number | null;
  match_id: number | null;
  tipo_transaccion: string;
  puntos_involucrados: number;
  resultado_ruleta: boolean | null;
  fecha_transaccion: Date;
}

export interface RouletteSpinResult {
  won: boolean;
  command: 'DISPENSE' | 'NONE';
  remainingBalance: number;
}

export interface PlayerMatchResult {
  userId: number;
  rondasSuperadas: number;
  esSobreviviente: boolean;
}

export interface RouletteSettleParams {
  userId: number;
  puntosApostados: number;
  puntosGanados: number;
  premioFisico: boolean;
}

export interface RouletteSettleResult {
  nuevoSaldo: number;
  premioFisico: boolean;
  puntosGanados: number;
}

export interface IEconomyRewardsRepository {
  getAllRecompensas(): Promise<RecompensaEntity[]>;
  distributeMatchLoot(matchId: number, playerResults: PlayerMatchResult[]): Promise<void>;
  spinRewardRoulette(userId: number, recompensaId: number, puntosApostados: number): Promise<RouletteSpinResult>;
  settleRouletteSpin(params: RouletteSettleParams): Promise<RouletteSettleResult>;
}

export class EconomyRewardsRepository implements IEconomyRewardsRepository {
  public async getAllRecompensas(): Promise<RecompensaEntity[]> {
    const res = await postgresService.query<RecompensaEntity>(
      'SELECT * FROM recompensas WHERE stock > 0 ORDER BY recompensa_id ASC'
    );
    return res.rows;
  }

  private async insertTransaction(
    params: Omit<TransaccionEntity, 'transaccion_id' | 'fecha_transaccion'>,
    client: PoolClient
  ): Promise<void> {
    await client.query(
      `INSERT INTO transacciones_puntos
         (user_id, recompensa_id, match_id, tipo_transaccion, puntos_involucrados, resultado_ruleta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [params.user_id, params.recompensa_id ?? null, params.match_id ?? null,
       params.tipo_transaccion, params.puntos_involucrados, params.resultado_ruleta ?? null]
    );
  }

  /**
   * Distribuye botín post-partida en una única transacción ACID.
   */
  public async distributeMatchLoot(
    matchId: number,
    playerResults: PlayerMatchResult[]
  ): Promise<void> {
    if (playerResults.length === 0) return;
    const BOT_PRINCIPAL = 500;
    const PUNTOS_POR_RONDA = 50;

    await postgresService.withTransaction(async (client) => {
      for (const player of playerResults) {
        const puntos = player.esSobreviviente
          ? BOT_PRINCIPAL
          : player.rondasSuperadas * PUNTOS_POR_RONDA;
        const tipo = player.esSobreviviente ? 'bote_ganador' : 'consolacion';
        if (puntos === 0) continue;

        await client.query(
          `UPDATE usuarios SET saldo_puntos = saldo_puntos + $1 WHERE user_id = $2`,
          [puntos, player.userId]
        );
        await this.insertTransaction(
          { user_id: player.userId, recompensa_id: null, match_id: matchId,
            tipo_transaccion: tipo, puntos_involucrados: puntos, resultado_ruleta: null },
          client
        );
      }
    });
  }

  /**
   * Ruleta de recompensas con transacción ACID y bloqueo FOR UPDATE.
   */
  public async spinRewardRoulette(
    userId: number,
    recompensaId: number,
    puntosApostados: number
  ): Promise<RouletteSpinResult> {
    return postgresService.withTransaction(async (client) => {
      // FOR UPDATE en usuarios y recompensas para prevenir race conditions
      const userRes = await client.query<{ saldo_puntos: number }>(
        'SELECT saldo_puntos FROM usuarios WHERE user_id = $1 FOR UPDATE', [userId]
      );
      if (!userRes.rows[0]) throw new Error(`Usuario ${userId} no encontrado`);
      const saldoActual = userRes.rows[0].saldo_puntos;

      const recompensaRes = await client.query<RecompensaEntity>(
        'SELECT * FROM recompensas WHERE recompensa_id = $1 FOR UPDATE', [recompensaId]
      );
      const recompensa = recompensaRes.rows[0];
      if (!recompensa || recompensa.stock <= 0) throw new Error('Recompensa sin stock.');
      if (saldoActual < puntosApostados) throw new Error('Saldo insuficiente.');

      // Descontar puntos apostados (siempre)
      await client.query(
        'UPDATE usuarios SET saldo_puntos = saldo_puntos - $1 WHERE user_id = $2',
        [puntosApostados, userId]
      );

      // Probabilidad proporcional a puntos apostados (50pts=10%, 500pts=100%)
      const probabilidadExito = Math.min(1, puntosApostados / 500);
      const won = Math.random() < probabilidadExito;

      if (won) {
        await client.query(
          'UPDATE recompensas SET stock = stock - 1 WHERE recompensa_id = $1 AND stock > 0',
          [recompensaId]
        );
      }

      await this.insertTransaction(
        { user_id: userId, recompensa_id: recompensaId, match_id: null,
          tipo_transaccion: 'ruleta', puntos_involucrados: puntosApostados, resultado_ruleta: won },
        client
      );

      const saldoRes = await client.query<{ saldo_puntos: number }>(
        'SELECT saldo_puntos FROM usuarios WHERE user_id = $1', [userId]
      );

      return {
        won,
        command: won ? 'DISPENSE' : 'NONE',
        remainingBalance: saldoRes.rows[0]?.saldo_puntos ?? 0,
      };
    });
  }

  /**
   * Liquidacion del giro de la ruleta SVG del frontend: descuenta el costo
   * fijo del giro y abona los puntos ganados en una unica transaccion ACID.
   * El comando DISPENSE (caja fisica) se emite aparte tras verificar el RFID
   * del ganador; aqui solo se registra la economia del giro.
   */
  public async settleRouletteSpin(params: RouletteSettleParams): Promise<RouletteSettleResult> {
    return postgresService.withTransaction(async (client) => {
      const userRes = await client.query<{ saldo_puntos: number }>(
        'SELECT saldo_puntos FROM usuarios WHERE user_id = $1 FOR UPDATE', [params.userId]
      );
      if (!userRes.rows[0]) throw new Error(`Usuario ${params.userId} no encontrado`);
      if (userRes.rows[0].saldo_puntos < params.puntosApostados) {
        throw new Error('Saldo insuficiente para girar la ruleta.');
      }

      await client.query(
        'UPDATE usuarios SET saldo_puntos = saldo_puntos - $1 WHERE user_id = $2',
        [params.puntosApostados, params.userId]
      );

      if (params.puntosGanados > 0) {
        await client.query(
          'UPDATE usuarios SET saldo_puntos = saldo_puntos + $1 WHERE user_id = $2',
          [params.puntosGanados, params.userId]
        );
      }

      await this.insertTransaction(
        {
          user_id: params.userId,
          recompensa_id: null,
          match_id: null,
          tipo_transaccion: 'ruleta',
          puntos_involucrados: params.puntosApostados,
          resultado_ruleta: params.premioFisico,
        },
        client
      );

      const saldoRes = await client.query<{ saldo_puntos: number }>(
        'SELECT saldo_puntos FROM usuarios WHERE user_id = $1', [params.userId]
      );

      return {
        nuevoSaldo: saldoRes.rows[0]?.saldo_puntos ?? 0,
        premioFisico: params.premioFisico,
        puntosGanados: params.puntosGanados,
      };
    });
  }
}

export const economyRewardsRepository = new EconomyRewardsRepository();
