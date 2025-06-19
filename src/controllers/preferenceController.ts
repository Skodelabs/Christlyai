import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../middleware/error';
import { Preference } from '../models/Preference';

/**
 * Get user preferences
 */
export const getUserPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Find user preferences or create default if not exists
    let preferences = await Preference.findOne({ userId });
    
    if (!preferences) {
      preferences = await Preference.create({
        userId,
        theme: 'system',
        prayerFocus: ['general'],
        bibleVersion: 'NIV',
        notificationTime: '08:00',
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user preferences
 */
export const updateUserPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const { theme, prayerFocus, bibleVersion, notificationTime } = req.body;
    
    // Find and update preferences, create if not exists
    const preferences = await Preference.findOneAndUpdate(
      { userId },
      {
        theme,
        prayerFocus,
        bibleVersion,
        notificationTime,
      },
      { new: true, upsert: true }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};
