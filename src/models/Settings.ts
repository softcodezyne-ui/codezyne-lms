import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  _id: mongoose.Types.ObjectId;
  category: 'system' | 'security' | 'notifications' | 'database' | 'email' | 'payment' | 'student' | 'website-content';
  settings: any; // Flexible settings object
  updatedAt: Date;
  updatedBy: string;
}

const SettingsSchema = new Schema<ISettings>(
  {
    category: {
      type: String,
      enum: ['system', 'security', 'notifications', 'database', 'email', 'payment', 'student', 'website-content'],
      required: true,
      unique: true,
    },
    settings: {
      type: Schema.Types.Mixed,
      required: true,
    },
    updatedBy: {
      type: String,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for better query performance
// Note: category index is already created by unique: true above
SettingsSchema.index({ updatedAt: -1 });
SettingsSchema.index({ updatedBy: 1 });

// Safely check mongoose.models before accessing to prevent client-side errors
let SettingsModel: mongoose.Model<ISettings>;
if (typeof window === 'undefined' && mongoose.models && mongoose.models.Settings) {
  SettingsModel = mongoose.models.Settings;
} else if (typeof window === 'undefined') {
  SettingsModel = mongoose.model<ISettings>('Settings', SettingsSchema);
} else {
  // Browser environment - export a dummy model
  SettingsModel = {} as any;
}

export default SettingsModel;
