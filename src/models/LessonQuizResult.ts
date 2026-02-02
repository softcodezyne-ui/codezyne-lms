import mongoose, { Schema, Document } from 'mongoose';

export interface ILessonQuizResult extends Document {
  user: string; // Reference to User
  course: string; // Denormalized for quick queries
  lesson: string; // Reference to Lesson
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number; // 0..100
  answers: Array<{
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean;
  }>;
  isPracticeMode: boolean; // true for practice attempts, false for real submissions
  startedAt: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LessonQuizResultSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true,
      index: true,
    },
    totalQuestions: { type: Number, required: true, min: 0 },
    correctAnswers: { type: Number, required: true, min: 0 },
    scorePercentage: { type: Number, required: true, min: 0, max: 100 },
    answers: [
      {
        questionId: { type: Schema.Types.ObjectId, ref: 'LessonQuizQuestion', required: true },
        selectedIndex: { type: Number, required: true, min: 0 },
        isCorrect: { type: Boolean, required: true },
      },
    ],
    isPracticeMode: { type: Boolean, default: false, index: true },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

LessonQuizResultSchema.index({ user: 1, lesson: 1 }, { unique: false });
LessonQuizResultSchema.index({ course: 1, lesson: 1 });

const LessonQuizResult =
  mongoose.models.LessonQuizResult ||
  mongoose.model<ILessonQuizResult>('LessonQuizResult', LessonQuizResultSchema);

export default LessonQuizResult;


