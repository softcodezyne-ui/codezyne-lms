import mongoose, { Schema, Document } from 'mongoose';

export interface IUserProgress extends Document {
  user: string; // Reference to User
  course: string; // Reference to Course
  lesson: string; // Reference to Lesson
  isCompleted: boolean;
  completedAt?: Date;
  progressPercentage?: number; // 0-100
  timeSpent?: number; // Time spent in minutes
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserProgressSchema: Schema = new Schema(
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
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson reference is required'],
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
    timeSpent: {
      type: Number,
      min: [0, 'Time spent cannot be negative'],
      default: 0,
    },
    lastAccessedAt: {
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

// Compound index to ensure unique user-lesson combination
UserProgressSchema.index({ user: 1, lesson: 1 }, { unique: true });

// Index for efficient queries
UserProgressSchema.index({ user: 1, course: 1 });
UserProgressSchema.index({ course: 1, isCompleted: 1 });
UserProgressSchema.index({ user: 1, isCompleted: 1 });

// Pre-save middleware to set completedAt when isCompleted becomes true
UserProgressSchema.pre('save', function(next) {
  if (this.isModified('isCompleted') && this.isCompleted && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

const UserProgress = mongoose.models.UserProgress || mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);

export default UserProgress;
