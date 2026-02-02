import mongoose, { Schema, Document } from 'mongoose';

export interface IExamAttempt extends Document {
  exam: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  answers: {
    question: mongoose.Types.ObjectId;
    selectedOptions?: mongoose.Types.ObjectId[]; // For MCQ
    writtenAnswer?: string; // For written questions
    isCorrect?: boolean;
    marksObtained?: number;
    timeSpent?: number; // in seconds
    isAnswered: boolean;
  }[];
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  isPassed: boolean;
  status: 'in_progress' | 'completed' | 'abandoned' | 'timeout';
  startTime: Date;
  endTime?: Date;
  timeSpent: number; // in seconds
  isSubmitted: boolean;
  submittedAt?: Date;
  attemptNumber: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExamAttemptSchema = new Schema<IExamAttempt>({
  exam: {
    type: Schema.Types.ObjectId,
    ref: 'Exam',
    required: [true, 'Exam is required']
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required']
  },
  answers: [{
    question: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: [true, 'Question is required']
    },
    selectedOptions: [{
      type: Schema.Types.ObjectId
    }],
    writtenAnswer: {
      type: String,
      trim: true,
      maxlength: [5000, 'Written answer cannot exceed 5000 characters']
    },
    isCorrect: {
      type: Boolean
    },
    marksObtained: {
      type: Number,
      min: [0, 'Marks obtained cannot be negative'],
      max: [100, 'Marks obtained cannot exceed 100']
    },
    timeSpent: {
      type: Number,
      min: [0, 'Time spent cannot be negative']
    },
    isAnswered: {
      type: Boolean,
      default: false
    }
  }],
  totalMarks: {
    type: Number,
    required: [true, 'Total marks is required'],
    min: [0, 'Total marks cannot be negative']
  },
  marksObtained: {
    type: Number,
    default: 0,
    min: [0, 'Marks obtained cannot be negative']
  },
  percentage: {
    type: Number,
    default: 0,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  isPassed: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned', 'timeout'],
    default: 'in_progress'
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  timeSpent: {
    type: Number,
    default: 0,
    min: [0, 'Time spent cannot be negative']
  },
  isSubmitted: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date
  },
  attemptNumber: {
    type: Number,
    required: [true, 'Attempt number is required'],
    min: [1, 'Attempt number must be at least 1']
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for duration
ExamAttemptSchema.virtual('duration').get(function(this: unknown) {
  const doc = this as IExamAttempt;
  if (doc.endTime) {
    return Math.floor((doc.endTime.getTime() - doc.startTime.getTime()) / 1000);
  }
  return Math.floor((new Date().getTime() - doc.startTime.getTime()) / 1000);
});

// Virtual for time remaining
ExamAttemptSchema.virtual('timeRemaining').get(function(this: unknown) {
  // This would need to be calculated based on exam duration
  // Implementation depends on how you handle time limits
  return 0;
});

// Pre-save middleware to calculate percentage and isPassed
ExamAttemptSchema.pre('save', async function() {
  const doc = this as IExamAttempt;
  if (doc.marksObtained !== undefined && doc.totalMarks > 0) {
    doc.percentage = Math.round((doc.marksObtained / doc.totalMarks) * 100);
  }
  
  // Set end time if status is completed
  if (doc.status === 'completed' && !doc.endTime) {
    doc.endTime = new Date();
    doc.isSubmitted = true;
    doc.submittedAt = new Date();
  }
});

// Indexes
ExamAttemptSchema.index({ exam: 1, student: 1 });
ExamAttemptSchema.index({ student: 1 });
ExamAttemptSchema.index({ status: 1 });
ExamAttemptSchema.index({ isSubmitted: 1 });
ExamAttemptSchema.index({ startTime: 1 });
ExamAttemptSchema.index({ submittedAt: 1 });

// Compound index for unique attempt per student per exam
ExamAttemptSchema.index({ exam: 1, student: 1, attemptNumber: 1 }, { unique: true });

export default mongoose.models.ExamAttempt || mongoose.model<IExamAttempt>('ExamAttempt', ExamAttemptSchema);
