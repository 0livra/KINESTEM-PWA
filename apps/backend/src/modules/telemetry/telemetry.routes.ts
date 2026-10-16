import { Router } from 'express';
import { telemetryController } from './telemetry.controller';

const router = Router();
router.post('/record', telemetryController.record);
router.get('/dashboard/:matchId', telemetryController.getDashboard);
export const telemetryRoutes = router;
