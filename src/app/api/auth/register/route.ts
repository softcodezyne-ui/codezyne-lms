import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { phone, password, firstName, lastName, avatar, role = 'student' } = await request.json();

    // Validate required fields
    if (!phone || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Validate phone format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'instructor', 'student'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user already exists by phone
    const existingUserByPhone = await User.findOne({ phone: cleanPhone });
    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'User already exists with this phone number' },
        { status: 409 }
      );
    }

    // Auto-generate email from phone number
    let generatedEmail = `${cleanPhone}@user.local`;

    // Check if generated email already exists (unlikely but possible)
    const existingUserByEmail = await User.findOne({ email: generatedEmail.toLowerCase() });
    if (existingUserByEmail) {
      // If email exists, append timestamp
      const timestamp = Date.now();
      generatedEmail = `${cleanPhone}_${timestamp}@user.local`;
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = new User({
      email: generatedEmail.toLowerCase(),
      phone: cleanPhone,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      isActive: true,
      avatar: avatar || undefined,
    });

    await user.save();

    // Return user without password
    const userResponse = user.toJSON();

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: userResponse,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
