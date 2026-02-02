import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';

// GET /api/students - Get all students (admin only)
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
    const query: any = { role: 'student' };
    
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

    // Get students
    const students = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total enrollment amount for each student
    const studentIds = students.map(student => student._id);
    const enrollmentData = await Enrollment.aggregate([
      {
        $match: {
          student: { $in: studentIds },
          paymentStatus: 'paid' // Only count paid enrollments
        }
      },
      {
        $group: {
          _id: '$student',
          totalEnrolledAmount: { $sum: '$paymentAmount' },
          enrollmentCount: { $sum: 1 }
        }
      }
    ]);

    // Create a map of student ID to enrollment data
    const enrollmentMap = new Map();
    enrollmentData.forEach(item => {
      enrollmentMap.set(item._id.toString(), {
        totalEnrolledAmount: item.totalEnrolledAmount || 0,
        enrollmentCount: item.enrollmentCount || 0
      });
    });

    // Add enrollment data to each student
    const studentsWithEnrollment = students.map(student => {
      const studentId = student._id.toString();
      const enrollmentInfo = enrollmentMap.get(studentId) || { totalEnrolledAmount: 0, enrollmentCount: 0 };

      return {
        ...student.toObject(),
        totalEnrolledAmount: enrollmentInfo.totalEnrolledAmount,
        enrollmentCount: enrollmentInfo.enrollmentCount
      };
    });

    const total = await User.countDocuments(query);

    return NextResponse.json({
      students: studentsWithEnrollment,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get students error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/students - Create student (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      phone,
      password,
      firstName,
      lastName,
      isActive = true,
      avatar,
      parentPhone,
      address
    } = await request.json();

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
        { error: 'Student with this phone number already exists' },
        { status: 409 }
      );
    }

    // Auto-generate email from phone number
    let generatedEmail = `${cleanPhone}@student.local`;

    // Check if generated email already exists (unlikely but possible)
    const existingUserByEmail = await User.findOne({ email: generatedEmail.toLowerCase() });
    if (existingUserByEmail) {
      // If email exists, append timestamp
      const timestamp = Date.now();
      generatedEmail = `${cleanPhone}_${timestamp}@student.local`;
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);

    const student = new User({
      email: generatedEmail.toLowerCase(),
      phone: cleanPhone,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'student',
      isActive,
      avatar: avatar || undefined,
      parentPhone: parentPhone || undefined,
      address: address || undefined,
      enrollmentDate: new Date(),
      createdBy: session.user.id,
    });

    await student.save();

    return NextResponse.json({
      message: 'Student created successfully',
      student: student.toJSON(),
    }, { status: 201 });
  } catch (error) {
    console.error('Create student error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
