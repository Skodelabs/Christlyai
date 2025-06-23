import mongoose, { Document, Schema } from 'mongoose';

/**
 * Prayer interface extending Document
 */
export interface IPrayer extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  isAnswered: boolean;
  answerDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prayer schema
 */
const prayerSchema = new Schema<IPrayer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      required: [true, 'Prayer content is required'],
      trim: true,
    },
    isAnswered: {
      type: Boolean,
      default: false
    },
    answerDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
  }
);

/**
 * Prayer model
 */
export const Prayer = mongoose.model<IPrayer>('Prayer', prayerSchema);
