import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AppError } from "../middleware/error";
import { AILog } from "../models/AILog";
import { TopicContent } from "../models/TopicContent";
import * as openaiService from "../services/openaiService";
import logger from "../utils/logger";

/**
 * Generate content based on a specific Bible topic
 */
export const generateTopicContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { topic, bibleVersion = "NIV", wordCount = 300 } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    // Parse and validate wordCount
    const parsedWordCount = parseInt(wordCount.toString(), 10);
    if (
      isNaN(parsedWordCount) ||
      parsedWordCount < 100 ||
      parsedWordCount > 1000
    ) {
      return res
        .status(400)
        .json({ error: "Word count must be between 100 and 1000" });
    }

    logger.info(
      `Generating topic content for user ${userId}: ${topic} (${bibleVersion}, ${parsedWordCount} words)`
    );

    // Generate content using OpenAI
    const {
      title,
      content,
      verse,
      explanation,
      imageUrl,
      audioUrl,
      bibleVersion: resultBibleVersion,
      wordCount: resultWordCount,
      tokensUsed,
    } = await openaiService.generateTopicContent(
      topic,
      bibleVersion,
      parsedWordCount
    );

    // Log the URLs for debugging
    logger.info(`Generated content with imageUrl: ${imageUrl}`);
    logger.info(`Generated content with audioUrl: ${audioUrl}`);

    // Save to database
    const topicContent = await TopicContent.create({
      userId,
      topic,
      title,
      content,
      verse,
      explanation,
      imageUrl,
      audioUrl,
      bibleVersion: resultBibleVersion,
      wordCount: resultWordCount,
    });

    // Log the saved content
    logger.info(`Saved topic content with ID: ${topicContent._id}`);
    logger.info(`Saved imageUrl: ${topicContent.imageUrl}`);
    logger.info(`Saved audioUrl: ${topicContent.audioUrl}`);

    // Log the interaction
    logger.info(
      `Generated topic content for user ${userId}: ${topic} (${resultBibleVersion}, ${resultWordCount} words)`
    );

    // Log the interaction with structured data
    await AILog.create({
      userId,
      interactionType: "topic-content",
      prompt: `Topic content request for: ${topic} (Bible version: ${bibleVersion}, Word count: ${parsedWordCount})`,
      response: JSON.stringify({
        title,
        content,
        verse,
        explanation,
        imageUrl,
        audioUrl,
        bibleVersion: resultBibleVersion,
        wordCount: resultWordCount,
      }),
      tokensUsed,
    });

    res.status(200).json({
      status: "success",
      data: {
        title,
        content,
        verse,
        explanation,
        imageUrl,
        audioUrl,
        bibleVersion: resultBibleVersion,
        wordCount: resultWordCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's saved topic content with pagination
 */
export const getUserTopicContent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError("Not authenticated", 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const total = await TopicContent.countDocuments({ userId });
    const pages = Math.ceil(total / limit);

    // Get paginated topic content
    const topicContent = await TopicContent.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Format the response
    const formattedContent = topicContent.map((item) => ({
      id: item._id,
      topic: item.topic,
      title: item.title,
      content: item.content,
      verse: item.verse,
      explanation: item.explanation,
      imageUrl: item.imageUrl,
      audioUrl: item.audioUrl,
      bibleVersion: item.bibleVersion || "NIV",
      wordCount: item.wordCount || 300,
      date: item.createdAt.toISOString().split("T")[0],
      userId: item.userId.toString(),
    }));

    res.status(200).json({
      status: "success",
      topicContent: formattedContent,
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific topic content by ID
 */
export const getTopicContentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError("Not authenticated", 401);
    }

    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const contentId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      throw new AppError("Invalid content ID", 400);
    }

    // Get the specific topic content
    const content = await TopicContent.findOne({
      _id: contentId,
      userId,
    }).lean();

    if (!content) {
      throw new AppError("Topic content not found", 404);
    }

    // Format the response
    const formattedContent = {
      id: content._id,
      topic: content.topic,
      title: content.title,
      content: content.content,
      verse: content.verse,
      explanation: content.explanation,
      imageUrl: content.imageUrl,
      audioUrl: content.audioUrl,
      date: content.createdAt.toISOString().split("T")[0],
      userId: content.userId.toString(),
    };

    res.status(200).json({
      status: "success",
      data: formattedContent,
    });
  } catch (error) {
    next(error);
  }
};
