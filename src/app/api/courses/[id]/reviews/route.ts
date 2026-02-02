import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseReview, { ICourseReviewModel } from '@/models/CourseReview';
import Course from '@/models/Course';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/courses/[id]/reviews - Get reviews for a specific course
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow public access for published courses
    const isPublicAccess = !session;

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    // Check if course exists and is published (for public access)
    const course = await Course.findById(id);
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    if (isPublicAccess && course.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const rating = searchParams.get('rating');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter for reviews
    const filters: any = {
      course: id,
      isPublic: true,
      isApproved: true,
      // Show reviews where isDisplayed is true or undefined (for backward compatibility)
      // But exclude reviews where isDisplayed is explicitly false
      isDisplayed: { $ne: false }
    };

    if (rating) {
      filters.rating = parseInt(rating);
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      CourseReview.find(filters)
        .populate('student', 'firstName lastName avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseReview.countDocuments(filters)
    ]);

    // Get rating statistics
    const stats = await (CourseReview as ICourseReviewModel).getCourseRatingStats(id);

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching course reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course reviews' },
      { status: 500 }
    );
  }
}
