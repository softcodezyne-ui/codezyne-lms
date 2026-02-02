import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Settings from '@/models/Settings';
import User from '@/models/User';

// Default student settings
const defaultStudentSettings = {
  displayName: '',
  email: '',
  profileVisibility: true,
  bio: '',
  interests: '',
  learningGoals: '',
  allowInstructorMessages: true,
  showProgress: true,
  preferredEmail: '',
  emailSignature: '',
  courseNotifications: true,
  assignmentNotifications: true,
  emailNotifications: true,
  reminderNotifications: true,
};

// Validation function for student settings
function validateStudentSettings(settings: any) {
  const errors: string[] = [];
  
  // Only validate fields that are present
  if (settings.displayName !== undefined && typeof settings.displayName !== 'string') {
    errors.push('Display name must be a string');
  }
  
  if (settings.email !== undefined && typeof settings.email !== 'string') {
    errors.push('Email must be a string');
  }
  
  if (settings.bio !== undefined && typeof settings.bio !== 'string') {
    errors.push('Bio must be a string');
  }
  
  if (settings.interests !== undefined && typeof settings.interests !== 'string') {
    errors.push('Interests must be a string');
  }
  
  if (settings.learningGoals !== undefined && typeof settings.learningGoals !== 'string') {
    errors.push('Learning goals must be a string');
  }
  
  if (settings.preferredEmail !== undefined && typeof settings.preferredEmail !== 'string') {
    errors.push('Preferred email must be a string');
  }
  
  if (settings.emailSignature !== undefined && typeof settings.emailSignature !== 'string') {
    errors.push('Email signature must be a string');
  }
  
  // Boolean validations
  const booleanFields = [
    'profileVisibility', 'allowInstructorMessages', 'showProgress',
    'courseNotifications', 'assignmentNotifications', 'emailNotifications', 'reminderNotifications'
  ];
  
  booleanFields.forEach(field => {
    if (settings[field] !== undefined && typeof settings[field] !== 'boolean') {
      errors.push(`${field} must be a boolean`);
    }
  });
  
  return errors;
}

// GET - Fetch student settings
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Try both session methods for better compatibility
    const session = await getServerSession(authOptions);
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    console.log('GET /api/student/settings - Session:', session);
    console.log('GET /api/student/settings - Token:', token);
    console.log('GET /api/student/settings - User:', session?.user);
    console.log('GET /api/student/settings - User role from session:', session?.user?.role);
    console.log('GET /api/student/settings - User role from token:', token?.role);
    
    // Get user ID from either session or token
    const userId = session?.user?.id || token?.sub;
    
    if (!userId) {
      console.log('GET /api/student/settings - No user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user exists and is a student in the database
    const user = await User.findById(userId);
    if (!user) {
      console.log('GET /api/student/settings - User not found in database');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('GET /api/student/settings - User from database:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    });
    
    // Check if user is a student
    if (user.role !== 'student') {
      console.log('GET /api/student/settings - User role is not student:', user.role);
      return NextResponse.json({ error: 'Access denied. Student role required.' }, { status: 403 });
    }
    
    if (!user.isActive) {
      console.log('GET /api/student/settings - User is not active');
      return NextResponse.json({ error: 'Account is not active' }, { status: 403 });
    }
    
    const settings = await Settings.findOne({ category: 'student' });
    
    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        student: defaultStudentSettings
      });
    }
    
    return NextResponse.json({
      student: { ...defaultStudentSettings, ...settings.settings }
    });
    
  } catch (error) {
    console.error('Error fetching student settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student settings' },
      { status: 500 }
    );
  }
}

// POST - Create student settings
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Try both session methods for better compatibility
    const session = await getServerSession(authOptions);
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    // Get user ID from either session or token
    const userId = session?.user?.id || token?.sub;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user exists and is a student in the database
    const user = await User.findById(userId);
    if (!user || user.role !== 'student' || !user.isActive) {
      return NextResponse.json({ error: 'Access denied. Student role required.' }, { status: 403 });
    }
    
    const body = await request.json();
    const { settings } = body;
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings data is required' },
        { status: 400 }
      );
    }
    
    // Validate settings
    const validationErrors = validateStudentSettings(settings);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }
    
    // Check if student settings already exist
    const existingSettings = await Settings.findOne({ category: 'student' });
    
    if (existingSettings) {
      return NextResponse.json(
        { error: 'Student settings already exist. Use PUT to update.' },
        { status: 409 }
      );
    }
    
    // Create new student settings
    const newSettings = new Settings({
      category: 'student',
      settings: { ...defaultStudentSettings, ...settings },
      updatedBy: userId
    });
    
    await newSettings.save();
    
    return NextResponse.json({
      message: 'Student settings created successfully',
      settings: newSettings.settings
    });
    
  } catch (error) {
    console.error('Error creating student settings:', error);
    return NextResponse.json(
      { error: 'Failed to create student settings' },
      { status: 500 }
    );
  }
}

// PUT - Update student settings
export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    // Try both session methods for better compatibility
    const session = await getServerSession(authOptions);
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    // Get user ID from either session or token
    const userId = session?.user?.id || token?.sub;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user exists and is a student in the database
    const user = await User.findById(userId);
    if (!user || user.role !== 'student' || !user.isActive) {
      return NextResponse.json({ error: 'Access denied. Student role required.' }, { status: 403 });
    }
    
    const body = await request.json();
    const { settings } = body;
    
    console.log('PUT /api/student/settings - Request body:', body);
    console.log('PUT /api/student/settings - Settings:', settings);
    
    if (!settings) {
      return NextResponse.json(
        { error: 'Settings data is required' },
        { status: 400 }
      );
    }
    
    // Validate settings
    const validationErrors = validateStudentSettings(settings);
    console.log('PUT /api/student/settings - Validation errors:', validationErrors);
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }
    
    // Find existing student settings
    let existingSettings = await Settings.findOne({ category: 'student' });
    
    if (!existingSettings) {
      // Create new settings if they don't exist
      existingSettings = new Settings({
        category: 'student',
        settings: { ...defaultStudentSettings, ...settings },
        updatedBy: userId
      });
    } else {
      // Update existing settings
      existingSettings.settings = { ...existingSettings.settings, ...settings };
      existingSettings.updatedBy = userId;
    }
    
    await existingSettings.save();
    
    console.log('PUT /api/student/settings - Settings saved successfully');
    
    return NextResponse.json({
      message: 'Student settings updated successfully',
      settings: existingSettings.settings
    });
    
  } catch (error) {
    console.error('Error updating student settings:', error);
    return NextResponse.json(
      { error: 'Failed to update student settings' },
      { status: 500 }
    );
  }
}

// DELETE - Reset student settings
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    
    // Try both session methods for better compatibility
    const session = await getServerSession(authOptions);
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    // Get user ID from either session or token
    const userId = session?.user?.id || token?.sub;
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify user exists and is a student in the database
    const user = await User.findById(userId);
    if (!user || user.role !== 'student' || !user.isActive) {
      return NextResponse.json({ error: 'Access denied. Student role required.' }, { status: 403 });
    }
    
    const result = await Settings.deleteOne({ category: 'student' });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Student settings not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      message: 'Student settings deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting student settings:', error);
    return NextResponse.json(
      { error: 'Failed to delete student settings' },
      { status: 500 }
    );
  }
}
