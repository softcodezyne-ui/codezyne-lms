import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import Course from '@/models/Course';
import CourseCategory from '@/models/CourseCategory';
import { CreateEnrollmentRequest, EnrollmentFilters, EnrollmentListResponse } from '@/types/enrollment';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const student = searchParams.get('student') || '';
    const course = searchParams.get('course') || '';
    const status = searchParams.get('status') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const enrolledAfter = searchParams.get('enrolledAfter') || '';
    const enrolledBefore = searchParams.get('enrolledBefore') || '';
    const progressMin = searchParams.get('progressMin') || '';
    const progressMax = searchParams.get('progressMax') || '';
    const sortBy = searchParams.get('sortBy') || 'enrolledAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
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

    if (enrolledAfter) {
      filters.enrolledAt = { ...filters.enrolledAt, $gte: new Date(enrolledAfter) };
    }

    if (enrolledBefore) {
      filters.enrolledAt = { ...filters.enrolledAt, $lte: new Date(enrolledBefore) };
    }

    if (progressMin) {
      filters.progress = { ...filters.progress, $gte: parseInt(progressMin) };
    }

    if (progressMax) {
      filters.progress = { ...filters.progress, $lte: parseInt(progressMax) };
    }

    // Text search across student and course names
    if (search) {
      const studentIds = await User.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      const courseIds = await Course.find({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      filters.$or = [
        { student: { $in: studentIds.map(s => s._id) } },
        { course: { $in: courseIds.map(c => c._id) } }
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get enrollments with populated data
    const enrollments = await Enrollment.find(filters)
      .populate('studentInfo', 'firstName lastName email avatar')
      .populate({
        path: 'courseInfo',
        select: 'title description thumbnailUrl price category isPaid duration rating instructor',
        populate: {
          path: 'instructor',
          select: 'firstName lastName'
        }
      })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await Enrollment.countDocuments(filters);

    // Calculate pagination info
    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    // Get statistics
    const stats = await Enrollment.aggregate([
      { $match: filters },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          dropped: { $sum: { $cond: [{ $eq: ['$status', 'dropped'] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
          paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'refunded'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'failed'] }, 1, 0] } },
          totalRevenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$paymentAmount', 0] } },
          averageProgress: { $avg: '$progress' }
        }
      }
    ]);

    const enrollmentStats = stats[0] || {
      total: 0,
      active: 0,
      completed: 0,
      dropped: 0,
      suspended: 0,
      paid: 0,
      pending: 0,
      refunded: 0,
      failed: 0,
      totalRevenue: 0,
      averageProgress: 0
    };

    // Calculate additional stats
    const completionRate = enrollmentStats.total > 0 ? (enrollmentStats.completed / enrollmentStats.total) * 100 : 0;
    const dropRate = enrollmentStats.total > 0 ? (enrollmentStats.dropped / enrollmentStats.total) * 100 : 0;

    const response: EnrollmentListResponse = {
      enrollments: enrollments.map((enrollment: any) => ({
        ...enrollment.toObject(),
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
        courseLuInfo: enrollment.courseInfo,
        studentInfo: enrollment.studentInfo
      })),
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext,
        hasPrev
      },
      stats: {
        ...enrollmentStats,
        completionRate: Math.round(completionRate * 100) / 100,
        dropRate: Math.round(dropRate * 100) / 100
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching enrollments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body: CreateEnrollmentRequest = await request.json();
    const { student, course, paymentStatus = 'pending', paymentAmount, paymentMethod, paymentId, notes } = body;

    // Validate required fields
    if (!student || !course) {
      return NextResponse.json(
        { success: false, error: 'Student and course are required' },
        { status: 400 }
      );
    }

    // Check if student exists
    const studentExists = await User.findById(student);
    if (!studentExists) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
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

    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({ student, course });
    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Student is already enrolled in this course' },
        { status: 409 }
      );
    }

    // Create enrollment
    const enrollment = new Enrollment({
      student,
      course,
      paymentStatus,
      paymentAmount: courseExists.isPaid ? (paymentAmount || courseExists.price) : undefined,
      paymentMethod,
      paymentId,
      notes
    });

    await enrollment.save();

    // Populate the enrollment data
    await enrollment.populate([
      { path: 'studentInfo', select: 'firstName lastName email avatar' },
      { 
        path: 'courseInfo', 
        select: 'title description thumbnailUrl price category isPaid instructor',
        populate: {
          path: 'instructor',
          select: 'firstName lastName'
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...enrollment.toObject(),
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
        courseLuInfo: enrollment.courseInfo,
        studentInfo: enrollment.studentInfo
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating enrollment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create enrollment' },
      { status: 500 }
    );
  }
}
