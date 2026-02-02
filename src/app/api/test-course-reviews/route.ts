import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CourseReview, { ICourseReviewModel } from '@/models/CourseReview';
import Course from '@/models/Course';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';

// GET /api/test-course-reviews - Test endpoint to verify course review implementation
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get some test data
    const courses = await Course.find({ status: 'published' }).limit(3).lean();
    const students = await User.find({ role: 'student' }).limit(3).lean();
    
    if (courses.length === 0 || students.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No test data available. Please create courses and students first.',
        data: {
          coursesCount: courses.length,
          studentsCount: students.length
        }
      });
    }

    // Get existing reviews count
    const reviewsCount = await CourseReview.countDocuments();
    
    // Get some sample reviews
    const sampleReviews = await CourseReview.find()
      .populate('student', 'firstName lastName')
      .populate('course', 'title')
      .limit(5)
      .lean();

    // Test rating stats for first course
    let courseStats = null;
    if (courses.length > 0) {
      courseStats = await (CourseReview as ICourseReviewModel).getCourseRatingStats(courses[0]._id as string);
    }

    return NextResponse.json({
      success: true,
      message: 'Course review system is working!',
      data: {
        reviewsCount,
        sampleReviews,
        courseStats,
        availableCourses: courses.length,
        availableStudents: students.length
      }
    });

  } catch (error) {
    console.error('Error testing course reviews:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test course reviews',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
