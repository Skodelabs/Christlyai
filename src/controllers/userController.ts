import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';

import { AppError } from '../middleware/error';
import { config } from '../config/env';
import { User, IUser } from '../models/User';

/**
 * Register a new user
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('User with this email already exists', 400);
    }
    
    // Create new user
    const user = await User.create({
      name,
      email,
      password,
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString() },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }
    
    // Check if password is correct
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      throw new AppError('Invalid email or password', 401);
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString() },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    next(error);
  }
};

/**
 * Get user profile
 */
export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    
    console.log('User ID from token:', req.user.userId);
    
    // Validate that userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      console.error('Invalid user ID format:', req.user.userId);
      throw new AppError('Invalid user ID format', 400);
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    console.log('Looking for user with ID:', userId);
    
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found with ID:', userId);
      throw new AppError('User not found', 404);
    }
    
    console.log('User found:', user.name, user.email);
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    next(error);
  }
};

/**
 * Update user notification settings
 */
export const updateNotificationSettings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const { notificationToken, isActive, preferredNotificationTime } = req.body;
    
    // Find user and update notification settings
    const updateData: Partial<IUser> = {};
    
    // Only update fields that are provided
    if (notificationToken !== undefined) {
      updateData.notificationToken = notificationToken;
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }
    
    if (preferredNotificationTime !== undefined) {
      // Validate time format (HH:MM)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(preferredNotificationTime)) {
        throw new AppError('Invalid time format. Use HH:MM format (24-hour)', 400);
      }
      updateData.preferredNotificationTime = preferredNotificationTime;
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      throw new AppError('User not found', 404);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          notificationToken: updatedUser.notificationToken,
          isActive: updatedUser.isActive,
          preferredNotificationTime: updatedUser.preferredNotificationTime
        }
      }
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    next(error);
  }
};
