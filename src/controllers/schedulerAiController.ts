import * as openaiService from '../services/openaiService';

/**
 * Generate devotional story for scheduled creation
 * This is used by the scheduler service
 */
export const generateDevotionalStory = async (): Promise<{
  title: string;
  story: string;
  imageUrl: string;
  audioUrl: string;
  tokensUsed: number;
} | null> => {
  try {
    // Generate devotional story with image and audio
    const result = await openaiService.generateDevotionalStory();
    
    if (!result) {
      console.error('Failed to generate devotional story');
      return null;
    }
    
    return result;
  } catch (error) {
    console.error('Error generating scheduled devotional story:', error);
    return null;
  }
};
