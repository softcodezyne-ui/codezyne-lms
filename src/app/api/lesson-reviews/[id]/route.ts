import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LessonReview from '@/models/LessonReview';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/lesson-reviews/[id] - Get a specific lesson review
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const isPublicAccess = !session;

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid review ID' },
        { status: 400 }
      );
    }

    const review = await LessonReview.findById(id)
      .populate('student', 'firstName lastName avatar')
      .populate('lesson', 'title order')
      .populate('course', 'title thumbnailUrl')
      .lean();

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if review is public and approved (for public access)
    if (isPublicAccess && (!(review as any).isPublic || !(review as any).isApproved)) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...review,
        _id: (review as any)._id.toString(),
        createdAt: (review as any).createdAt.toISOString(),
        updatedAt: (review as any).updatedAt.toISOString(),
      }
    });

  } catch (error) {
    console.error('Error fetching lesson review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

// PUT /api/lesson-reviews/[id] - Update a lesson review
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

    const review = await LessonReview.findById(id);

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Only the review owner or admin can update
    if (review.student.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rating, reviewType, title, comment, videoUrl, videoThumbnail } = body;

    // Update fields
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json(
          { success: false, error: 'Rating must be between 1 and 5' },
          { status: 400 }
        );
      }
      review.rating = rating;
    }

    if (reviewType !== undefined) {
      if (!['text', 'video'].includes(reviewType)) {
        return NextResponse.json(
          { success: false, error: 'Review type must be either "text" or "video"' },
          { status: 400 }
        );
      }
      review.reviewType = reviewType;
    }

    if (title !== undefined) {
      review.title = title?.trim();
    }

    if (comment !== undefined) {
      review.comment = comment?.trim();
    }

    if (videoUrl !== undefined) {
      review.videoUrl = videoUrl?.trim();
    }

    if (videoThumbnail !== undefined) {
      review.videoThumbnail = videoThumbnail?.trim();
    }

    // Validate content based on review type
    if (review.reviewType === 'text' && !review.comment?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Comment is required for text reviews' },
        { status: 400 }
      );
    }

    if (review.reviewType === 'video' && !review.videoUrl?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Video URL is required for video reviews' },
        { status: 400 }
      );
    }

    await review.save();

    const updatedReview = await LessonReview.findById(review._id)
      .populate('student', 'firstName lastName avatar')
      .populate('lesson', 'title order')
      .populate('course', 'title thumbnailUrl')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...updatedReview,
        _id: (updatedReview as any)._id.toString(),
        createdAt: (updatedReview as any).createdAt.toISOString(),
        updatedAt: (updatedReview as any).updatedAt.toISOString(),
      },
      message: 'Review updated successfully'
    });

  } catch (error) {
    console.error('Error updating lesson review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

// DELETE /api/lesson-reviews/[id] - Delete a lesson review
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

    const review = await LessonReview.findById(id);

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Only the review owner or admin can delete
    if (review.student.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await LessonReview.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting lesson review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}

