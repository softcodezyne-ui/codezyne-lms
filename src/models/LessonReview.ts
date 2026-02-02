import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILessonReview extends Document {
  lesson: Types.ObjectId; // Reference to Lesson
  course: Types.ObjectId; // Reference to Course (for easier querying)
  student: Types.ObjectId; // Reference to User (student who wrote the review)
  rating: number; // Rating from 1 to 5
  reviewType: 'text' | 'video'; // Type of review
  title?: string; // Optional review title
  comment?: string; // Text review content
  videoUrl?: string; // Video review URL (uploaded video)
  videoThumbnail?: string; // Thumbnail for video review
  isVerified: boolean; // Whether the student has access to the lesson
  isPublic: boolean; // Whether the review is visible to others
  helpfulVotes: number; // Number of helpful votes
  reportedCount: number; // Number of times this review was reported
  isApproved: boolean; // Whether the review is approved by admin
  createdAt: Date;
  updatedAt: Date;
}

const LessonReviewSchema = new Schema<ILessonReview>({
  lesson: {
    type: Schema.Types.ObjectId,
    ref: 'Lesson',
    required: [true, 'Lesson is required'],
    index: true
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required'],
    index: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required'],
    index: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number'
    }
  },
  reviewType: {
    type: String,
    enum: ['text', 'video'],
    required: [true, 'Review type is required'],
    default: 'text'
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    validate: {
      validator: function(this: unknown, value: string) {
        const doc = this as ILessonReview;
        if (doc.reviewType === 'text' && !value?.trim()) {
          return false;
        }
        return true;
      },
      message: 'Comment is required for text reviews'
    }
  },
  videoUrl: {
    type: String,
    trim: true,
    validate: {
      validator: function(this: unknown, value: string) {
        const doc = this as ILessonReview;
        if (doc.reviewType === 'video' && !value?.trim()) {
          return false;
        }
        return true;
      },
      message: 'Video URL is required for video reviews'
    }
  },
  videoThumbnail: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  helpfulVotes: {
    type: Number,
    default: 0,
    min: [0, 'Helpful votes cannot be negative']
  },
  reportedCount: {
    type: Number,
    default: 0,
    min: [0, 'Reported count cannot be negative']
  },
  isApproved: {
    type: Boolean,
    default: true // Auto-approve reviews, admin can moderate later
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure one review per student per lesson
LessonReviewSchema.index({ lesson: 1, student: 1 }, { unique: true });

// Indexes for better query performance
LessonReviewSchema.index({ lesson: 1, isPublic: 1, isApproved: 1 });
LessonReviewSchema.index({ course: 1, isPublic: 1, isApproved: 1 });
LessonReviewSchema.index({ student: 1 });

const LessonReview = mongoose.models.LessonReview || mongoose.model<ILessonReview>('LessonReview', LessonReviewSchema);

export default LessonReview;

