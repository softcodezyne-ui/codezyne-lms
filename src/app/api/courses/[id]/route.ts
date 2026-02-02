import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import mongoose from 'mongoose';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/courses/[id] - Get a specific course
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow public access for published courses only
    const isPublicAccess = !session;

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    // Build filter for course access
    const filter: any = { _id: id };
    
    // For public access, only allow published courses
    if (isPublicAccess) {
      filter.status = 'published';
    } else {
      // For authenticated users
      if (session.user.role === 'admin') {
        // Admins can access all courses
        // No additional filter needed
      } else if (session.user.role === 'student') {
        // Students can access courses they're enrolled in
        // Check enrollment status
        const Enrollment = (await import('@/models/Enrollment')).default;
        const enrollment = await Enrollment.findOne({
          student: session.user.id,
          course: id,
          status: { $in: ['active', 'completed'] }
        });
        
        if (!enrollment) {
          // If not enrolled, only allow access to published courses
          filter.status = 'published';
        }
        // If enrolled, allow access regardless of status
      } else {
        // For instructors, allow access to their own courses
        filter.createdBy = session.user.id;
      }
    }

    const course = await Course.findOne(filter)
      .populate('createdBy', 'firstName lastName email role')
      .populate({
        path: 'instructor',
        select: 'firstName lastName email role',
        options: { strictPopulate: false }
      })
      .lean();

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found or access denied' },
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

    // Ensure status field is always present
    const responseData = {
      ...courseData,
      status: courseData.status ?? 'draft', // Default to draft if undefined
      finalPrice,
      discountPercentage
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course' },
      { status: 500 }
    );
  }
}

// PUT /api/courses/[id] - Update a specific course
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin, instructor, or teacher role
    if (!['admin', 'instructor', 'teacher'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      shortDescription,
      description,
      category,
      thumbnailUrl,
      isPaid,
      price,
      salePrice,
      status,
      instructor
    } = body;
console.log('API: Instructor:', instructor);
    // Find the course
    const course = await Course.findById(id);

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if user can modify this course (admin or course creator)
    if (session.user.role !== 'admin' && course.createdBy !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only modify courses you created' },
        { status: 403 }
      );
    }

    // Validation
    if (title !== undefined && (!title || title.trim() === '')) {
      return NextResponse.json(
        { success: false, error: 'Course title is required' },
        { status: 400 }
      );
    }

    if (isPaid && (!price || price <= 0)) {
      return NextResponse.json(
        { success: false, error: 'Paid courses must have a valid price' },
        { status: 400 }
      );
    }

    if (salePrice && price && salePrice >= price) {
      return NextResponse.json(
        { success: false, error: 'Sale price must be less than regular price' },
        { status: 400 }
      );
    }

    // Update course - use $set so all fields are persisted
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title.trim();
    if (shortDescription !== undefined) updateData.shortDescription = (shortDescription ?? '').toString().trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (category !== undefined) updateData.category = category?.trim();
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (isPaid !== undefined) updateData.isPaid = isPaid;
    if (price !== undefined) updateData.price = isPaid ? price : undefined;
    if (salePrice !== undefined) updateData.salePrice = isPaid && salePrice ? salePrice : undefined;
    if (status !== undefined) updateData.status = status;
    if (instructor !== undefined) updateData.instructor = instructor;

    console.log('API: Request body status:', status);
    console.log('API: Update data:', updateData);

    const updatedCourse = await Course.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    console.log('API: Course after update (raw):', updatedCourse);
    console.log('API: Course status after update:', updatedCourse?.status);

    console.log('API: Updated course data:', {
      _id: updatedCourse?._id,
      title: updatedCourse?.title,
      status: updatedCourse?.status,
      isPaid: updatedCourse?.isPaid,
      instructor: updatedCourse?.instructor
    });
    
    // Check all properties of the course object
    console.log('API: All course properties:', Object.keys(updatedCourse?.toObject() || {}));
    console.log('API: Course object:', updatedCourse?.toObject());

    // Ensure status field is always present
    const courseData = {
      ...updatedCourse?.toObject(),
      status: updatedCourse?.status ?? 'draft' // Default to draft if undefined
    };

    // Revalidate courses cache
    revalidateTag('courses');

    return NextResponse.json({
      success: true,
      data: courseData,
      message: 'Course updated successfully'
    });

  } catch (error) {
    console.error('Error updating course:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update course' },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id] - Delete a specific course
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin, instructor, or teacher role
    if (!['admin', 'instructor', 'teacher'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Only admins, instructors, and teachers can delete courses.' },
        { status: 403 }
      );
    }

    await connectDB();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid course ID' },
        { status: 400 }
      );
    }

    const course = await Course.findById(id);

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if user can delete this course (admin or course creator)
    if (session.user.role !== 'admin' && course.createdBy !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only delete courses you created' },
        { status: 403 }
      );
    }

    await Course.findByIdAndDelete(id);

    // Revalidate courses cache
    revalidateTag('courses');

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting course:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete course' },
      { status: 500 }
    );
  }
}
