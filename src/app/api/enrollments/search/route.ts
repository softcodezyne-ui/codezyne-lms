import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import Course from '@/models/Course';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const student = searchParams.get('student') || '';
    const course = searchParams.get('course') || '';
    const status = searchParams.get('status') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';

    // Build search filters
    const filters: any = {};

    if (student) {
      filters.student = student;
    }

    if (course) {
      filters.course = course;
    }

    if (status) {
      filters.status = status;
    }

    if (paymentStatus) {
      filters.paymentStatus = paymentStatus;
    }

    // Text search across student and course names
    if (query) {
      const studentIds = await User.find({
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      }).select('_id');

      const courseIds = await Course.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      }).select('_id');

      filters.$or = [
        { student: { $in: studentIds.map(s => s._id) } },
        { course: { $in: courseIds.map(c => c._id) } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get enrollments with populated data
    const enrollments = await Enrollment.find(filters)
      .populate('student', 'firstName lastName email avatar')
      .populate({
        path: 'course',
        populate: {
          path: 'instructor',
          select: 'firstName lastName email'
        }
      })
      .populate('course.category', 'name')
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Enrollment.countDocuments(filters);

    // Calculate pagination info
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        enrollments: enrollments.map((enrollment: any) => ({
          ...enrollment,
          _id: enrollment._id.toString(),
          student: enrollment.student.toString(),
          course: enrollment.course.toString(),
          enrolledAt: enrollment.enrolledAt.toISOString(),
          lastAccessedAt: enrollment.lastAccessedAt?.toISOString(),
          completedAt: enrollment.completedAt?.toISOString(),
          droppedAt: enrollment.droppedAt?.toISOString(),
          suspendedAt: enrollment.suspendedAt?.toISOString(),
          createdAt: enrollment.createdAt.toISOString(),
          updatedAt: enrollment.updatedAt.toISOString(),
          // Map populated data to expected field names
          courseLuInfo: enrollment.course,
          studentInfo: enrollment.student
        })),
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext,
          hasPrev
        }
      }
    });

  } catch (error) {
    console.error('Error searching enrollments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search enrollments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { studentId, courseId, status, paymentStatus, page = 1, limit = 10 } = body;

    // Build search filters
    const filters: any = {};

    if (studentId) {
      filters.student = studentId;
    }

    if (courseId) {
      filters.course = courseId;
    }

    if (status) {
      filters.status = status;
    }

    if (paymentStatus) {
      filters.paymentStatus = paymentStatus;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get enrollments with populated data
    const enrollments = await Enrollment.find(filters)
      .populate('student', 'firstName lastName email avatar')
      .populate({
        path: 'course',
        populate: {
          path: 'instructor',
          select: 'firstName lastName email'
        }
      })
      .populate('course.category', 'name')
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Enrollment.countDocuments(filters);

    // Calculate pagination info
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return NextResponse.json({
      success: true,
      enrollments: enrollments.map((enrollment: any) => ({
        ...enrollment,
        _id: enrollment._id.toString(),
        student: enrollment.student.toString(),
        course: enrollment.course.toString(),
        enrolledAt: enrollment.enrolledAt.toISOString(),
        lastAccessedAt: enrollment.lastAccessedAt?.toISOString(),
        completedAt: enrollment.completedAt?.toISOString(),
        droppedAt: enrollment.droppedAt?.toISOString(),
        suspendedAt: enrollment.suspendedAt?.toISOString(),
        createdAt: enrollment.createdAt.toISOString(),
        updatedAt: enrollment.updatedAt.toISOString(),
        // Map populated data to expected field names
        courseLuInfo: enrollment.course,
        studentInfo: enrollment.student
      })),
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext,
        hasPrev
      }
    });

  } catch (error) {
    console.error('Error searching enrollments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search enrollments' },
      { status: 500 }
    );
  }
}
