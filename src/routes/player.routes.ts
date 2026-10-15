import { Router } from 'express';
import { getMyPlayer, getPlayer, listPlayers, updateMyPlayer } from '../controllers/player.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.get('/', listPlayers);
router.get('/me', requireAuth, requireRole('player'), getMyPlayer);
router.patch('/me', requireAuth, requireRole('player'), updateMyPlayer);
router.get('/:id', getPlayer);
export default router;
