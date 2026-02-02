import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'instructor' | 'student';
  isActive: boolean;
  avatar?: string;
  phone?: string; // Phone number for students
  // Student-specific fields
  enrollmentDate?: Date;
  parentPhone?: string;
  isBlockedFromReviews?: boolean; // Block student from creating reviews
  createdBy?: string; // Track who created this user
  address?: {
    fullAddress?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'instructor', 'student'],
      default: 'student',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
    },
    // Student-specific fields
    enrollmentDate: {
      type: Date,
    },
    parentPhone: {
      type: String,
      trim: true,
    },
    isBlockedFromReviews: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      ref: 'User',
    },
    lastLogin: {
      type: Date,
    },
    address: {
      fullAddress: { type: String, trim: true },
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
// Note: email index is already created by unique: true above
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });
UserSchema.index({ phone: 1 }, { sparse: true, unique: true });

// Virtual for full name
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
UserSchema.set('toJSON', {
  virtuals: true,
});

// Remove password from JSON output
UserSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
