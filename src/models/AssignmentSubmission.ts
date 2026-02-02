import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignmentSubmission extends Document {
  assignment: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  groupMembers?: mongoose.Types.ObjectId[]; // For group assignments
  content?: string; // For essay-type assignments
  files?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  answers?: Array<{
    questionId: mongoose.Types.ObjectId;
    answer: string | string[]; // For MCQ (array) or written (string)
    isCorrect?: boolean; // For auto-graded questions
  }>;
  status: 'draft' | 'submitted' | 'graded' | 'returned';
  submittedAt?: Date;
  gradedAt?: Date;
  gradedBy?: mongoose.Types.ObjectId;
  score?: number;
  maxScore: number;
  feedback?: string;
  rubricScores?: Array<{
    criteria: string;
    score: number;
    maxScore: number;
    feedback?: string;
  }>;
  isLate: boolean;
  latePenaltyApplied?: number;
  attemptNumber: number;
  timeSpent?: number; // In minutes
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>({
  assignment: {
    type: Schema.Types.ObjectId,
    ref: 'Assignment',
    required: [true, 'Assignment reference is required'],
    index: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required'],
    index: true
  },
  groupMembers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  content: {
    type: String,
    trim: true,
    maxlength: [50000, 'Content cannot exceed 50000 characters']
  },
  files: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters']
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    size: {
      type: Number,
      required: true,
      min: [0, 'File size cannot be negative']
    }
  }],
  answers: [{
    questionId: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    answer: {
      type: Schema.Types.Mixed,
      required: true
    },
    isCorrect: {
      type: Boolean
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'submitted', 'graded', 'returned'],
    default: 'draft',
    required: true,
    index: true
  },
  submittedAt: {
    type: Date
  },
  gradedAt: {
    type: Date
  },
  gradedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  score: {
    type: Number,
    min: [0, 'Score cannot be negative']
  },
  maxScore: {
    type: Number,
    required: [true, 'Max score is required'],
    min: [0, 'Max score cannot be negative']
  },
  feedback: {
    type: String,
    trim: true,
    maxlength: [2000, 'Feedback cannot exceed 2000 characters']
  },
  rubricScores: [{
    criteria: {
      type: String,
      required: true,
      trim: true
    },
    score: {
      type: Number,
      required: true,
      min: [0, 'Score cannot be negative']
    },
    maxScore: {
      type: Number,
      required: true,
      min: [0, 'Max score cannot be negative']
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: [500, 'Feedback cannot exceed 500 characters']
    }
  }],
  isLate: {
    type: Boolean,
    default: false,
    index: true
  },
  latePenaltyApplied: {
    type: Number,
    min: [0, 'Late penalty cannot be negative'],
    max: [100, 'Late penalty cannot exceed 100%']
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: [1, 'Attempt number must be at least 1'],
    default: 1
  },
  timeSpent: {
    type: Number,
    min: [0, 'Time spent cannot be negative']
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for percentage score
AssignmentSubmissionSchema.virtual('percentageScore').get(function() {
  if (!this.score || !this.maxScore) return 0;
  return Math.round((this.score / this.maxScore) * 100);
});

// Virtual for grade
AssignmentSubmissionSchema.virtual('grade').get(function() {
  if (!this.score || !this.maxScore) return 'N/A';
  
  const percentage = (this.score / this.maxScore) * 100;
  
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'A-';
  if (percentage >= 75) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 65) return 'B-';
  if (percentage >= 60) return 'C+';
  if (percentage >= 55) return 'C';
  if (percentage >= 50) return 'C-';
  if (percentage >= 45) return 'D+';
  if (percentage >= 40) return 'D';
  if (percentage >= 35) return 'D-';
  return 'F';
});

// Virtual for passed status
AssignmentSubmissionSchema.virtual('passed').get(function() {
  if (!this.score || !this.maxScore) return false;
  return this.score >= (this.maxScore * 0.5); // 50% passing threshold
});

// Compound indexes
AssignmentSubmissionSchema.index({ assignment: 1, student: 1, attemptNumber: 1 }, { unique: true });
AssignmentSubmissionSchema.index({ assignment: 1, status: 1 });
AssignmentSubmissionSchema.index({ student: 1, status: 1 });
AssignmentSubmissionSchema.index({ submittedAt: 1 });
AssignmentSubmissionSchema.index({ gradedAt: 1 });

export default mongoose.models.AssignmentSubmission || mongoose.model<IAssignmentSubmission>('AssignmentSubmission', AssignmentSubmissionSchema);
