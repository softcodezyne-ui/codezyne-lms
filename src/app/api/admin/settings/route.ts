import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Settings from '@/models/Settings';

// Settings schema for MongoDB
interface SystemSettings {
  siteName: string;
  siteDescription: string;
  siteUrl: string;
  adminEmail: string;
  supportEmail: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  emailVerificationRequired: boolean;
}

interface SecuritySettings {
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  twoFactorEnabled: boolean;
  ipWhitelist: string[];
}

interface NotificationSettings {
  emailNotifications: boolean;
  systemNotifications: boolean;
  courseUpdates: boolean;
  paymentNotifications: boolean;
  enrollmentNotifications: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

interface DatabaseSettings {
  backupFrequency: string;
  backupRetention: number;
  autoCleanup: boolean;
  logRetention: number;
}

interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  useSSL: boolean;
  fromEmail: string;
  fromName: string;
}

interface PaymentSettings {
  provider: 'sslcommerz';
  environment: 'sandbox' | 'live';
  storeId: string;
  storePassword: string;
  sandboxUrl: string;
  liveUrl: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
}

interface SettingsDocument {
  _id?: string;
  category: 'system' | 'security' | 'notifications' | 'database' | 'email' | 'payment';
  settings: SystemSettings | SecuritySettings | NotificationSettings | DatabaseSettings | EmailSettings | PaymentSettings;
  updatedAt: Date;
  updatedBy: string;
}

