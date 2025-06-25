import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';

import { AppError } from '../middleware/error';
import { config } from '../config/env';
import { User, IUser } from '../models/User';
import { Prayer } from '../models/Prayer';
import { Inspiration } from '../models/Inspiration';
import { AILog } from '../models/AILog';

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
          createdAt: user.createdAt,
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

/**
 * Google Sign-In
 */
export const googleSignIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { idToken, userData } = req.body;
    
    console.log('Received Google sign-in request:', { 
      hasIdToken: !!idToken, 
      hasUserData: !!userData 
    });
    
    if (!idToken) {
      throw new AppError('ID token is required', 400);
    }
    
    let googleId, email, name, picture;
    
    try {
      // Verify the Google ID token
      const googleResponse = await axios.get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${idToken}`
      );
      
      // Extract data from token verification
      googleId = googleResponse.data.sub;
      email = googleResponse.data.email;
      name = googleResponse.data.name;
      picture = googleResponse.data.picture;
    } catch (tokenError) {
      console.error('Error verifying Google token:', tokenError);
      
      // Fallback to user data if token verification fails
      if (userData) {
        googleId = userData.id;
        email = userData.email;
        name = userData.name || userData.givenName;
        picture = userData.photo;
      } else {
        throw new AppError('Invalid Google token and no user data provided', 401);
      }
    }
    
    if (!googleId || !email) {
      throw new AppError('Invalid Google authentication data', 401);
    }
    
    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId });
    
    if (!user) {
      // Check if user exists with this email
      user = await User.findOne({ email });
      
      if (user) {
        // Update existing user with Google ID
        user.googleId = googleId;
        user.authProvider = 'google';
        if (picture) user.profilePicture = picture;
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          name: name || email.split('@')[0],
          email,
          googleId,
          authProvider: 'google',
          profilePicture: picture || null,
          password: Math.random().toString(36).slice(-8), // Random password (not used)
        });
      }
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
          profilePicture: user.profilePicture,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Error with Google sign-in:', error);
    next(error);
  }
};

/**
 * Apple Sign-In
 */
export const appleSignIn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { identityToken, user: appleUserId, fullName, userData } = req.body;
    
    console.log('Received Apple sign-in request:', { 
      hasIdentityToken: !!identityToken, 
      appleUserId: appleUserId || 'missing',
      hasFullName: !!fullName,
      hasUserData: !!userData
    });
    
    if (!identityToken || !appleUserId) {
      throw new AppError('Identity token and user ID are required', 400);
    }
    
    // Apple doesn't provide email on subsequent sign-ins, so we need to rely on the appleUserId
    // We'll use the userData provided by the client if available
    
    // Check if user exists with this Apple ID
    let user = await User.findOne({ appleUserId });
    
    if (!user) {
      // If we have email from userData, check if user exists with this email
      if (userData && userData.email) {
        user = await User.findOne({ email: userData.email });
      }
      
      if (user) {
        // Update existing user with Apple ID
        user.appleUserId = appleUserId;
        user.authProvider = 'apple';
        await user.save();
      } else {
        // Create new user
        // For Apple Sign In, we might not have email on subsequent sign-ins
        // So we'll use the best information available
        const name = fullName ? 
          `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : 
          (userData?.name || `Apple User ${appleUserId.substring(0, 6)}`);
        
        const email = userData?.email || `apple_${appleUserId}@example.com`;
        
        user = await User.create({
          name,
          email,
          appleUserId,
          authProvider: 'apple',
          password: Math.random().toString(36).slice(-8), // Random password (not used)
        });
      }
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
          profilePicture: user.profilePicture,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Error with Apple sign-in:', error);
    next(error);
  }
};

/**
 * Delete user account
 */
export const deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    // Find the user to be deleted
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Delete user's prayers
      await Prayer.deleteMany({ userId }, { session });
      
      // Delete user's inspirations
      await Inspiration.deleteMany({ userId }, { session });
      
      // Delete user's AI logs
      await AILog.deleteMany({ userId }, { session });
      
      // Delete the user
      await User.findByIdAndDelete(userId, { session });
      
      // Commit the transaction
      await session.commitTransaction();
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      throw error;
    } finally {
      // End session
      session.endSession();
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    next(error);
  }
};

