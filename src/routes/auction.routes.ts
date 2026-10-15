import { Router } from 'express';
import { currentAuction, startLot, bid, finalCall, endLot, markUnsold } from '../controllers/auction.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.get('/current', currentAuction);
router.post('/start', requireAuth, requireRole('admin'), startLot);
router.post('/bid', requireAuth, bid);
router.post('/final-call', requireAuth, requireRole('admin'), finalCall);
router.post('/end', requireAuth, requireRole('admin'), endLot);
router.post('/unsold', requireAuth, requireRole('admin'), markUnsold);
export default router;
