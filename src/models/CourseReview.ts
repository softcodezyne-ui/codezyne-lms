import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICourseReview extends Document {
  course: Types.ObjectId; // Reference to Course
  student: Types.ObjectId; // Reference to User (student who wrote the review)
  rating: number; // Rating from 1 to 5
  reviewType: 'text' | 'video'; // Type of review
  title?: string; // Optional review title
  comment?: string; // Review comment/feedback (required for text reviews)
  videoUrl?: string; // Video review URL (required for video reviews)
  videoThumbnail?: string; // Thumbnail for video review
  isVerified: boolean; // Whether the student is enrolled and can review
  isPublic: boolean; // Whether the review is visible to others
  helpfulVotes: number; // Number of helpful votes
  reportedCount: number; // Number of times this review was reported
  isApproved: boolean; // Whether the review is approved by admin
  isDisplayed: boolean; // Whether the review should be displayed on course details page
  displayOrder?: number; // Order in which the review should be displayed (only for displayed reviews)
  createdAt: Date;
  updatedAt: Date;
}

export interface ICourseReviewModel extends mongoose.Model<ICourseReview> {
  getCourseRatingStats(courseId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  }>;
  getCourseReviews(
    courseId: string, 
    page?: number, 
    limit?: number, 
    sortBy?: string, 
    sortOrder?: string
  ): Promise<{
    reviews: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
}

const CourseReviewSchema = new Schema<ICourseReview>({
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
        const doc = this as ICourseReview;
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
        const doc = this as ICourseReview;
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
    default: false // Reviews require admin approval
  },
  isDisplayed: {
    type: Boolean,
    default: false // Reviews need to be explicitly selected for display
  },
  displayOrder: {
    type: Number,
    default: 0 // Order for displaying reviews (0 means no specific order)
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure one review per student per course
CourseReviewSchema.index({ course: 1, student: 1 }, { unique: true });

// Indexes for better query performance
CourseReviewSchema.index({ course: 1, isPublic: 1, isApproved: 1 });
CourseReviewSchema.index({ student: 1 });
CourseReviewSchema.index({ rating: 1 });
CourseReviewSchema.index({ createdAt: -1 });
CourseReviewSchema.index({ helpfulVotes: -1 });

// Virtual for student information
CourseReviewSchema.virtual('studentInfo', {
  ref: 'User',
  localField: 'student',
  foreignField: '_id',
  justOne: true,
  select: 'firstName lastName avatar'
});

// Virtual for course information
CourseReviewSchema.virtual('courseInfo', {
  ref: 'Course',
  localField: 'course',
  foreignField: '_id',
  justOne: true,
  select: 'title thumbnailUrl'
});

// Pre-save middleware to validate enrollment
CourseReviewSchema.pre('save', async function() {
  const doc = this as ICourseReview;
  const Enrollment = mongoose.model('Enrollment');
  const enrollment = await Enrollment.findOne({
    student: doc.student,
    course: doc.course,
    status: { $in: ['active', 'completed'] }
  });

  if (!enrollment) {
    throw new Error('Student must be enrolled in the course to write a review');
  }

  doc.isVerified = true;
});

// Static method to get course rating statistics
CourseReviewSchema.statics.getCourseRatingStats = async function(courseId: string) {
  const stats = await this.aggregate([
    { $match: { course: new Types.ObjectId(courseId), isPublic: true, isApproved: true } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
        ratingDistribution: {
          $push: {
            rating: '$rating'
          }
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
      }
    };
  }

  const result = stats[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  result.ratingDistribution.forEach((item: any) => {
    distribution[item.rating as keyof typeof distribution]++;
  });

  return {
    totalReviews: result.totalReviews,
    averageRating: Math.round(result.averageRating * 10) / 10, // Round to 1 decimal
    ratingDistribution: distribution
  };
};

// Static method to get reviews for a course
CourseReviewSchema.statics.getCourseReviews = async function(
  courseId: string, 
  page: number = 1, 
  limit: number = 10, 
  sortBy: string = 'createdAt', 
  sortOrder: string = 'desc'
) {
  const skip = (page - 1) * limit;
  const sort: any = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const [reviews, total] = await Promise.all([
    this.find({ 
      course: new Types.ObjectId(courseId), 
      isPublic: true, 
      isApproved: true 
    })
      .populate('student', 'firstName lastName avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments({ 
      course: new Types.ObjectId(courseId), 
      isPublic: true, 
      isApproved: true 
    })
  ]);

  return {
    reviews,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

const CourseReview = mongoose.models.CourseReview || mongoose.model<ICourseReview, ICourseReviewModel>('CourseReview', CourseReviewSchema);

export default CourseReview;
