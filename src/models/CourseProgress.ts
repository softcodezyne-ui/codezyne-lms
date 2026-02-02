import mongoose, { Schema, Document } from 'mongoose';

export interface ICourseProgress extends Document {
  user: mongoose.Types.ObjectId; // Reference to User
  course: mongoose.Types.ObjectId; // Reference to Course
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

const CourseProgressSchema = new Schema<ICourseProgress>(
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
CourseProgressSchema.pre('save', async function() {
  const doc = this as unknown as ICourseProgress;
  if (doc.isModified('isCompleted') && doc.isCompleted && !doc.completedAt) {
    doc.completedAt = new Date();
  }

  if (doc.totalLessons > 0) {
    doc.progressPercentage = Math.round((doc.completedLessons / doc.totalLessons) * 100);
  }
});

const CourseProgress = mongoose.models.CourseProgress || mongoose.model<ICourseProgress>('CourseProgress', CourseProgressSchema);

export default CourseProgress;
