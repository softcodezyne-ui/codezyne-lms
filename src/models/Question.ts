import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  question: string;
  type: 'mcq' | 'written' | 'true_false' | 'fill_blank' | 'essay';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  tags?: string[];
  options?: {
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
  correctAnswer?: string; // For written questions
  explanation?: string;
  hints?: string[];
  timeLimit?: number; // in minutes
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  exam?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: [2000, 'Question cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: ['mcq', 'written', 'true_false', 'fill_blank', 'essay'],
    required: [true, 'Question type is required'],
    default: 'mcq'
  },
  marks: {
    type: Number,
    required: [true, 'Marks is required'],
    min: [0.5, 'Marks must be at least 0.5'],
    max: [100, 'Marks cannot exceed 100']
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: [true, 'Difficulty level is required'],
    default: 'medium'
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  options: [{
    text: {
      type: String,
      required: [true, 'Option text is required'],
      trim: true,
      maxlength: [500, 'Option text cannot exceed 500 characters']
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: [1000, 'Explanation cannot exceed 1000 characters']
    }
  }],
  correctAnswer: {
    type: String,
    trim: true,
    maxlength: [2000, 'Correct answer cannot exceed 2000 characters']
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: [2000, 'Explanation cannot exceed 2000 characters']
  },
  hints: [{
    type: String,
    trim: true,
    maxlength: [500, 'Hint cannot exceed 500 characters']
  }],
  timeLimit: {
    type: Number,
    min: [1, 'Time limit must be at least 1 minute'],
    max: [60, 'Time limit cannot exceed 60 minutes']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  exam: {
    type: Schema.Types.ObjectId,
    ref: 'Exam'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for correct options count
QuestionSchema.virtual('correctOptionsCount').get(function(this: unknown) {
  const doc = this as IQuestion;
  if (doc.type === 'mcq' && doc.options) {
    return doc.options.filter(option => option.isCorrect).length;
  }
  return 0;
});

// Virtual for total options count
QuestionSchema.virtual('totalOptionsCount').get(function(this: unknown) {
  const doc = this as IQuestion;
  return doc.options ? doc.options.length : 0;
});

// Validation for MCQ questions
QuestionSchema.pre('save', async function() {
  const doc = this as IQuestion;
  if (doc.type === 'mcq') {
    if (!doc.options || doc.options.length < 2) {
      throw new Error('MCQ questions must have at least 2 options');
    }
    if (doc.options.length > 6) {
      throw new Error('MCQ questions cannot have more than 6 options');
    }
    const correctOptions = doc.options.filter(option => option.isCorrect);
    if (correctOptions.length === 0) {
      throw new Error('MCQ questions must have at least one correct option');
    }
  }

  if (doc.type === 'true_false') {
    if (!doc.options || doc.options.length !== 2) {
      throw new Error('True/False questions must have exactly 2 options');
    }
  }

  if (doc.type === 'written' || doc.type === 'essay') {
    if (!doc.correctAnswer || doc.correctAnswer.trim().length === 0) {
      throw new Error('Written/Essay questions must have a correct answer');
    }
  }
});

// Indexes
QuestionSchema.index({ question: 'text' });
QuestionSchema.index({ type: 1 });
QuestionSchema.index({ difficulty: 1 });
QuestionSchema.index({ category: 1 });
QuestionSchema.index({ tags: 1 });
QuestionSchema.index({ isActive: 1 });
QuestionSchema.index({ createdBy: 1 });
QuestionSchema.index({ exam: 1 });

export default mongoose.models.Question || mongoose.model<IQuestion>('Question', QuestionSchema);
