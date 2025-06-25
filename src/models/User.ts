import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User interface extending Document
 */
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  googleId?: string;
  appleUserId?: string;
  profilePicture?: string;
  notificationToken?: string;
  isActive: boolean;
  preferredNotificationTime?: string;
  authProvider: 'local' | 'google' | 'apple';
  prayerCount: number;
  lastPrayerDate?: Date;
  hasUsedDailyInspiration: boolean;
  lastInspirationDate?: Date;
  isPro: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * User schema
 */
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function() {
        return this.authProvider === 'local';
      },
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    appleUserId: {
      type: String,
      unique: true,
      sparse: true,
    },
    profilePicture: {
      type: String,
      default: null,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'apple'],
      default: 'local',
      required: true,
    },
    notificationToken: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    preferredNotificationTime: {
      type: String,
      default: '06:00', // Default to 6 AM
    },
    prayerCount: {
      type: Number,
      default: 0,
    },
    lastPrayerDate: {
      type: Date,
      default: null,
    },
    hasUsedDailyInspiration: {
      type: Boolean,
      default: false,
    },
    lastInspirationDate: {
      type: Date,
      default: null,
    },
    isPro: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified and auth provider is local
  if (!this.isModified('password') || this.authProvider !== 'local') return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

/**
 * Compare password method
 */
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * User model
 */
export const User = mongoose.model<IUser>('User', userSchema);
