import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Settings from '@/models/Settings';

// Settings schema for MongoDB
interface InstructorSettings {
  displayName: string;
  email: string;
  profileVisibility: boolean;
  bio: string;
  expertise: string;
  teachingExperience: number;
  allowStudentMessages: boolean;
  showContactInfo: boolean;
  preferredEmail: string;
  emailSignature: string;
  courseNotifications: boolean;
  studentNotifications: boolean;
  emailNotifications: boolean;
}

interface SettingsDocument {
  _id?: string;
  category: 'instructor';
  settings: InstructorSettings;
  updatedAt: Date;
  updatedBy: string;
}

// GET - Retrieve instructor settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const settings = await Settings.find({ category: 'instructor' });
    
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
    console.error('Error fetching instructor settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// POST - Update instructor settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'instructor') {
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
    const validCategories = ['instructor'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      );
    }

    // Validate settings based on category
    const validationResult = validateInstructorSettings(settings);
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
      data: result,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating instructor settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// PUT - Update multiple instructor settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('PUT request body:', body);
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      console.log('Invalid settings object:', settings);
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      );
    }

    await connectDB();
    const updatePromises = Object.entries(settings).map(async ([category, categorySettings]) => {
      console.log(`Validating ${category} settings:`, categorySettings);
      const validationResult = validateInstructorSettings(categorySettings);
      console.log(`Validation result for ${category}:`, validationResult);
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
    console.error('Error updating instructor settings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// DELETE - Delete instructor settings
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'instructor') {
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
      // Delete all instructor settings
      await Settings.deleteMany({ category: 'instructor' });
      return NextResponse.json({
        success: true,
        message: 'All instructor settings reset to default'
      });
    }

  } catch (error) {
    console.error('Error deleting instructor settings:', error);
    return NextResponse.json(
      { error: 'Failed to delete settings' },
      { status: 500 }
    );
  }
}

// Validation function for instructor settings
function validateInstructorSettings(settings: any): { isValid: boolean; error?: string } {
  if (!settings || typeof settings !== 'object') {
    return { isValid: false, error: 'Settings must be an object' };
  }

  // Validate required fields (only if they exist)
  if (settings.displayName && typeof settings.displayName !== 'string') {
    return { isValid: false, error: 'displayName must be a string' };
  }
  
  if (settings.email && typeof settings.email !== 'string') {
    return { isValid: false, error: 'email must be a string' };
  }

  // Validate email format (only if email exists)
  if (settings.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(settings.email)) {
      return { isValid: false, error: 'Invalid email format' };
    }
  }

  // Validate boolean fields
  const booleanFields = [
    'profileVisibility',
    'allowStudentMessages',
    'showContactInfo',
    'courseNotifications',
    'studentNotifications',
    'emailNotifications'
  ];

  for (const field of booleanFields) {
    if (settings[field] !== undefined && typeof settings[field] !== 'boolean') {
      return { isValid: false, error: `${field} must be a boolean` };
    }
  }

  // Validate teaching experience
  if (settings.teachingExperience !== undefined) {
    if (typeof settings.teachingExperience !== 'number' || settings.teachingExperience < 0) {
      return { isValid: false, error: 'Teaching experience must be a non-negative number' };
    }
  }

  // Validate bio length
  if (settings.bio && settings.bio.length > 1000) {
    return { isValid: false, error: 'Bio must be less than 1000 characters' };
  }

  return { isValid: true };
}

