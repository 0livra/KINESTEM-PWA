import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthUsersService, authUsersService } from './auth-users.service';

const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
  avatarId: z.string().regex(/^[a-z0-9_]+$/).max(32).optional(),
});
const generatePinSchema = z.object({ userId: z.number().int().positive() });
const linkRfidSchema = z.object({
  pinTemporal: z.string().length(4).regex(/^\d{4}$/),
  rfidUid: z.string().min(4).max(32),
  matchId: z.number().int().positive().optional(),
});
const identifySchema = z.object({ rfidUid: z.string().min(4).max(32) });

export class AuthUsersController {
  constructor(private readonly service: AuthUsersService = authUsersService) {}

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = registerSchema.parse(req.body);
      const profile = await this.service.register(validated);
      res.status(201).json({ success: true, data: profile });
    } catch (err) { next(err); }
  };

  public generatePin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = generatePinSchema.parse(req.body);
      const result = await this.service.generatePairingPin(userId);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  };

  public linkRfid = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = linkRfidSchema.parse(req.body);
      const profile = await this.service.linkRfidWithPin(validated);
      res.json({ success: true, message: 'RFID vinculado.', data: profile });
    } catch (err) { next(err); }
  };

  public identifyByRfid = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { rfidUid } = identifySchema.parse(req.body);
      const profile = await this.service.identifyByRfid(rfidUid);
      res.json({ success: true, data: profile });
    } catch (err) { next(err); }
  };

  public getUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = z.coerce.number().int().positive().parse(req.params['id']);
      const profile = await this.service.getUserById(userId);
      res.json({ success: true, data: profile });
    } catch (err) { next(err); }
  };
}

export const authUsersController = new AuthUsersController();
