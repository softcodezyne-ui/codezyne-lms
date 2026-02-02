import mongoose, { Schema, Document } from 'mongoose';

export interface IAssignment extends Document {
  title: string;
  description?: string;
  instructions?: string;
  type: 'essay' | 'file_upload' | 'quiz' | 'project' | 'presentation';
  course: mongoose.Types.ObjectId;
  chapter?: mongoose.Types.ObjectId;
  lesson?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  totalMarks: number;
  passingMarks: number;
  dueDate?: Date;
  startDate?: Date;
  isActive: boolean;
  isPublished: boolean;
  allowLateSubmission: boolean;
  latePenaltyPercentage?: number; // Penalty for late submissions (0-100)
  maxAttempts: number;
  allowedFileTypes?: string[]; // For file upload assignments
  maxFileSize?: number; // In MB
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  rubric?: Array<{
    criteria: string;
    description: string;
    marks: number;
  }>;
  isGroupAssignment: boolean;
  maxGroupSize?: number;
  autoGrade: boolean; // For quiz-type assignments
  timeLimit?: number; // In minutes, for timed assignments
  showCorrectAnswers: boolean;
  allowReview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  instructions: {
    type: String,
    trim: true,
    maxlength: [5000, 'Instructions cannot exceed 5000 characters']
  },
  type: {
    type: String,
    enum: ['essay', 'file_upload', 'quiz', 'project', 'presentation'],
    required: [true, 'Assignment type is required'],
    default: 'essay'
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course reference is required'],
    index: true
  },
  chapter: {
    type: Schema.Types.ObjectId,
    ref: 'Chapter'
  },
  lesson: {
    type: Schema.Types.ObjectId,
    ref: 'Lesson'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required'],
    index: true
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
        const doc = this as IAssignment;
        return value <= doc.totalMarks;
      },
      message: 'Passing marks cannot exceed total marks'
    }
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(this: unknown, value: Date) {
        const doc = this as IAssignment;
        if (doc.startDate && value) {
          return value > doc.startDate;
        }
        return true;
      },
      message: 'Due date must be after start date'
    }
  },
  startDate: {
    type: Date,
    validate: {
      validator: function(this: unknown, value: Date) {
        const doc = this as IAssignment;
        if (doc.dueDate && value) {
          return value < doc.dueDate;
        }
        return true;
      },
      message: 'Start date must be before due date'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  latePenaltyPercentage: {
    type: Number,
    min: [0, 'Late penalty cannot be negative'],
    max: [100, 'Late penalty cannot exceed 100%']
  },
  maxAttempts: {
    type: Number,
    default: 1,
    min: [1, 'Max attempts must be at least 1'],
    max: [10, 'Max attempts cannot exceed 10']
  },
  allowedFileTypes: [{
    type: String,
    trim: true
  }],
  maxFileSize: {
    type: Number,
    min: [1, 'Max file size must be at least 1MB'],
    max: [1000, 'Max file size cannot exceed 1000MB']
  },
  attachments: [{
    name: {
      type: String,
      required: true,
      trim: true
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
      min: [0, 'File size cannot be negative']
    }
  }],
  rubric: [{
    criteria: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Criteria cannot exceed 200 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    marks: {
      type: Number,
      required: true,
      min: [0, 'Marks cannot be negative']
    }
  }],
  isGroupAssignment: {
    type: Boolean,
    default: false
  },
  maxGroupSize: {
    type: Number,
    min: [2, 'Max group size must be at least 2'],
    max: [20, 'Max group size cannot exceed 20']
  },
  autoGrade: {
    type: Boolean,
    default: false
  },
  timeLimit: {
    type: Number,
    min: [1, 'Time limit must be at least 1 minute'],
    max: [1440, 'Time limit cannot exceed 24 hours']
  },
  showCorrectAnswers: {
    type: Boolean,
    default: true
  },
  allowReview: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for assignment status
AssignmentSchema.virtual('status').get(function(this: unknown) {
  const doc = this as IAssignment;
  const now = new Date();

  if (!doc.isPublished) return 'draft';
  if (!doc.isActive) return 'inactive';
  if (doc.startDate && now < doc.startDate) return 'scheduled';
  if (doc.dueDate && now > doc.dueDate) return 'expired';
  if (doc.startDate && doc.dueDate && now >= doc.startDate && now <= doc.dueDate) return 'active';
  if (doc.isPublished && doc.isActive) return 'published';

  return 'draft';
});

// Virtual for submission count
AssignmentSchema.virtual('submissionCount').get(function() {
  return 0; // Will be populated by aggregation
});

// Indexes
AssignmentSchema.index({ title: 'text', description: 'text', instructions: 'text' });
AssignmentSchema.index({ type: 1 });
AssignmentSchema.index({ isActive: 1, isPublished: 1 });
AssignmentSchema.index({ dueDate: 1 });
AssignmentSchema.index({ startDate: 1 });

export default mongoose.models.Assignment || mongoose.model<IAssignment>('Assignment', AssignmentSchema);
