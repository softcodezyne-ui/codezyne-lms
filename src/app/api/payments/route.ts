import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Payment, { IPaymentModel } from '@/models/Payment';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');
    const skip = (page - 1) * limit;

    // Build filter object
    const filter: any = {};
    if (status) filter.status = status;
    if (studentId) filter.student = studentId;
    if (courseId) filter.course = courseId;

    // Get payments with pagination
    const payments = await Payment.find(filter)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title thumbnailUrl price')
      .populate('enrollment', 'status progress')
      .sort({ initiatedAt: -1 })
      .limit(limit)
      .skip(skip);

    // Get total count for pagination
    const total = await Payment.countDocuments(filter);

    // Get payment statistics
    const stats = await (Payment as IPaymentModel).getStats();

    return NextResponse.json({
      success: true,
      data: {
        payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { studentId, courseId, status, limit = 10, skip = 0 } = body;

    // Build filter object
    const filter: any = {};
    if (studentId) filter.student = studentId;
    if (courseId) filter.course = courseId;
    if (status) filter.status = status;

    // Get payments
    const payments = await Payment.find(filter)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title thumbnailUrl price')
      .populate('enrollment', 'status progress')
      .sort({ initiatedAt: -1 })
      .limit(limit)
      .skip(skip);

    return NextResponse.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
