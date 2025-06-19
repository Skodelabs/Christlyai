import express from 'express';
import * as gameController from '../controllers/gameController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Generate a new quiz
router.post('/quiz/new', gameController.generateNewQuiz);

// Get current quiz
router.get('/quiz/current', gameController.getCurrentQuiz);

// Submit answer
router.post('/quiz/answer', gameController.submitAnswer);

// Get quiz history
router.get('/quiz/history', gameController.getQuizHistory);

export default router;
