import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseReview from '@/models/CourseReview';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/course-reviews/[id] - Get a specific review for admin
export async function GET(request: NextRequest, { params }: RouteParams) {
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
        { success: false, error: 'Invalid review ID' },
        { status: 400 }
      );
    }

    const review = await CourseReview.findById(id)
      .populate('student', 'firstName lastName email avatar')
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
    console.error('Error fetching admin review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/course-reviews/[id] - Moderate a review (approve/disapprove, make public/private)
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
        { success: false, error: 'Invalid review ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isApproved, isPublic, isDisplayed, displayOrder, action } = body;

    // Find the review
    const review = await CourseReview.findById(id);

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }

    // Handle different moderation actions
    let updateData: any = {};

    if (action === 'approve') {
      updateData.isApproved = true;
    } else if (action === 'disapprove') {
      updateData.isApproved = false;
    } else if (action === 'make_public') {
      updateData.isPublic = true;
    } else if (action === 'make_private') {
      updateData.isPublic = false;
    } else if (action === 'display') {
      updateData.isDisplayed = true;
    } else if (action === 'hide') {
      updateData.isDisplayed = false;
    } else if (action === 'reset_reports') {
      updateData.reportedCount = 0;
    } else {
      // Direct field updates
      if (isApproved !== undefined) updateData.isApproved = isApproved;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (isDisplayed !== undefined) updateData.isDisplayed = isDisplayed;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    }

    const updatedReview = await CourseReview.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('student', 'firstName lastName email avatar')
      .populate('course', 'title thumbnailUrl')
      .lean();

    return NextResponse.json({
      success: true,
      data: updatedReview,
      message: 'Review moderated successfully'
    });

  } catch (error) {
    console.error('Error moderating review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to moderate review' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/course-reviews/[id] - Delete a review (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
