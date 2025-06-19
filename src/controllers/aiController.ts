import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/error';
import { AILog } from '../models/AILog';
import * as openaiService from '../services/openaiService';

/**
 * Get daily Bible quote with explanation
 */
export const getDailyQuote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Generate daily quote
    const { quote, reference, explanation, tokensUsed } = await openaiService.generateDailyQuote();
    
    // Log the interaction with structured data
    await AILog.create({
      userId,
      interactionType: 'daily-quote',
      prompt: 'Daily Bible quote request',
      response: JSON.stringify({
        quote,
        reference,
        explanation
      }),
      tokensUsed,
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        quote,
        reference,
        explanation,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate personalized prayer based on user mood
 */
export const generatePrayer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const { mood, situation } = req.body;
    
    if (!mood) {
      throw new AppError('Mood is required', 400);
    }
    
    // Situation is optional but we'll pass it if provided
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Generate prayer with situation if provided
    const { prayer, tokensUsed } = await openaiService.generatePrayer(mood, situation);
    
    // Log the interaction with structured data
    await AILog.create({
      userId,
      interactionType: 'prayer',
      prompt: situation 
        ? `Prayer request for mood: ${mood}, situation: ${situation}` 
        : `Prayer request for mood: ${mood}`,
      response: JSON.stringify({
        prayer,
        situation
      }),
      tokensUsed,
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        prayer,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate devotional story with image
 */
export const generateStory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Generate devotional story with image and audio
    const { title, story, imageUrl, audioUrl, tokensUsed } = await openaiService.generateDevotionalStory();
    
    // Log the interaction with structured data
    await AILog.create({
      userId,
      interactionType: 'story',
      prompt: 'Devotional story request',
      response: JSON.stringify({
        title,
        story,
        imageUrl,
        audioUrl
      }),
      tokensUsed,
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        title,
        story,
        imageUrl,
        audioUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};
