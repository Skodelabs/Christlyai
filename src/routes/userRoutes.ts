import { Router } from 'express';
import { register, login, getProfile, updateNotificationSettings, googleSignIn, appleSignIn } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google-signin', googleSignIn);
router.post('/apple-signin', appleSignIn);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.patch('/notification-settings', authenticate, updateNotificationSettings);

export default router;
