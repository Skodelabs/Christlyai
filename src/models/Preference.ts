import mongoose, { Document, Schema } from 'mongoose';

/**
 * User Preference interface extending Document
 */
export interface IPreference extends Document {
  userId: mongoose.Types.ObjectId;
  theme: string;
  prayerFocus: string[];
  bibleVersion: string;
  notificationTime: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Preference schema
 */
const preferenceSchema = new Schema<IPreference>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
    },
    prayerFocus: {
      type: [String],
      default: ['general'],
    },
    bibleVersion: {
      type: String,
      default: 'NIV',
    },
    notificationTime: {
      type: String,
      default: '08:00', // 24-hour format
    },
  },
  {
    timestamps: true,
  }
);

/**
 * User Preference model
 */
export const Preference = mongoose.model<IPreference>('Preference', preferenceSchema);
