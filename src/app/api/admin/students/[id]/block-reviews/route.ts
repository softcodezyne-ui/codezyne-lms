import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/admin/students/[id]/block-reviews - Block or unblock student from creating reviews
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can access this endpoint
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid student ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { block } = body;

    if (typeof block !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Block parameter must be a boolean' },
        { status: 400 }
      );
    }

    // Find the student
    const student = await User.findById(id);

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Only students can be blocked from reviews
    if (student.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'Only students can be blocked from reviews' },
        { status: 400 }
      );
    }

    // Update the block status
    student.isBlockedFromReviews = block;
    await student.save();

    return NextResponse.json({
      success: true,
      data: {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        isBlockedFromReviews: student.isBlockedFromReviews
      },
      message: block 
        ? 'Student has been blocked from creating reviews' 
        : 'Student has been unblocked and can now create reviews'
    });

  } catch (error) {
    console.error('Error blocking/unblocking student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update student block status' },
      { status: 500 }
    );
  }
}

