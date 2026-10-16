import { Router } from 'express';
import { matchesController } from './matches.controller';

const router = Router();
router.post('/', matchesController.create);
router.get('/:id', matchesController.getById);
router.post('/:id/start', matchesController.start);
router.post('/:id/finalize', matchesController.finalize);
export const matchesRoutes = router;
