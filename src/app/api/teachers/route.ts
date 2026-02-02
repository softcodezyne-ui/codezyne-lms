import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

// GET /api/teachers - Get all teachers (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // active, inactive, all

    const query: any = { role: 'instructor' };
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'all') {
      query.isActive = status === 'active';
    }

    const skip = (page - 1) * limit;

    const [teachers, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return NextResponse.json({
      teachers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/teachers - Create teacher (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { phone, password, firstName, lastName, isActive = true, avatar, address } = await request.json();

    if (!phone || !password || !firstName || !lastName) {
      return NextResponse.json(
        { error: 'Phone number, password, first name, and last name are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Clean phone number (remove spaces, dashes, parentheses)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check if phone already exists
    const existingUserByPhone = await User.findOne({ phone: cleanPhone });
    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'Teacher with this phone number already exists' },
        { status: 409 }
      );
    }

    // Auto-generate email from phone number
    let generatedEmail = `${cleanPhone}@teacher.local`;

    // Check if generated email already exists (unlikely but possible)
    const existingUserByEmail = await User.findOne({ email: generatedEmail.toLowerCase() });
    if (existingUserByEmail) {
      // If email exists, append timestamp
      const timestamp = Date.now();
      generatedEmail = `${cleanPhone}_${timestamp}@teacher.local`;
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const teacher = new User({
      email: generatedEmail.toLowerCase(),
      phone: cleanPhone,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'instructor',
      isActive,
      avatar: avatar || undefined,
      address: address || undefined,
    });

    await teacher.save();

    return NextResponse.json({
      message: 'Teacher created successfully',
      teacher: teacher.toJSON(),
    }, { status: 201 });
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
