import { Schema, model, models, Document, Types } from 'mongoose';

export interface IPassPaper extends Document {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  sessionName: string;
  year: number;
  subject: string;
  examType: string;
  questionPaperUrl?: string;
  marksPdfUrl?: string;
  workSolutionUrl?: string;
  description?: string;
  tags?: string;
  isActive?: boolean;
  uploadedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PassPaperSchema = new Schema<IPassPaper>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required']
    },
    sessionName: {
      type: String,
      required: [true, 'Session name is required'],
      trim: true,
      maxlength: [100, 'Session name cannot exceed 100 characters']
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: [1900, 'Year must be at least 1900'],
      max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters']
    },
    examType: {
      type: String,
      required: [true, 'Exam type is required'],
      trim: true,
      maxlength: [50, 'Exam type cannot exceed 50 characters']
    },
    questionPaperUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.pdf$/i.test(v);
        },
        message: 'Question paper URL must be a valid PDF URL'
      }
    },
    marksPdfUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.pdf$/i.test(v);
        },
        message: 'Marks PDF URL must be a valid PDF URL'
      }
    },
    workSolutionUrl: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^https?:\/\/.+\.pdf$/i.test(v);
        },
        message: 'Work solution URL must be a valid PDF URL'
      }
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    tags: {
      type: String,
      trim: true,
      maxlength: [200, 'Tags cannot exceed 200 characters']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    uploadedBy: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
PassPaperSchema.index({ course: 1, sessionName: 1, year: 1, subject: 1, examType: 1 }, { unique: true });
PassPaperSchema.index({ isActive: 1 });
PassPaperSchema.index({ uploadedBy: 1 });
PassPaperSchema.index({ createdAt: -1 });
PassPaperSchema.index({ year: -1 });
PassPaperSchema.index({ subject: 1 });
PassPaperSchema.index({ examType: 1 });

// Text search index
PassPaperSchema.index({
  sessionName: 'text',
  subject: 'text',
  examType: 'text',
  description: 'text',
  tags: 'text'
});

// All PDFs are optional - no validation needed

// Transform to JSON
PassPaperSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Avoid OverwriteModelError in dev/hot-reload
const PassPaperModel = (models.PassPaper as any) || model<IPassPaper>('PassPaper', PassPaperSchema);
export default PassPaperModel;
export { PassPaperModel as PassPaper };
