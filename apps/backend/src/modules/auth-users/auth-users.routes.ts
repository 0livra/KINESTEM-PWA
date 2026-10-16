import { Router } from 'express';
import { authUsersController } from './auth-users.controller';

const router = Router();
router.post('/register', authUsersController.register);
router.get('/:id', authUsersController.getUser);
router.post('/pairing/generate-pin', authUsersController.generatePin);
router.post('/pairing/link-rfid', authUsersController.linkRfid);
router.post('/pairing/identify', authUsersController.identifyByRfid);
export const authUsersRoutes = router;
