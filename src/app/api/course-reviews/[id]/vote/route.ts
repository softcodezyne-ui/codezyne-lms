import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseReview from '@/models/CourseReview';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/course-reviews/[id]/vote - Vote on a review (helpful/not helpful)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only students can vote on reviews
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'Only students can vote on reviews' },
        { status: 403 }
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
    const { isHelpful } = body;

    if (typeof isHelpful !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isHelpful must be a boolean value' },
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

    // Check if user is trying to vote on their own review
    if (review.student.toString() === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot vote on your own review' },
        { status: 400 }
      );
    }

    // For now, we'll just increment the helpful votes
    // In a more sophisticated system, you might want to track individual votes
    // and prevent duplicate voting from the same user
    const updateData = isHelpful 
      ? { $inc: { helpfulVotes: 1 } }
      : { $inc: { helpfulVotes: -1 } };

    const updatedReview = await CourseReview.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('student', 'firstName lastName avatar')
      .populate('course', 'title thumbnailUrl')
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedReview,
      message: `Review marked as ${isHelpful ? 'helpful' : 'not helpful'}`
    });

  } catch (error) {
    console.error('Error voting on review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to vote on review' },
      { status: 500 }
    );
  }
}