/**
 * Change user password
 */
export const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }
    
    // Find user
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Skip password check for social auth users who don't have a password
    if (user.authProvider === 'local') {
      // Verify current password
      const isPasswordCorrect = await user.comparePassword(currentPassword);
      if (!isPasswordCorrect) {
        throw new AppError('Current password is incorrect', 401);
      }
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    next(error);
  }
};

/**
 * Get prayer count for a user
 */
export const getPrayerCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Reset prayer count if it's a new day and user is not pro
    if (!user.isPro && user.lastPrayerDate) {
      const lastDate = new Date(user.lastPrayerDate);
      const today = new Date();
      
      if (lastDate.toDateString() !== today.toDateString()) {
        user.prayerCount = 0;
        await user.save();
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        prayerCount: user.prayerCount,
        isPro: user.isPro,
        lastPrayerDate: user.lastPrayerDate
      }
    });
  } catch (error) {
    console.error('Error getting prayer count:', error);
    next(error);
  }
};

/**
 * Increment prayer count for a user
 */
export const incrementPrayerCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // If user is pro, always allow prayer creation
    if (user.isPro) {
      res.status(200).json({
        status: 'success',
        data: {
          canCreatePrayer: true,
          prayerCount: user.prayerCount,
          isPro: true
        }
      });
      return;
    }
    
    // For free users, check if they've reached the limit (1 prayer total, not per day)
    if (user.prayerCount >= 1) {
      res.status(200).json({
        status: 'success',
        data: {
          canCreatePrayer: false,
          prayerCount: user.prayerCount,
          isPro: false,
          message: 'Free users can only create 1 prayer. Please upgrade to Pro for unlimited prayers.'
        }
      });
      return;
    }
    
    // Increment prayer count and update last prayer date
    user.prayerCount += 1;
    user.lastPrayerDate = new Date();
    await user.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        canCreatePrayer: true,
        prayerCount: user.prayerCount,
        isPro: false
      }
    });
  } catch (error) {
    console.error('Error incrementing prayer count:', error);
    next(error);
  }
};

/**
 * Update user's pro status
 */
/**
 * Get daily inspiration status for a user
 */
export const getDailyInspiration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Reset daily inspiration if it's a new day and user is not pro
    if (!user.isPro && user.lastInspirationDate) {
      const lastDate = new Date(user.lastInspirationDate);
      const today = new Date();
      
      if (lastDate.toDateString() !== today.toDateString()) {
        user.hasUsedDailyInspiration = false;
        await user.save();
      }
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        hasUsedDailyInspiration: user.hasUsedDailyInspiration,
        isPro: user.isPro,
        lastInspirationDate: user.lastInspirationDate
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark daily inspiration as used
 */
export const markDailyInspirationAsUsed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Check if user is Pro or hasn't used daily inspiration yet
    const canUseInspiration = user.isPro || !user.hasUsedDailyInspiration;
    
    if (canUseInspiration) {
      // If not Pro, mark as used
      if (!user.isPro) {
        user.hasUsedDailyInspiration = true;
      }
      
      // Update last inspiration date
      user.lastInspirationDate = new Date();
      await user.save();
      
      res.status(200).json({
        status: 'success',
        data: {
          canUseInspiration: true,
          hasUsedDailyInspiration: user.hasUsedDailyInspiration,
          isPro: user.isPro,
          lastInspirationDate: user.lastInspirationDate
        }
      });
    } else {
      res.status(200).json({
        status: 'success',
        data: {
          canUseInspiration: false,
          hasUsedDailyInspiration: true,
          isPro: user.isPro,
          message: 'You have used your daily inspiration for today. Please upgrade to Pro for unlimited inspirations.'
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

export const updateProStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }
    
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const { isPro } = req.body;
    
    if (typeof isPro !== 'boolean') {
      throw new AppError('isPro must be a boolean value', 400);
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    user.isPro = isPro;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        isPro: user.isPro
      }
    });
  } catch (error) {
    console.error('Error updating pro status:', error);
    next(error);
  }
};
