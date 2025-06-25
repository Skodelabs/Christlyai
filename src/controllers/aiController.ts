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

    console.log("Generating story for user", req.user.userId);
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Extract parameters from either query params (GET) or body (POST)
    let topic, storyType, wordCount, generateImage, generateAudio;
    
    if (req.method === 'POST') {
      topic = req.body.topic;
      storyType = req.body.storyType || 'real';
      wordCount = parseInt(req.body.wordCount || '500', 10);
      generateImage = req.body.generateImage !== undefined ? req.body.generateImage : true;
      generateAudio = req.body.generateAudio !== undefined ? req.body.generateAudio : true;
    } else {
      topic = req.query.topic as string | undefined;
      storyType = (req.query.storyType as 'real' | 'imaginary') || 'real';
      wordCount = parseInt(req.query.wordCount as string || '500', 10);
      generateImage = req.query.generateImage !== 'false';
      generateAudio = req.query.generateAudio !== 'false';
    }
    
    console.log(`Story generation parameters: topic=${topic}, type=${storyType}, wordCount=${wordCount}, generateImage=${generateImage}, generateAudio=${generateAudio}`);
    
    // Cap word count to prevent excessive content size
    if (wordCount > 1000) {
      wordCount = 1000;
    }
    const isGenerateImage = generateImage !== undefined ? generateImage : true;
    const isGenerateAudio = generateAudio !== undefined ? generateAudio : true;
    
    // Generate devotional story with optional image and audio
    const { title, story, imageUrl, audioUrl, tokensUsed } = await openaiService.generateDevotionalStory(
      req.user.userId,
      [], // No need to pass previous titles
      topic,
      storyType,
      wordCount,
      isGenerateImage,
      isGenerateAudio
    );
    
    // Log the interaction
    await AILog.create({
      userId,
      interactionType: 'story',
      prompt: JSON.stringify({ topic: topic || 'random', storyType, wordCount }),
      response: JSON.stringify({ title, story, imageUrl, audioUrl }),
      tokensUsed,
    });
    
    // Send the response
    res.status(200).json({
      status: 'success',
      data: {
        title,
        story,
        imageUrl,
        audioUrl,
      },
    });
  } catch (error: any) {
    console.error('Story generation error:', error.message);
    next(error);
  }
};
