import { Router } from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateNotificationSettings, 
  googleSignIn, 
  appleSignIn,
  deleteAccount,
  changePassword
} from '../controllers/userController';
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
router.delete('/account', authenticate, deleteAccount);
router.post('/change-password', authenticate, changePassword);

export default router;
