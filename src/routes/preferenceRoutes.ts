import { Router } from 'express';
import * as preferenceController from '../controllers/preferenceController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All preference routes require authentication
router.use(authenticate);

// Preference routes
router.get('/', preferenceController.getUserPreferences);
router.post('/', preferenceController.updateUserPreferences);

export default router;
