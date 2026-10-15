import { Router } from 'express';
import { createTeam, deleteTeam, listTeams, updateTeam } from '../controllers/team.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.get('/', listTeams);
router.post('/', requireAuth, requireRole('admin'), createTeam);
router.patch('/:id', requireAuth, requireRole('admin'), updateTeam);
router.delete('/:id', requireAuth, requireRole('admin'), deleteTeam);
export default router;
