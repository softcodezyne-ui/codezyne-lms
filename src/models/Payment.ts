import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  transactionId: string;
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  enrollment: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'refunded';
  
  // SSLCOMMERZ specific fields
  valId?: string;
  sessionKey?: string;
  bankTranId?: string;
  cardType?: string;
  cardIssuer?: string;
  tranDate?: string;
  
  // Payment method details
  paymentMethod?: string;
  paymentGateway: 'sslcommerz' | 'stripe' | 'paypal' | 'other';
  
  // Additional transaction details
  gatewayResponse?: any;
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamps
  initiatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  
  // Additional metadata
  notes?: string;
  refundReason?: string;
  refundAmount?: number;
  refundRefId?: string;
  refundStatus?: 'initiated' | 'processing' | 'refunded' | 'failed';
  refundedBy?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IPaymentModel extends mongoose.Model<IPayment> {
  getStats(): Promise<{
    total: number;
    pending: number;
    success: number;
    failed: number;
    cancelled: number;
    refunded: number;
    totalAmount: number;
    averageAmount: number;
  }>;
  getByStudent(studentId: string, limit?: number, skip?: number): Promise<IPayment[]>;
  getByCourse(courseId: string, limit?: number, skip?: number): Promise<IPayment[]>;
  getRecentSuccessful(limit?: number): Promise<IPayment[]>;
  getRefunded(limit?: number, skip?: number): Promise<IPayment[]>;
  getEligibleForRefund(limit?: number, skip?: number): Promise<IPayment[]>;
}

const PaymentSchema = new Schema<IPayment>({
  transactionId: {
    type: String,
    required: [true, 'Transaction ID is required'],
    unique: true,
    index: true,
    trim: true
  },
  student: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student is required'],
    index: true
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course is required'],
    index: true
  },
  enrollment: {
    type: Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: [true, 'Enrollment is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'BDT',
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    required: true,
    index: true
  },
  
  // SSLCOMMERZ specific fields
  valId: {
    type: String,
    trim: true
  },
  sessionKey: {
    type: String,
    trim: true
  },
  bankTranId: {
    type: String,
    trim: true
  },
  cardType: {
    type: String,
    trim: true
  },
  cardIssuer: {
    type: String,
    trim: true
  },
  tranDate: {
    type: String,
    trim: true
  },
  
  // Payment method details
  paymentMethod: {
    type: String,
    trim: true
  },
  paymentGateway: {
    type: String,
    enum: ['sslcommerz', 'stripe', 'paypal', 'other'],
    default: 'sslcommerz',
    required: true
  },
  
  // Additional transaction details
  gatewayResponse: {
    type: Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  completedAt: {
    type: Date
  },
  failedAt: {
    type: Date
  },
  refundedAt: {
    type: Date
  },
  
  // Additional metadata
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  refundReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Refund reason cannot exceed 500 characters']
  },
  refundAmount: {
    type: Number,
    min: [0, 'Refund amount cannot be negative']
  },
  refundRefId: {
    type: String,
    trim: true
  },
  refundStatus: {
    type: String,
    enum: ['initiated', 'processing', 'refunded', 'failed'],
    default: 'initiated'
  },
  refundedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
PaymentSchema.index({ student: 1, course: 1 });
PaymentSchema.index({ transactionId: 1, status: 1 });
PaymentSchema.index({ status: 1, initiatedAt: -1 });
PaymentSchema.index({ valId: 1 }, { sparse: true });

// Virtual for student info
PaymentSchema.virtual('studentInfo', {
  ref: 'User',
  localField: 'student',
  foreignField: '_id',
  justOne: true,
  select: 'firstName lastName email avatar'
});

// Virtual for course info
PaymentSchema.virtual('courseInfo', {
  ref: 'Course',
  localField: 'course',
  foreignField: '_id',
  justOne: true,
  select: 'title description thumbnailUrl price category isPaid'
});

// Virtual for enrollment info
PaymentSchema.virtual('enrollmentInfo', {
  ref: 'Enrollment',
  localField: 'enrollment',
  foreignField: '_id',
  justOne: true,
  select: 'status progress paymentStatus'
});

// Pre-save middleware to update timestamps based on status changes (no next in Mongoose 7+)
PaymentSchema.pre('save', function() {
  const now = new Date();

  if (this.isModified('status')) {
    switch (this.status) {
      case 'success':
        if (!this.completedAt) {
          this.completedAt = now;
        }
        break;
      case 'failed':
      case 'cancelled':
        if (!this.failedAt) {
          this.failedAt = now;
        }
        break;
      case 'refunded':
        if (!this.refundedAt) {
          this.refundedAt = now;
        }
        break;
    }
  }
});

// Static method to get payment statistics
PaymentSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        refunded: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
        totalAmount: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
        averageAmount: { $avg: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', null] } }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0,
    pending: 0,
    success: 0,
    failed: 0,
    cancelled: 0,
    refunded: 0,
    totalAmount: 0,
    averageAmount: 0
  };
};

// Static method to get payments by student
PaymentSchema.statics.getByStudent = async function(studentId: string, limit = 10, skip = 0) {
  return this.find({ student: studentId })
    .populate('course', 'title thumbnailUrl price')
    .populate('enrollment', 'status progress')
    .sort({ initiatedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get payments by course
PaymentSchema.statics.getByCourse = async function(courseId: string, limit = 10, skip = 0) {
  return this.find({ course: courseId })
    .populate('student', 'firstName lastName email')
    .populate('enrollment', 'status progress')
    .sort({ initiatedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get recent successful payments
PaymentSchema.statics.getRecentSuccessful = async function(limit = 10) {
  return this.find({ status: 'success' })
    .populate('student', 'firstName lastName email')
    .populate('course', 'title thumbnailUrl price')
    .sort({ completedAt: -1 })
    .limit(limit);
};

// Static method to get refunded payments
PaymentSchema.statics.getRefunded = async function(limit = 10, skip = 0) {
  return this.find({ status: 'refunded' })
    .populate('student', 'firstName lastName email')
    .populate('course', 'title thumbnailUrl price')
    .populate('refundedBy', 'firstName lastName email')
    .sort({ refundedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get payments eligible for refund
PaymentSchema.statics.getEligibleForRefund = async function(limit = 10, skip = 0) {
  return this.find({ 
    status: 'success',
    refundStatus: { $exists: false }
  })
    .populate('student', 'firstName lastName email')
    .populate('course', 'title thumbnailUrl price')
    .sort({ completedAt: -1 })
    .limit(limit)
    .skip(skip);
};

const Payment = mongoose.models.Payment || mongoose.model<IPayment, IPaymentModel>('Payment', PaymentSchema);

export default Payment;
