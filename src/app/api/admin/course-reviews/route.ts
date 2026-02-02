import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseReview from '@/models/CourseReview';

// GET /api/admin/course-reviews - Get all reviews for admin management
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const course = searchParams.get('course') || '';
    const student = searchParams.get('student') || '';
    const rating = searchParams.get('rating');
    const isApproved = searchParams.get('isApproved');
    const isPublic = searchParams.get('isPublic');
    const reportedCount = searchParams.get('reportedCount');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filters: any = {};

    if (course) {
      filters.course = course;
    }

    if (student) {
      filters.student = student;
    }

    if (rating) {
      filters.rating = parseInt(rating);
    }

    if (isApproved !== null && isApproved !== undefined) {
      filters.isApproved = isApproved === 'true';
    }

    if (isPublic !== null && isPublic !== undefined) {
      filters.isPublic = isPublic === 'true';
    }

    if (reportedCount) {
      filters.reportedCount = { $gte: parseInt(reportedCount) };
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      CourseReview.find(filters)
        .populate('student', 'firstName lastName email avatar isBlockedFromReviews')
        .populate('course', 'title thumbnailUrl')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseReview.countDocuments(filters)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching admin reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}
