import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseReview from '@/models/CourseReview';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/course-reviews/[id]/report - Report a review
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid review ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason, description } = body;

    if (!reason || reason.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Report reason is required' },
        { status: 400 }
      );
    }

    // Find the review
    const review = await CourseReview.findById(id);

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if user is trying to report their own review
    if (review.student.toString() === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot report your own review' },
        { status: 400 }
      );
    }

    // Increment the reported count
    const updatedReview = await CourseReview.findByIdAndUpdate(
      id,
      { 
        $inc: { reportedCount: 1 },
        // If reported count reaches a threshold, mark as not approved
        $set: review.reportedCount >= 4 ? { isApproved: false } : {}
      },
      { new: true }
    )
      .populate('student', 'firstName lastName avatar')
      .populate('course', 'title thumbnailUrl')
      .lean();

    // TODO: In a real application, you might want to:
    // 1. Store the report details in a separate collection
    // 2. Send notifications to admins
    // 3. Implement more sophisticated moderation logic

    return NextResponse.json({
      success: true,
      data: updatedReview,
      message: 'Review reported successfully'
    });

  } catch (error) {
    console.error('Error reporting review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to report review' },
      { status: 500 }
    );
  }
}
