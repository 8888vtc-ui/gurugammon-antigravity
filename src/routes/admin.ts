// src/routes/admin.ts
// FIXED: Already using Router() correctly
import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/tournaments', AdminController.getTournaments);
router.post('/invites', AdminController.createInviteLink);

export default router;
