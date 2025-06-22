import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/error';
import { BibleQuiz } from '../models/BibleQuiz';
import * as openaiService from '../services/openaiService';

/**
 * Generate a new Bible quiz with 10 questions
 */
export const generateNewQuiz = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Get previously asked questions from completed quizzes
    const completedQuizzes = await BibleQuiz.find({ 
      userId, 
      completed: true 
    }).sort({ createdAt: -1 }).limit(10);
    
    // Extract all questions from previous quizzes to avoid duplicates
    const previousQuestions: string[] = [];
    completedQuizzes.forEach(quiz => {
      quiz.questions.forEach(q => {
        previousQuestions.push(q.question);
      });
    });
    
    console.log(`Found ${previousQuestions.length} previous questions to avoid duplicates`);
    
    // Generate 10 Bible quiz questions, passing previous questions to avoid duplicates
    const questions = await openaiService.generateBibleQuizQuestions(previousQuestions);
    
    // Create a new quiz in the database
    const quiz = await BibleQuiz.create({
      userId,
      questions,
      score: 0,
      completed: false
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        quizId: quiz._id,
        currentQuestion: quiz.questions[0]
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get the current quiz for a user
 */
export const getCurrentQuiz = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Find the most recent incomplete quiz for this user
    const quiz = await BibleQuiz.findOne({ 
      userId, 
      completed: false 
    }).sort({ createdAt: -1 });
    
    if (!quiz) {
      return res.status(404).json({
        status: 'fail',
        message: 'No active quiz found. Please start a new quiz.'
      });
    }
    
    // Calculate which question to send based on the current score
    // (assuming each correct answer adds 1 to the score)
    const currentQuestionIndex = quiz.score;
    
    // If all questions have been answered but quiz not marked as completed
    if (currentQuestionIndex >= quiz.questions.length) {
      quiz.completed = true;
      await quiz.save();
      
      return res.status(200).json({
        status: 'success',
        data: {
          quizId: quiz._id,
          completed: true,
          score: quiz.score,
          totalQuestions: quiz.questions.length
        }
      });
    }
    
    // Return the current question
    res.status(200).json({
      status: 'success',
      data: {
        quizId: quiz._id,
        currentQuestion: quiz.questions[currentQuestionIndex],
        questionNumber: currentQuestionIndex + 1,
        totalQuestions: quiz.questions.length,
        score: quiz.score
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit an answer for the current question
 */
export const submitAnswer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { quizId, answer } = req.body;
    
    if (!quizId || !answer) {
      throw new AppError('Quiz ID and answer are required', 400);
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Find the quiz
    const quiz = await BibleQuiz.findOne({ 
      _id: quizId,
      userId,
      completed: false
    });
    
    if (!quiz) {
      throw new AppError('Quiz not found or already completed', 404);
    }
    
    // Get the current question based on the score
    const currentQuestionIndex = quiz.score;
    
    if (currentQuestionIndex >= quiz.questions.length) {
      throw new AppError('Quiz already completed', 400);
    }
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isCorrect = currentQuestion.correctAnswer === answer;
    
    // Track the user's score separately from question progression
    let userScore = quiz.score;
    
    // If answer is correct, increment the user's score
    if (isCorrect) {
      userScore += 1;
    }
    
    // Always advance to the next question, regardless of whether the answer was correct
    // This ensures users don't get stuck on a question they can't answer
    quiz.score = currentQuestionIndex + 1;
    
    // Check if this was the last question
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;
    
    if (isLastQuestion) {
      quiz.completed = true;
    }
    
    await quiz.save();
    
    // Return the result with explanation
    res.status(200).json({
      status: 'success',
      data: {
        isCorrect,
        correctAnswer: currentQuestion.correctAnswer,
        explanation: currentQuestion.explanation,
        score: userScore, // Use the actual user score (correct answers count)
        completed: quiz.completed,
        nextQuestionNumber: isLastQuestion ? null : currentQuestionIndex + 2,
        totalQuestions: quiz.questions.length
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get quiz history for a user
 */
export const getQuizHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Find all completed quizzes for this user
    const quizzes = await BibleQuiz.find({ 
      userId, 
      completed: true 
    }).sort({ createdAt: -1 });
    
    // Calculate total score across all quizzes
    const totalScore = quizzes.reduce((sum, quiz) => sum + quiz.score, 0);
    const totalQuizzes = quizzes.length;
    
    res.status(200).json({
      status: 'success',
      data: {
        quizzes: quizzes.map(quiz => ({
          id: quiz._id,
          score: quiz.score,
          totalQuestions: quiz.questions.length,
          createdAt: quiz.createdAt
        })),
        stats: {
          totalScore,
          totalQuizzes,
          averageScore: totalQuizzes > 0 ? totalScore / totalQuizzes : 0
        }
      },
    });
  } catch (error) {
    next(error);
  }
};
