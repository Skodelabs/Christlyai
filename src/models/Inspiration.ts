import mongoose, { Document, Schema } from 'mongoose';

/**
 * Inspiration interface extending Document
 */
export interface IInspiration extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  source: string;
  reference?: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inspiration schema
 */
const inspirationSchema = new Schema<IInspiration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      required: [true, 'Inspiration content is required'],
      trim: true,
    },
    source: {
      type: String,
      required: [true, 'Source is required'],
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    isFavorite: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

/**
 * Inspiration model
 */
export const Inspiration = mongoose.model<IInspiration>('Inspiration', inspirationSchema);
