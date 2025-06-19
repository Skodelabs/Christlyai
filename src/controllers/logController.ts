import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/error';
import { AILog } from '../models/AILog';

/**
 * Get all logs for a user
 */
export const getUserLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Get logs with pagination
    const logs = await AILog.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const totalLogs = await AILog.countDocuments({ userId });
    
    res.status(200).json({
      status: 'success',
      results: logs.length,
      totalPages: Math.ceil(totalLogs / limit),
      currentPage: page,
      data: {
        logs,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get analytics summary
 */
export const getAnalyticsSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Get interaction counts by type
    const interactionCounts = await AILog.aggregate([
      { $match: { userId } },
      { $group: { _id: '$interactionType', count: { $sum: 1 } } },
    ]);
    
    // Get total tokens used
    const tokensResult = await AILog.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalTokens: { $sum: '$tokensUsed' } } },
    ]);
    
    const totalTokens = tokensResult.length > 0 ? tokensResult[0].totalTokens : 0;
    
    // Format interaction counts
    const interactionsByType = interactionCounts.reduce((acc: Record<string, number>, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
    
    res.status(200).json({
      status: 'success',
      data: {
        interactionsByType,
        totalTokens,
        totalInteractions: await AILog.countDocuments({ userId }),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get past devotional stories for a user
 */
export const getPastDevotionalStories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Get only story interactions
    const stories = await AILog.find({ 
      userId, 
      interactionType: 'story' 
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count
    const totalStories = await AILog.countDocuments({ 
      userId, 
      interactionType: 'story' 
    });
    
    // Process the stories to extract title and date
    const processedStories = stories.map(story => {
      let title = 'Untitled Story';
      try {
        const storyData = JSON.parse(story.response);
        if (storyData && storyData.title) {
          title = storyData.title;
        }
      } catch (e) {
        console.error('Error parsing story response:', e);
      }

      return {
        id: story._id,
        title,
        date: story.createdAt,
        response: story.response,
        isFavorite: story.isFavorite || false
      };
    });
    
    res.status(200).json({
      status: 'success',
      stories: processedStories,
      pagination: {
        page,
        limit,
        total: totalStories,
        pages: Math.ceil(totalStories / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get favorite devotional stories for a user
 */
export const getFavoriteDevotionalStories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Get only favorite story interactions
    const stories = await AILog.find({ 
      userId, 
      interactionType: 'story',
      isFavorite: true
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await AILog.countDocuments({ 
      userId, 
      interactionType: 'story',
      isFavorite: true
    });

    // Process stories to extract title and date
    const processedStories = stories.map(story => {
      let title = 'Untitled Story';
      try {
        const storyData = JSON.parse(story.response);
        if (storyData && storyData.title) {
          title = storyData.title;
        }
      } catch (e) {
        console.error('Error parsing story response:', e);
      }

      return {
        id: story._id,
        title,
        date: story.createdAt,
        response: story.response,
        isFavorite: true
      };
    });

    res.status(200).json({
      status: 'success',
      stories: processedStories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle favorite status of a story
 */
export const toggleFavoriteStory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const storyId = req.params.storyId;
    
    // Find the story and ensure it belongs to the user
    const story = await AILog.findOne({ 
      _id: storyId,
      userId,
      interactionType: 'story'
    });
    
    if (!story) {
      throw new AppError('Story not found or you do not have permission to modify it', 404);
    }
    
    // Toggle the favorite status
    story.isFavorite = !story.isFavorite;
    await story.save();
    
    res.status(200).json({
      status: 'success',
      isFavorite: story.isFavorite
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save daily story to database to get a proper ObjectId
 */
export const saveDailyStory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const { title, content, imageUrl, audioUrl, date } = req.body;
    
    // Create a new story log entry
    const storyData = {
      title,
      story: content,
      imageUrl,
      audioUrl
    };
    
    // Save as an AI log entry
    const newStory = new AILog({
      userId,
      interactionType: 'story',
      prompt: 'Daily devotional story',
      response: JSON.stringify(storyData),
      tokensUsed: 0,
      createdAt: new Date(date),
      isFavorite: false
    });
    
    await newStory.save();
    
    res.status(201).json({
      status: 'success',
      storyId: newStory._id
    });
  } catch (error) {
    next(error);
  }
};