// GET - Retrieve all settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const settings = await Settings.find({});
    
    // Group settings by category
    const groupedSettings = settings.reduce((acc, setting) => {
      acc[setting.category] = setting.settings;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      success: true,
      data: groupedSettings
    });

  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST - Update settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category, settings } = body;

    if (!category || !settings) {
      return NextResponse.json(
        { error: 'Category and settings are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['system', 'security', 'notifications', 'database', 'email', 'payment'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Validate settings based on category
    const validationResult = validateSettings(category, settings);
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      );
    }

    await connectDB();
    // Update or insert settings
    const result = await Settings.findOneAndUpdate(
      { category },
      {
        category,
        settings,
        updatedBy: session.user.id
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: { category, settings }
    });

  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// PUT - Bulk update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      );
    }

    await connectDB();
    const updatePromises = Object.entries(settings).map(async ([category, categorySettings]) => {
      const validationResult = validateSettings(category, categorySettings);
      if (!validationResult.isValid) {
        throw new Error(`Invalid ${category} settings: ${validationResult.error}`);
      }

      return Settings.findOneAndUpdate(
        { category },
        {
          category,
          settings: categorySettings,
          updatedBy: session.user.id
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: 'All settings updated successfully'
    });

  } catch (error) {
    console.error('Error bulk updating settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// DELETE - Reset settings to default
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    await connectDB();
    if (category) {
      // Delete specific category
      await Settings.deleteOne({ category });
      return NextResponse.json({
        success: true,
        message: `${category} settings reset to default`
      });
    } else {
      // Delete all settings
      await Settings.deleteMany({});
      return NextResponse.json({
        success: true,
        message: 'All settings reset to default'
      });
    }

  } catch (error) {
    console.error('Error resetting settings:', error);
    return NextResponse.json(
      { error: 'Failed to reset settings' },
      { status: 500 }
    );
  }
}

// Validation function for settings
function validateSettings(category: string, settings: any): { isValid: boolean; error?: string } {
  switch (category) {
    case 'system':
      return validateSystemSettings(settings);
    case 'security':
      return validateSecuritySettings(settings);
    case 'notifications':
      return validateNotificationSettings(settings);
    case 'database':
      return validateDatabaseSettings(settings);
    case 'email':
      return validateEmailSettings(settings);
    case 'payment':
      return validatePaymentSettings(settings);
    default:
      return { isValid: false, error: 'Invalid category' };
  }
}

function validateSystemSettings(settings: any): { isValid: boolean; error?: string } {
  const required = ['siteName', 'siteUrl', 'adminEmail'];
  for (const field of required) {
    if (!settings[field] || typeof settings[field] !== 'string') {
      return { isValid: false, error: `${field} is required and must be a string` };
    }
  }

  if (settings.siteUrl && !isValidUrl(settings.siteUrl)) {
    return { isValid: false, error: 'Invalid site URL format' };
  }

  if (settings.adminEmail && !isValidEmail(settings.adminEmail)) {
    return { isValid: false, error: 'Invalid admin email format' };
  }

  return { isValid: true };
}

function validateSecuritySettings(settings: any): { isValid: boolean; error?: string } {
  if (settings.passwordMinLength && (typeof settings.passwordMinLength !== 'number' || settings.passwordMinLength < 6 || settings.passwordMinLength > 32)) {
    return { isValid: false, error: 'Password minimum length must be between 6 and 32' };
  }

  if (settings.sessionTimeout && (typeof settings.sessionTimeout !== 'number' || settings.sessionTimeout < 1 || settings.sessionTimeout > 168)) {
    return { isValid: false, error: 'Session timeout must be between 1 and 168 hours' };
  }

  if (settings.maxLoginAttempts && (typeof settings.maxLoginAttempts !== 'number' || settings.maxLoginAttempts < 1 || settings.maxLoginAttempts > 10)) {
    return { isValid: false, error: 'Max login attempts must be between 1 and 10' };
  }

  return { isValid: true };
}

function validateNotificationSettings(settings: any): { isValid: boolean; error?: string } {
  // All notification settings should be boolean
  const booleanFields = [
    'emailNotifications', 'systemNotifications', 'courseUpdates',
    'paymentNotifications', 'enrollmentNotifications', 'weeklyReports', 'monthlyReports'
  ];

  for (const field of booleanFields) {
    if (settings[field] !== undefined && typeof settings[field] !== 'boolean') {
      return { isValid: false, error: `${field} must be a boolean` };
    }
  }

  return { isValid: true };
}

function validateDatabaseSettings(settings: any): { isValid: boolean; error?: string } {
  const validFrequencies = ['daily', 'weekly', 'monthly'];
  if (settings.backupFrequency && !validFrequencies.includes(settings.backupFrequency)) {
    return { isValid: false, error: 'Backup frequency must be daily, weekly, or monthly' };
  }

  if (settings.backupRetention && (typeof settings.backupRetention !== 'number' || settings.backupRetention < 7 || settings.backupRetention > 365)) {
    return { isValid: false, error: 'Backup retention must be between 7 and 365 days' };
  }

  if (settings.logRetention && (typeof settings.logRetention !== 'number' || settings.logRetention < 30 || settings.logRetention > 365)) {
    return { isValid: false, error: 'Log retention must be between 30 and 365 days' };
  }

  return { isValid: true };
}

function validateEmailSettings(settings: any): { isValid: boolean; error?: string } {
  const required = ['smtpHost', 'smtpPort', 'smtpUsername', 'fromEmail'];
  for (const field of required) {
    if (!settings[field]) {
      return { isValid: false, error: `${field} is required` };
    }
  }

  if (settings.smtpPort && (typeof settings.smtpPort !== 'number' || settings.smtpPort < 1 || settings.smtpPort > 65535)) {
    return { isValid: false, error: 'SMTP port must be between 1 and 65535' };
  }

  if (settings.fromEmail && !isValidEmail(settings.fromEmail)) {
    return { isValid: false, error: 'Invalid from email format' };
  }

  return { isValid: true };
}

function validatePaymentSettings(settings: any): { isValid: boolean; error?: string } {
  // Required base fields
  const required = ['provider', 'environment', 'storeId', 'storePassword'];
  for (const field of required) {
    if (!settings[field]) {
      return { isValid: false, error: `${field} is required` };
    }
  }

  if (!['sandbox', 'live'].includes(settings.environment)) {
    return { isValid: false, error: 'environment must be sandbox or live' };
  }

  // Optional URLs if provided must be valid
  const urlFields = ['sandboxUrl', 'liveUrl', 'successUrl', 'failUrl', 'cancelUrl', 'ipnUrl'];
  for (const field of urlFields) {
    if (settings[field] && !isValidUrl(settings[field])) {
      return { isValid: false, error: `${field} must be a valid URL` };
    }
  }

  return { isValid: true };
}

// Helper functions
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
