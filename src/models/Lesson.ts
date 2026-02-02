import mongoose, { Schema, Document } from 'mongoose';

export interface ILesson extends Document {
  title: string;
  description?: string;
  content?: string;
  chapter: string; // Reference to Chapter
  course: string; // Reference to Course (for easier querying)
  order: number;
  duration?: number; // Duration in minutes
  youtubeVideoId?: string; // YouTube video ID
  videoUrl?: string; // Keep for backward compatibility
  videoDuration?: number; // Video duration in seconds
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  isPublished: boolean;
  isFree: boolean;
  completionCount?: number; // Virtual field - number of users who completed this lesson
  averageCompletionTime?: number; // Virtual field - average time to complete in minutes
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
      maxlength: [200, 'Lesson title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    content: {
      type: String,
      trim: true,
    },
    chapter: {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
      required: [true, 'Chapter reference is required'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course reference is required'],
    },
    order: {
      type: Number,
      required: [true, 'Lesson order is required'],
      min: [1, 'Lesson order must be at least 1'],
    },
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative'],
    },
    youtubeVideoId: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          // YouTube video ID validation (11 characters, alphanumeric, hyphens, underscores)
          if (!v) return true; // Allow empty
          // Relaxed to accept 10-15 chars to support edge cases like provided IDs
          return /^[a-zA-Z0-9_-]{10,15}$/.test(v);
        },
        message: 'Invalid YouTube video ID format'
      }
    },
    videoUrl: {
      type: String,
      trim: true,
    },
    videoDuration: {
      type: Number,
      min: [0, 'Video duration cannot be negative'],
    },
    attachments: [{
      name: {
        type: String,
        required: true,
        trim: true,
      },
      url: {
        type: String,
        required: true,
        trim: true,
      },
      type: {
        type: String,
        required: true,
        trim: true,
      },
      size: {
        type: Number,
        min: [0, 'File size cannot be negative'],
      },
    }],
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for YouTube embed URL
LessonSchema.virtual('youtubeEmbedUrl').get(function() {
  if (this.youtubeVideoId) {
    return `https://www.youtube.com/embed/${this.youtubeVideoId}`;
  }
  return null;
});

// Virtual for YouTube thumbnail URL
LessonSchema.virtual('youtubeThumbnailUrl').get(function() {
  if (this.youtubeVideoId) {
    return `https://img.youtube.com/vi/${this.youtubeVideoId}/maxresdefault.jpg`;
  }
  return null;
});

// Virtual for YouTube watch URL
LessonSchema.virtual('youtubeWatchUrl').get(function() {
  if (this.youtubeVideoId) {
    return `https://www.youtube.com/watch?v=${this.youtubeVideoId}`;
  }
  return null;
});

// Virtual for completion count
LessonSchema.virtual('completionCount', {
  ref: 'UserProgress',
  localField: '_id',
  foreignField: 'lesson',
  count: true,
  match: { isCompleted: true }
});

// Virtual for average completion time
LessonSchema.virtual('averageCompletionTime', {
  ref: 'UserProgress',
  localField: '_id',
  foreignField: 'lesson',
  justOne: false,
  options: { match: { isCompleted: true } }
});

// Index for efficient queries
LessonSchema.index({ chapter: 1, order: 1 });
LessonSchema.index({ course: 1, isPublished: 1 });
LessonSchema.index({ course: 1, isFree: 1 });
LessonSchema.index({ youtubeVideoId: 1 });

// Unique order within a chapter is enforced in the API (POST/PATCH) before save to avoid Mongoose 7+ middleware next() issues

const Lesson = mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema);

export default Lesson;
