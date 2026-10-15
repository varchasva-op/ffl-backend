import { Router } from 'express';
import { login, me, registerPlayer } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.post('/register', registerPlayer);
router.post('/login', login);
router.get('/me', requireAuth, me);
export default router;
