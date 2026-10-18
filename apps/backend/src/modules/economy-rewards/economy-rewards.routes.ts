import { Router } from 'express';
import { economyRewardsController } from './economy-rewards.controller';

const router = Router();
router.get('/recompensas', economyRewardsController.listRecompensas);
router.post('/matches/:matchId/loot', economyRewardsController.distributeLoot);
router.post('/roulette/spin', economyRewardsController.spin);
router.post('/roulette/settle', economyRewardsController.settle);
export const economyRewardsRoutes = router;
