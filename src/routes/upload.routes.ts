import { Router } from 'express';
import { uploadMyPlayerPhoto } from '../controllers/upload.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { playerPhotoUpload } from '../middleware/upload';

const router = Router();
router.post('/player-photo', requireAuth, requireRole('player'), playerPhotoUpload.single('photo'), uploadMyPlayerPhoto);
export default router;
