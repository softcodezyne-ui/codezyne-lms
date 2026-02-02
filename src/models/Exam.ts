import mongoose, { Schema, Document } from 'mongoose';

export interface IExam extends Document {
  title: string;
  description?: string;
  type: 'mcq' | 'written' | 'mixed';
  duration: number; // in minutes
  totalMarks: number;
  passingMarks: number;
  instructions?: string;
  isActive: boolean;
  isPublished: boolean;
  startDate?: Date;
  endDate?: Date;
  course?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  questions: mongoose.Types.ObjectId[];
  attempts: number; // maximum attempts allowed
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showCorrectAnswers: boolean;
  showResults: boolean;
  allowReview: boolean;
  timeLimit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>({
  title: {
    type: String,
    required: [true, 'Exam title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: ['mcq', 'written', 'mixed'],
    required: [true, 'Exam type is required'],
    default: 'mcq'
  },
  duration: {
    type: Number,
    required: [true, 'Exam duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [1440, 'Duration cannot exceed 24 hours']
  },
  totalMarks: {
    type: Number,
    required: [true, 'Total marks is required'],
    min: [1, 'Total marks must be at least 1'],
    max: [10000, 'Total marks cannot exceed 10000']
  },
  passingMarks: {
    type: Number,
    required: [true, 'Passing marks is required'],
    min: [0, 'Passing marks cannot be negative'],
    validate: {
      validator: function(this: unknown, value: number) {
        const doc = this as IExam;
        return value <= doc.totalMarks;
      },
      message: 'Passing marks cannot exceed total marks'
    }
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [2000, 'Instructions cannot exceed 2000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    validate: {
      validator: function(this: unknown, value: Date) {
        const doc = this as IExam;
        if (doc.endDate && value) {
          return value < doc.endDate;
        }
        return true;
      },
      message: 'Start date must be before end date'
    }
  },
  endDate: {
    type: Date,
    validate: {
      validator: function(this: unknown, value: Date) {
        const doc = this as IExam;
        if (doc.startDate && value) {
          return value > doc.startDate;
        }
        return true;
      },
      message: 'End date must be after start date'
    }
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  questions: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'Question'
    }],
    default: []
  },
  attempts: {
    type: Number,
    default: 1,
    min: [1, 'Attempts must be at least 1'],
    max: [10, 'Attempts cannot exceed 10']
  },
  shuffleQuestions: {
    type: Boolean,
    default: false
  },
  shuffleOptions: {
    type: Boolean,
    default: false
  },
  showCorrectAnswers: {
    type: Boolean,
    default: true
  },
  showResults: {
    type: Boolean,
    default: true
  },
  allowReview: {
    type: Boolean,
    default: true
  },
  timeLimit: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for question count
ExamSchema.virtual('questionCount').get(function(this: unknown) {
  const doc = this as IExam;
  return doc.questions ? doc.questions.length : 0;
});

// Virtual for exam status
ExamSchema.virtual('status').get(function(this: unknown) {
  const doc = this as IExam;
  const now = new Date();

  if (!doc.isPublished) return 'draft';
  if (!doc.isActive) return 'inactive';
  if (doc.startDate && now < doc.startDate) return 'scheduled';
  if (doc.endDate && now > doc.endDate) return 'expired';
  if (doc.startDate && doc.endDate && now >= doc.startDate && now <= doc.endDate) return 'active';
  if (doc.isPublished && doc.isActive) return 'published';

  return 'draft';
});

// Indexes
ExamSchema.index({ title: 'text', description: 'text' });
ExamSchema.index({ type: 1 });
ExamSchema.index({ isActive: 1, isPublished: 1 });
ExamSchema.index({ createdBy: 1 });
ExamSchema.index({ course: 1 });
ExamSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.models.Exam || mongoose.model<IExam>('Exam', ExamSchema);
