import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseReview from '@/models/CourseReview';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/course-reviews/[id] - Get a specific review
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow public access for approved reviews only
    const isPublicAccess = !session;

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid review ID' },
        { status: 400 }
      );
    }

    // Build filter for review access
    const filter: any = { _id: id };
    
    // For public access, only allow approved and public reviews
    if (isPublicAccess) {
      filter.isPublic = true;
      filter.isApproved = true;
    } else {
      // For authenticated users, allow access to their own reviews or all reviews if admin
      if (session.user.role !== 'admin') {
        filter.student = session.user.id;
      }
    }

    const review = await CourseReview.findOne(filter)
      .populate('student', 'firstName lastName avatar')
      .populate('course', 'title thumbnailUrl')
      .lean();

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: review
    });

  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

// PUT /api/course-reviews/[id] - Update a review
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const { rating, title, comment } = body;

    // Find the review
    const review = await CourseReview.findById(id);

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role !== 'admin' && review.student.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only update your own reviews' },
        { status: 403 }
      );
    }

    // Validation
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Update review
    const updateData: any = {};
    if (rating !== undefined) updateData.rating = rating;
    if (title !== undefined) updateData.title = title?.trim();
    if (comment !== undefined) updateData.comment = comment?.trim();

    const updatedReview = await CourseReview.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('student', 'firstName lastName avatar')
      .populate('course', 'title thumbnailUrl')
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedReview,
      message: 'Review updated successfully'
    });

  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE /api/course-reviews/[id] - Delete a review
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Find the review
    const review = await CourseReview.findById(id);

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check permissions
    if (session.user.role !== 'admin' && review.student.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own reviews' },
        { status: 403 }
      );
    }

    // Delete the review
    await CourseReview.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}
