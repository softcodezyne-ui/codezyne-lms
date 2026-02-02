import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/public/courses/[id] - Get a specific course (public access)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    // Only allow access to published courses for public API
    const course = await Course.findOne({ 
      _id: id, 
      status: 'published' 
    })
      .populate('createdBy', 'name email role')
      .populate('instructor', 'name email role')
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found or not published' },
        { status: 404 }
      );
    }

    // Type assertion to fix TypeScript inference issue
    const courseData = course as any;

    // Calculate virtual fields manually since .lean() doesn't include virtuals
    const finalPrice = courseData.isPaid ? (courseData.salePrice || courseData.price || 0) : 0;
    const discountPercentage = courseData.isPaid && courseData.salePrice && courseData.price && courseData.salePrice < courseData.price 
      ? Math.round(((courseData.price - courseData.salePrice) / courseData.price) * 100) 
      : 0;

    // Fetch enrollment count (active or completed enrollments)
    const enrollmentCount = await Enrollment.countDocuments({
      course: id,
      status: { $in: ['active', 'completed'] }
    });

    // Ensure status field is always present and add calculated fields
    const responseData = {
      ...courseData,
      status: 'published', // Always published for public API
      finalPrice,
      discountPercentage,
      enrollmentCount,
      // Remove sensitive fields that shouldn't be public
      createdBy: {
        name: courseData.createdBy?.name || 'Unknown',
        role: courseData.createdBy?.role || 'instructor'
      },
      instructor: courseData.instructor ? {
        name: courseData.instructor?.name || 'Unknown',
        role: courseData.instructor?.role || 'instructor',
        email: courseData.instructor?.email || undefined
      } : undefined
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching public course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}
