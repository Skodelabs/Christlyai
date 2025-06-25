import { Router } from 'express';
import { 
  register, 
  login, 
  getProfile, 
  updateNotificationSettings, 
  googleSignIn, 
  appleSignIn,
  deleteAccount,
  changePassword,
  getPrayerCount,
  incrementPrayerCount,
  getDailyInspiration,
  markDailyInspirationAsUsed,
  updateProStatus
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

// Prayer count routes
router.get('/prayer-count', authenticate, getPrayerCount);
router.post('/prayer-count/increment', authenticate, incrementPrayerCount);

// Daily inspiration routes
router.get('/daily-inspiration', authenticate, getDailyInspiration);
router.post('/daily-inspiration/use', authenticate, markDailyInspirationAsUsed);

// Subscription routes
router.patch('/pro-status', authenticate, updateProStatus);

export default router;
