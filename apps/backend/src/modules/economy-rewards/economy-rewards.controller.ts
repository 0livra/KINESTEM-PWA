import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EconomyRewardsService, economyRewardsService } from './economy-rewards.service';

const distributeLootSchema = z.object({
  playerResults: z.array(z.object({
    userId: z.number().int().positive(),
    rondasSuperadas: z.number().int().min(0),
    esSobreviviente: z.boolean(),
  })).min(1),
});

const spinSchema = z.object({
  userId: z.number().int().positive(),
  recompensaId: z.number().int().positive(),
  puntosApostados: z.number().int().positive(),
});

export class EconomyRewardsController {
  constructor(private readonly service: EconomyRewardsService = economyRewardsService) {}

  public listRecompensas = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.listRecompensas() }); }
    catch (err) { next(err); }
  };

  public distributeLoot = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const matchId = z.coerce.number().int().positive().parse(req.params['matchId']);
      const { playerResults } = distributeLootSchema.parse(req.body);
      res.json({ success: true, data: await this.service.distributeMatchLoot(matchId, playerResults) });
    } catch (err) { next(err); }
  };

  public spin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = spinSchema.parse(req.body);
      res.json({ success: true, data: await this.service.spinRoulette(validated.userId, validated.recompensaId, validated.puntosApostados) });
    } catch (err) { next(err); }
  };
}

export const economyRewardsController = new EconomyRewardsController();
