import mongoose, { Document, Schema } from 'mongoose';

/**
 * AI Log interface extending Document
 */
export interface IAILog extends Document {
  userId: mongoose.Types.ObjectId;
  interactionType: string;
  prompt: string;
  response: string;
  tokensUsed: number;
  isFavorite: boolean;
  createdAt: Date;
}

/**
 * AI Log schema
 */
const aiLogSchema = new Schema<IAILog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    interactionType: {
      type: String,
      required: true,
      enum: ['daily-quote', 'prayer', 'story', 'explanation', 'image'],
    },
    prompt: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * AI Log model
 */
export const AILog = mongoose.model<IAILog>('AILog', aiLogSchema);
