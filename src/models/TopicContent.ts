import mongoose, { Document, Schema } from 'mongoose';

export interface ITopicContent extends Document {
  userId: mongoose.Types.ObjectId;
  topic: string;
  title: string;
  content: string;
  verse: string;
  explanation: string;
  imageUrl: string;
  audioUrl: string;
  bibleVersion: string;
  wordCount: number;
  createdAt: Date;
}

const topicContentSchema = new Schema<ITopicContent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    verse: {
      type: String,
      required: true,
    },
    explanation: {
      type: String,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    audioUrl: {
      type: String,
      required: true,
    },
    bibleVersion: {
      type: String,
      default: 'NIV',
    },
    wordCount: {
      type: Number,
      default: 300,
    },
  },
  {
    timestamps: true,
  }
);

// Create an index for faster queries
topicContentSchema.index({ userId: 1, topic: 1, createdAt: -1 });

export const TopicContent = mongoose.model<ITopicContent>('TopicContent', topicContentSchema);
