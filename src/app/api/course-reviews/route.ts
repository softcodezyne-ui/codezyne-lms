import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseReview from '@/models/CourseReview';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import { ReviewSearchParams, ReviewFilters } from '@/types/course-review';

// GET /api/course-reviews - Get all reviews with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow public access for approved reviews only
    const isPublicAccess = !session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const course = searchParams.get('course') || '';
    const student = searchParams.get('student') || '';
    const rating = searchParams.get('rating');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filters: any = {};

    // For public access, only show displayed, approved and public reviews
    if (isPublicAccess) {
      filters.isPublic = true;
      filters.isApproved = true;
      // Show reviews where isDisplayed is true or undefined (for backward compatibility)
      // But exclude reviews where isDisplayed is explicitly false
      filters.isDisplayed = { $ne: false };
    } else {
      // For authenticated users, show their own reviews or all reviews if admin
      if (session.user.role !== 'admin' && !student) {
        filters.student = session.user.id;
      }
    }

    if (course) {
      filters.course = course;
    }

    if (student) {
      filters.student = student;
    }

    if (rating) {
      filters.rating = parseInt(rating);
    }

    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } }
      ];
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
        reviews: reviews.map((review: any) => {
          const mappedReview = {
            _id: review._id.toString(),
            course: typeof review.course === 'object' ? review.course._id.toString() : review.course,
            student: typeof review.student === 'object' ? {
              _id: review.student._id.toString(),
              firstName: review.student.firstName,
              lastName: review.student.lastName,
              avatar: review.student.avatar
            } : review.student,
            rating: review.rating,
            reviewType: review.reviewType || 'text',
            title: review.title,
            comment: review.comment,
            videoUrl: review.videoUrl || null,
            videoThumbnail: review.videoThumbnail || null,
            isVerified: review.isVerified,
            isPublic: review.isPublic,
            helpfulVotes: review.helpfulVotes,
            reportedCount: review.reportedCount,
            isApproved: review.isApproved,
            isDisplayed: review.isDisplayed || false,
            createdAt: review.createdAt.toISOString(),
            updatedAt: review.updatedAt.toISOString(),
          };
          
          // Log video reviews for debugging
          if (mappedReview.reviewType === 'video') {
            console.log('Video review in GET response:', {
              reviewId: mappedReview._id,
              reviewType: mappedReview.reviewType,
              videoUrl: mappedReview.videoUrl,
              hasVideoUrl: !!mappedReview.videoUrl,
              rawVideoUrl: review.videoUrl
            });
          }
          
          return mappedReview;
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/course-reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only students can create reviews
    if (session.user.role !== 'student') {
      return NextResponse.json(
        { success: false, error: 'Only students can create reviews' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { course, rating, reviewType, title, comment, videoUrl, videoThumbnail } = body;

    console.log('Received review submission:', {
      course,
      rating,
      reviewType,
      hasTitle: !!title,
      hasComment: !!comment,
      hasVideoUrl: !!videoUrl,
      videoUrl: videoUrl,
      videoThumbnail: videoThumbnail
    });

    // Validation
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (!reviewType || !['text', 'video'].includes(reviewType)) {
      return NextResponse.json(
        { success: false, error: 'Review type must be either "text" or "video"' },
        { status: 400 }
      );
    }

    // Validate review content based on type
    if (reviewType === 'text' && !comment?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Comment is required for text reviews' },
        { status: 400 }
      );
    }

    if (reviewType === 'video' && !videoUrl?.trim()) {
      console.error('Video review submitted without videoUrl:', {
        reviewType,
        videoUrl,
        hasVideoUrl: !!videoUrl
      });
      return NextResponse.json(
        { success: false, error: 'Video URL is required for video reviews' },
        { status: 400 }
      );
    }

    // Check if course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if student is blocked from creating reviews
    const User = (await import('@/models/User')).default;
    const student = await User.findById(session.user.id);
    
    if (student?.isBlockedFromReviews) {
      return NextResponse.json(
        { success: false, error: 'You are blocked from creating reviews. Please contact support if you believe this is an error.' },
        { status: 403 }
      );
    }

    // Check if student is enrolled in the course
    const enrollment = await Enrollment.findOne({
      student: session.user.id,
      course: course,
      status: { $in: ['active', 'completed'] }
    });

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'You must be enrolled in the course to write a review' },
        { status: 403 }
      );
    }

    // Check if student has already reviewed this course
    const existingReview = await CourseReview.findOne({
      course: course,
      student: session.user.id
    });

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this course' },
        { status: 400 }
      );
    }

    // Log video URL for debugging
    console.log('Creating review:', {
      course,
      student: session.user.id,
      reviewType: reviewType,
      videoUrl: videoUrl,
      hasVideoUrl: !!videoUrl,
      videoUrlLength: videoUrl?.length || 0
    });

    // Create review (not approved by default - requires admin approval)
    const reviewData: any = {
      course,
      student: session.user.id,
      rating,
      reviewType,
      title: title?.trim(),
      comment: comment?.trim(),
      isVerified: true,
      isApproved: false, // Require admin approval
      isDisplayed: false // Require admin approval
    };

    // Only add videoUrl if it exists and is not empty
    if (videoUrl && videoUrl.trim()) {
      reviewData.videoUrl = videoUrl.trim();
    }

    // Only add videoThumbnail if it exists and is not empty
    if (videoThumbnail && videoThumbnail.trim()) {
      reviewData.videoThumbnail = videoThumbnail.trim();
    }

    console.log('Review data to save:', {
      reviewType: reviewData.reviewType,
      videoUrl: reviewData.videoUrl,
      hasVideoUrl: !!reviewData.videoUrl,
      comment: reviewData.comment ? 'present' : 'missing',
      isDisplayed: reviewData.isDisplayed ? 'true' : 'false'
    });

    const review = new CourseReview(reviewData);
    await review.save();

    console.log('Review saved to database:', review);

    // Populate the review with student and course info
    const populatedReview = await CourseReview.findById(review._id)
      .populate('student', 'firstName lastName avatar')
      .populate('course', 'title thumbnailUrl')
      .lean();

    // Ensure videoUrl is included in response
    const responseData: any = {
      ...populatedReview,
      _id: (populatedReview as any)?._id?.toString() || review._id.toString(),
      reviewType: (populatedReview as any)?.reviewType || reviewType,
      videoUrl: (populatedReview as any)?.videoUrl || videoUrl || null,
      videoThumbnail: (populatedReview as any)?.videoThumbnail || null,
    };

    console.log('Review response data:', {
      reviewId: responseData._id,
      reviewType: responseData.reviewType,
      videoUrl: responseData.videoUrl,
      hasVideoUrl: !!responseData.videoUrl
    });

    return NextResponse.json({
      success: true,
      data: responseData,
      message: 'Review created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
