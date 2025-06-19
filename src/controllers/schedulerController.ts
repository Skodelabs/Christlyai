import { AILog } from '../models/AILog';
import mongoose from 'mongoose';

/**
 * Create a scheduled story for all active users
 * This is used by the scheduler service
 */
export const createScheduledStory = async (storyData: {
  title: string;
  story: string;
  imageUrl: string;
  audioUrl: string;
}): Promise<{ title: string; storyId: string } | null> => {
  try {
    // Get all active users
    const User = mongoose.model('User');
    const activeUsers = await User.find({ isActive: true });
    
    if (!activeUsers || activeUsers.length === 0) {
      console.log('No active users found for scheduled story');
      return null;
    }
    
    // Create a story entry for each active user
    const creationDate = new Date();
    const storyPromises = activeUsers.map(user => {
      const newStory = new AILog({
        userId: user._id,
        interactionType: 'story',
        prompt: 'Daily devotional story',
        response: JSON.stringify(storyData),
        tokensUsed: 0,
        createdAt: creationDate,
        isFavorite: false
      });
      
      return newStory.save();
    });
    
    // Wait for all stories to be created
    const createdStories = await Promise.all(storyPromises) as Array<mongoose.Document & { _id: mongoose.Types.ObjectId }>;
    
    if (createdStories.length > 0) {
      // Return the first story ID as reference
      return {
        title: storyData.title,
        storyId: createdStories[0]._id.toString()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error creating scheduled story:', error);
    return null;
  }
};
