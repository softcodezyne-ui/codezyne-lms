import mongoose, { Document, Schema } from 'mongoose';

export interface ICourseCategory extends Document {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourseCategorySchema = new Schema<ICourseCategory>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  color: {
    type: String,
    trim: true,
    default: '#3B82F6', // Default blue color
    validate: {
      validator: function(v: string) {
        // Basic hex color validation
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon name cannot exceed 50 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
// Note: name index is already created by unique: true above
CourseCategorySchema.index({ isActive: 1 });
CourseCategorySchema.index({ createdAt: -1 });

// Virtual for course count (will be populated when needed)
CourseCategorySchema.virtual('courseCount', {
  ref: 'Course',
  localField: '_id',
  foreignField: 'category',
  count: true
});

// Pre-save middleware to ensure name is unique (case insensitive)
CourseCategorySchema.pre('save', async function() {
  const doc = this as ICourseCategory;
  const existing = await CourseCategory.findOne({
    name: { $regex: new RegExp(`^${doc.name}$`, 'i') },
    _id: { $ne: doc._id }
  });

  if (existing) {
    throw new Error('Category name already exists');
  }
});

const CourseCategory = mongoose.models.CourseCategory || mongoose.model<ICourseCategory>('CourseCategory', CourseCategorySchema);

export default CourseCategory;
