import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, getMe, forgotPassword } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Max 10 failed attempts per IP per 15 minutes — prevents brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in 15 minutes.' },
});

router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.post('/forgot-password', loginLimiter, forgotPassword);
router.get('/me', requireAuth, getMe);

export default router;
