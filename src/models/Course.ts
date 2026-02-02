import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICourse extends Document {
  title: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  isPaid: boolean;
  status: 'draft' | 'published' | 'archived';
  price?: number;
  salePrice?: number;
  createdBy: string; // User ID who created the course
  instructor?: Types.ObjectId; // User ID of the instructor assigned to the course
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [255, 'Title cannot exceed 255 characters']
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
    ref: 'CourseCategory'
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  isPaid: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function(this: unknown, value: number) {
        const doc = this as ICourse;
        if (doc.isPaid && (!value || value <= 0)) {
          return false;
        }
        return true;
      },
      message: 'Paid courses must have a valid price'
    }
  },
  salePrice: {
    type: Number,
    min: [0, 'Sale price cannot be negative'],
    validate: {
      validator: function(this: unknown, value: number) {
        const doc = this as ICourse;
        if (value && doc.price && value >= doc.price) {
          return false;
        }
        return true;
      },
      message: 'Sale price must be less than regular price'
    }
  },
  createdBy: {
    type: String,
    required: [true, 'Course creator is required'],
    ref: 'User'
  },
  instructor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    validate: {
      validator: async function(this: unknown, value: string) {
        if (!value) return true;
        const User = mongoose.model('User');
        const user = await User.findById(value);
        return user && user.role === 'instructor';
      },
      message: 'Instructor must be a valid user with instructor role'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
CourseSchema.index({ title: 'text', description: 'text' });
CourseSchema.index({ category: 1 });
CourseSchema.index({ isPaid: 1 });
CourseSchema.index({ status: 1 });
CourseSchema.index({ createdBy: 1 });
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ createdAt: -1 });

// Virtual for final price (sale price if available, otherwise regular price)
CourseSchema.virtual('finalPrice').get(function(this: unknown) {
  const doc = this as ICourse;
  if (doc.isPaid) {
    return doc.salePrice || doc.price || 0;
  }
  return 0;
});

// Virtual for discount percentage
CourseSchema.virtual('discountPercentage').get(function(this: unknown) {
  const doc = this as ICourse;
  if (doc.isPaid && doc.salePrice && doc.price && doc.salePrice < doc.price) {
    return Math.round(((doc.price - doc.salePrice) / doc.price) * 100);
  }
  return 0;
});

// Virtual for chapter count
CourseSchema.virtual('chapterCount', {
  ref: 'Chapter',
  localField: '_id',
  foreignField: 'course',
  count: true
});

// Virtual for lesson count
CourseSchema.virtual('lessonCount', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'course',
  count: true
});

// Virtual for enrollment count
CourseSchema.virtual('enrollmentCount', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'course',
  count: true
});

// Virtual for active enrollment count
CourseSchema.virtual('activeEnrollmentCount', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'course',
  count: true,
  match: { status: 'active' }
});

// Virtual for completed enrollment count
CourseSchema.virtual('completedEnrollmentCount', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'course',
  count: true,
  match: { status: 'completed' }
});

// Virtual for instructor information
CourseSchema.virtual('instructorInfo', {
  ref: 'User',
  localField: 'instructor',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to validate pricing (sync: throw to reject, no next in Mongoose 7+)
CourseSchema.pre('save', function(this: unknown) {
  const doc = this as ICourse;
  if (doc.isPaid && (!doc.price || doc.price <= 0)) {
    throw new Error('Paid courses must have a valid price');
  }
  if (doc.salePrice && doc.price && doc.salePrice >= doc.price) {
    throw new Error('Sale price must be less than regular price');
  }
});

const Course = mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);

export default Course;
