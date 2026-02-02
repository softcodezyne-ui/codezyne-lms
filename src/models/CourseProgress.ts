import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseProgress extends Document {
  user: string; // Reference to User
  course: string; // Reference to Course
  isCompleted: boolean;
  completedAt?: Date;
  progressPercentage: number; // 0-100
  totalLessons: number;
  completedLessons: number;
  totalTimeSpent: number; // Total time spent in minutes
  lastAccessedAt: Date;
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CourseProgressSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    progressPercentage: {
      type: Number,
      min: [0, 'Progress percentage cannot be less than 0'],
      max: [100, 'Progress percentage cannot be more than 100'],
      default: 0,
    },
    totalLessons: {
      type: Number,
      default: 0,
    },
    completedLessons: {
      type: Number,
      default: 0,
    },
    totalTimeSpent: {
      type: Number,
      min: [0, 'Total time spent cannot be negative'],
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index to ensure unique user-course combination
CourseProgressSchema.index({ user: 1, course: 1 }, { unique: true });

// Index for efficient queries
CourseProgressSchema.index({ user: 1, isCompleted: 1 });
CourseProgressSchema.index({ course: 1, isCompleted: 1 });
CourseProgressSchema.index({ progressPercentage: 1 });

// Pre-save middleware to set completedAt when isCompleted becomes true
CourseProgressSchema.pre('save', function(next) {
  if (this.isModified('isCompleted') && this.isCompleted && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Update progress percentage based on completed lessons
  if ((this as any).totalLessons > 0) {
    (this as any).progressPercentage = Math.round(((this as any).completedLessons / (this as any).totalLessons) * 100);
  }
  
  next();
});

const CourseProgress = mongoose.models.CourseProgress || mongoose.model<ICourseProgress>('CourseProgress', CourseProgressSchema);

export default CourseProgress;
