import mongoose, { Schema, Document } from 'mongoose';

export interface ILessonQuizQuestion extends Document {
  lesson: string; // Reference to Lesson
  course: string; // Denormalized for quick queries
  question: string;
  options: string[]; // At least two
  correctOptionIndex: number; // 0-based index into options
  explanation?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LessonQuizQuestionSchema: Schema = new Schema(
  {
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson reference is required'],
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: [1000, 'Question cannot exceed 1000 characters'],
    },
    options: {
      type: [String],
      validate: {
        validator: function (v: string[]) {
          return Array.isArray(v) && v.length >= 2 && v.every((o) => typeof o === 'string' && o.trim().length > 0);
        },
        message: 'Options must include at least two non-empty strings',
      },
      required: true,
    },
    correctOptionIndex: {
      type: Number,
      required: true,
      min: [0, 'correctOptionIndex must be >= 0'],
    },
    explanation: {
      type: String,
      trim: true,
      maxlength: [2000, 'Explanation cannot exceed 2000 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

LessonQuizQuestionSchema.index({ lesson: 1, isActive: 1 });
LessonQuizQuestionSchema.index({ course: 1, isActive: 1 });

LessonQuizQuestionSchema.pre('save', function (next) {
  const doc = this as any;
  if (doc.correctOptionIndex < 0 || doc.correctOptionIndex >= doc.options.length) {
    return next(new Error('correctOptionIndex must be a valid index within options'));
  }
  next();
});

const LessonQuizQuestion =
  mongoose.models.LessonQuizQuestion ||
  mongoose.model<ILessonQuizQuestion>('LessonQuizQuestion', LessonQuizQuestionSchema);

export default LessonQuizQuestion;


