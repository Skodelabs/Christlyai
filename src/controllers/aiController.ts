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
 * Generate personalized prayer based on user mood and recipient
 */
export const generatePrayer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    console.log(req.body);
    const { mood, situation, recipient } = req.body;
    
    if (!mood) {
      throw new AppError('Mood is required', 400);
    }
    
    // Situation and recipient are optional but we'll pass them if provided
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Generate prayer with situation and recipient if provided
    const { prayer, imagePrompt, imageUrl, tokensUsed } = await openaiService.generatePrayer(mood, situation, recipient);
    
    // Log the interaction with structured data
    await AILog.create({
      userId,
      interactionType: 'prayer',
      prompt: JSON.stringify({
        mood,
        situation: situation || null,
        recipient: recipient || null
      }),
      response: JSON.stringify({
        prayer,
        imagePrompt,
        imageUrl,
        situation: situation || null,
        recipient: recipient || null
      }),
      tokensUsed,
    });
    console.log("Prayer generated successfully", );
    res.status(200).json({
      status: 'success',
      data: {
        prayer,
        imageUrl,
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
    
    // Fetch previous story titles for this user to avoid repetition
    const previousStoryLogs = await AILog.find({
      userId,
      interactionType: 'story'
    }).sort({ createdAt: -1 }).limit(20); // Get the 20 most recent stories
    
    // Extract titles from the response JSON
    const previousTitles = previousStoryLogs.map(log => {
      try {
        const response = JSON.parse(log.response);
        return response.title;
      } catch (e) {
        return null;
      }
    }).filter(Boolean); // Remove any null values
    
    // Generate devotional story with image and audio, passing user ID and previous titles
    const { title, story, imageUrl, audioUrl, tokensUsed } = await openaiService.generateDevotionalStory(
      req.user.userId,
      previousTitles
    );
    
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
