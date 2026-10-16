import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TelemetryService, telemetryService } from './telemetry.service';

const recordSchema = z.object({
  match_id: z.number().int(),
  user_id: z.number().int(),
  estacion_hardware_id: z.number().int().optional(),
  ronda: z.number().int().positive(),
  microjuego_id: z.string().min(1),
  concepto_stem: z.string().min(1),
  dificultad_nivel: z.number().int().optional(),
  tiempo_limite_ms: z.number().int().positive(),
  tipo_resultado: z.enum(['EXITO', 'ERROR_COMPONENTE', 'TIMEOUT']),
  accion_fisica: z.object({
    componente_esperado: z.string().optional(),
    componente_utilizado: z.string().optional(),
    tiempo_reaccion_ms: z.number().int().optional(),
    es_secuencia: z.boolean().optional(),
    precision_secuencia_pct: z.number().optional(),
  }).nullable().optional(),
  vidas_restantes: z.number().int().min(0),
  jugador_eliminado: z.boolean(),
});

export class TelemetryController {
  constructor(private readonly service: TelemetryService = telemetryService) {}

  public record = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validated = recordSchema.parse(req.body);
      res.status(201).json({ success: true, data: await this.service.recordMicrogameTelemetry(validated) });
    } catch (err) { next(err); }
  };

  public getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const matchId = z.coerce.number().int().positive().parse(req.params['matchId']);
      res.json({ success: true, data: await this.service.getPostMatchDashboard(matchId) });
    } catch (err) { next(err); }
  };
}

export const telemetryController = new TelemetryController();
