import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LessonReview from '@/models/LessonReview';
import Lesson from '@/models/Lesson';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';

// GET /api/lesson-reviews - Get all lesson reviews with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow public access for approved reviews only
    const isPublicAccess = !session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const lesson = searchParams.get('lesson') || '';
    const course = searchParams.get('course') || '';
    const student = searchParams.get('student') || '';
    const rating = searchParams.get('rating');
    const reviewType = searchParams.get('reviewType'); // 'text' or 'video'
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filters: any = {};

    // For public access, only show approved and public reviews
    if (isPublicAccess) {
      filters.isPublic = true;
      filters.isApproved = true;
    } else {
      // For authenticated users, show their own reviews or all reviews if admin
      if (session.user.role !== 'admin' && !student) {
        filters.student = session.user.id;
      }
    }

    if (lesson) {
      // Validate that lesson is a valid MongoDB ObjectId
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(lesson)) {
        filters.lesson = lesson;
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid lesson ID format' },
          { status: 400 }
        );
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

    if (reviewType && (reviewType === 'text' || reviewType === 'video')) {
      filters.reviewType = reviewType;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Get reviews with pagination
    const [reviews, total] = await Promise.all([
      LessonReview.find(filters)
        .populate('student', 'firstName lastName avatar')
        .populate('lesson', 'title order')
        .populate('course', 'title thumbnailUrl')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      LessonReview.countDocuments(filters)
    ]);

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviews.map((review: any) => ({
          _id: review._id.toString(),
          lesson: typeof review.lesson === 'object' ? review.lesson._id.toString() : review.lesson,
          course: typeof review.course === 'object' ? review.course._id.toString() : review.course,
          student: typeof review.student === 'object' ? {
            _id: review.student._id.toString(),
            firstName: review.student.firstName,
            lastName: review.student.lastName,
            avatar: review.student.avatar
          } : review.student,
          rating: review.rating,
          reviewType: review.reviewType,
          title: review.title,
          comment: review.comment,
          videoUrl: review.videoUrl,
          videoThumbnail: review.videoThumbnail,
          isVerified: review.isVerified,
          isPublic: review.isPublic,
          helpfulVotes: review.helpfulVotes,
          reportedCount: review.reportedCount,
          isApproved: review.isApproved,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching lesson reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/lesson-reviews - Create a new lesson review
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
    const { lesson, course, rating, reviewType, title, comment, videoUrl, videoThumbnail } = body;

    // Validation
    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { success: false, error: 'Video URL is required for video reviews' },
        { status: 400 }
      );
    }

    // Check if lesson exists
    const lessonExists = await Lesson.findById(lesson);
    if (!lessonExists) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
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

    // Check if student has already reviewed this lesson
    const existingReview = await LessonReview.findOne({
      lesson: lesson,
      student: session.user.id
    });

    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this lesson' },
        { status: 400 }
      );
    }

    // Create review
    const review = new LessonReview({
      lesson,
      course,
      student: session.user.id,
      rating,
      reviewType,
      title: title?.trim(),
      comment: comment?.trim(),
      videoUrl: videoUrl?.trim(),
      videoThumbnail: videoThumbnail?.trim(),
      isVerified: true
    });

    await review.save();

    // Populate the review with student, lesson, and course info
    const populatedReview = await LessonReview.findById(review._id)
      .populate('student', 'firstName lastName avatar')
      .populate('lesson', 'title order')
      .populate('course', 'title thumbnailUrl')
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...populatedReview,
        _id: (populatedReview as any)._id.toString(),
        createdAt: (populatedReview as any).createdAt.toISOString(),
        updatedAt: (populatedReview as any).updatedAt.toISOString(),
      },
      message: 'Review created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating lesson review:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this lesson' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

