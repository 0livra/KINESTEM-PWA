import { IEconomyRewardsRepository, economyRewardsRepository, PlayerMatchResult, RouletteSpinResult, RecompensaEntity } from './economy-rewards.repository';
import { NotFoundError, InsufficientFundsError } from '../../shared/middlewares/error.middleware';

export class EconomyRewardsService {
  constructor(private readonly repo: IEconomyRewardsRepository = economyRewardsRepository) {}

  public async listRecompensas(): Promise<RecompensaEntity[]> {
    return this.repo.getAllRecompensas();
  }

  public async distributeMatchLoot(matchId: number, playerResults: PlayerMatchResult[]): Promise<{ distributed: number }> {
    if (playerResults.length === 0) throw new NotFoundError('No hay jugadores para distribuir recompensas.');
    await this.repo.distributeMatchLoot(matchId, playerResults);
    return { distributed: playerResults.length };
  }

  public async spinRoulette(userId: number, recompensaId: number, puntosApostados: number): Promise<RouletteSpinResult> {
    if (puntosApostados <= 0) throw new InsufficientFundsError('Los puntos apostados deben ser positivos.');
    return this.repo.spinRewardRoulette(userId, recompensaId, puntosApostados);
  }
}

export const economyRewardsService = new EconomyRewardsService();
