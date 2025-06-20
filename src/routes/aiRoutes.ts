import { Router } from 'express';
import * as aiController from '../controllers/aiController';
import * as topicController from '../controllers/topicController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

// AI routes
router.get('/daily-quote', aiController.getDailyQuote);
router.post('/prayer', aiController.generatePrayer);
router.get('/story', aiController.generateStory);

// Topic content routes
router.post('/topic-content', topicController.generateTopicContent);
router.get('/topic-content', topicController.getUserTopicContent);
router.get('/topic-content/:id', topicController.getTopicContentById);

export default router;
