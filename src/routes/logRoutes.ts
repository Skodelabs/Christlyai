import { Router } from 'express';
import { 
  getUserLogs, 
  getAnalyticsSummary, 
  getPastDevotionalStories,
  getFavoriteDevotionalStories,
  toggleFavoriteStory,
  saveDailyStory,
  getDevotionalStoryById 
} from '../controllers/logController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All log routes require authentication
router.use(authenticate);

// Log routes
router.get('/', getUserLogs);
router.get('/analytics', getAnalyticsSummary);
router.get('/devotional-stories', getPastDevotionalStories);

// Get favorite devotional stories
router.get('/favorite-devotional-stories', getFavoriteDevotionalStories);

// Get a specific devotional story by ID
router.get('/devotional-story/:storyId', getDevotionalStoryById);

// Toggle favorite status of a story
router.patch('/stories/:storyId/favorite', toggleFavoriteStory);

// Save daily story to get a real ObjectId
router.post('/save-daily-story', saveDailyStory);

export default router;
