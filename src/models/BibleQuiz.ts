import mongoose, { Document, Schema } from 'mongoose';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface BibleQuizDocument extends Document {
  userId: mongoose.Types.ObjectId;
  questions: QuizQuestion[];
  score: number;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuizQuestionSchema = new Schema({
  question: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    required: true,
    validate: [(val: string[]) => val.length === 4, 'Must have exactly 4 options']
  },
  correctAnswer: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    required: true
  }
});

const BibleQuizSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questions: {
    type: [QuizQuestionSchema],
    required: true,
    validate: [(val: any[]) => val.length === 10, 'Must have exactly 10 questions']
  },
  score: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export const BibleQuiz = mongoose.model<BibleQuizDocument>('BibleQuiz', BibleQuizSchema);
