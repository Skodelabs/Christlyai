import * as cron from 'node-cron';
import { generateDevotionalStory } from '../controllers/schedulerAiController';
import { createScheduledStory } from '../controllers/schedulerController';
import { sendNotification } from './notificationService';
import mongoose from 'mongoose';

// Store the scheduled job so we can manage it
let scheduledStoryJob: cron.ScheduledTask | null = null;

/**
 * Initialize the story scheduler
 * @param time - cron expression for scheduling (default: '0 6 * * *' - 6 AM daily)
 */
export const initializeStoryScheduler = (time = '0 6 * * *') => {
  // Cancel any existing job
  if (scheduledStoryJob) {
    scheduledStoryJob.stop();
  }

  // Schedule new job
  scheduledStoryJob = cron.schedule(time, async () => {
    try {
      console.log(`[${new Date().toISOString()}] Running scheduled story creation`);
      
      // Generate a new devotional story
      const storyData = await generateDevotionalStory();
      
      if (!storyData) {
        console.error('Failed to generate scheduled devotional story');
        return;
      }
      
      // Save the story for all active users
      const savedStory = await createScheduledStory(storyData);
      
      if (savedStory && savedStory.title) {
        // Send notification about the new story
        await sendNotification({
          title: 'New Devotional Story',
          body: `Today's story "${savedStory.title}" is ready for you`,
          data: { storyId: savedStory.storyId }
        });
        
        console.log(`Successfully created and notified about story: ${savedStory.title}`);
      }
    } catch (error) {
      console.error('Error in scheduled story creation:', error);
    }
  });
  
  console.log(`Story scheduler initialized with schedule: ${time}`);
  return scheduledStoryJob;
};

/**
 * Update the scheduler time
 * @param newTime - New cron expression
 */
export const updateSchedulerTime = (newTime: string) => {
  return initializeStoryScheduler(newTime);
};

/**
 * Stop the scheduler
 */
export const stopScheduler = () => {
  if (scheduledStoryJob) {
    scheduledStoryJob.stop();
    scheduledStoryJob = null;
    console.log('Story scheduler stopped');
    return true;
  }
  return false;
};
