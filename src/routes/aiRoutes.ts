import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// AI routes
router.get('/daily-quote', aiController.getDailyQuote);
router.post('/prayer', aiController.generatePrayer);
router.get('/story', aiController.generateStory);

export default router;
