import { Router } from 'express';
import { changePassword } from '../controllers/userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/me/password', requireAuth, changePassword);

export default router;
