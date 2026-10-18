import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MatchesService, matchesService } from './matches.service';

export class MatchesController {
  constructor(private readonly service: MatchesService = matchesService) {}

  public create = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.status(201).json({ success: true, data: await this.service.createMatch() }); }
    catch (err) { next(err); }
  };

  /** Partida activa mas reciente (registrada ANTES de /:id). */
  public getActive = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { res.json({ success: true, data: await this.service.getActiveMatch() }); }
    catch (err) { next(err); }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const matchId = z.coerce.number().int().positive().parse(req.params['id']);
      res.json({ success: true, data: await this.service.getMatchWithParticipants(matchId) });
    } catch (err) { next(err); }
  };

  public start = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const matchId = z.coerce.number().int().positive().parse(req.params['id']);
      res.json({ success: true, data: await this.service.startMatch(matchId) });
    } catch (err) { next(err); }
  };

  public finalize = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const matchId = z.coerce.number().int().positive().parse(req.params['id']);
      res.json({ success: true, data: await this.service.finalizeMatch(matchId) });
    } catch (err) { next(err); }
  };
}

export const matchesController = new MatchesController();
