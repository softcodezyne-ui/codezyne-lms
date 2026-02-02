import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const instructor = searchParams.get('instructor') || session.user.id;

    // Build query
    const query: any = {};

    // Only show enrollments for courses created by this instructor
    const instructorCourses = await Course.find({ createdBy: instructor }).select('_id');
    const courseIds = instructorCourses.map(course => course._id);
    
    if (courseIds.length === 0) {
      return NextResponse.json({
        data: {
          enrollments: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false
          },
          stats: {
            totalEnrollments: 0,
            activeEnrollments: 0,
            completedEnrollments: 0,
            totalRevenue: 0,
            averageProgress: 0
          }
        }
      });
    }

    query.course = { $in: courseIds };

    // Add search filter
    if (search) {
      query.$or = [
        { 'studentInfo.firstName': { $regex: search, $options: 'i' } },
        { 'studentInfo.lastName': { $regex: search, $options: 'i' } },
        { 'studentInfo.email': { $regex: search, $options: 'i' } },
        { 'courseInfo.title': { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await Enrollment.countDocuments(query);

    // Calculate pagination
    const pages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Fetch enrollments with populated data
    const enrollments = await Enrollment.find(query)
      .populate('student', 'firstName lastName email avatar')
      .populate('course', 'title category')
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Transform the data to match expected format
    const transformedEnrollments = enrollments.map(enrollment => ({
      ...enrollment,
      studentInfo: enrollment.student,
      courseInfo: enrollment.course,
      student: enrollment.student?._id,
      course: enrollment.course?._id
    }));

    // Calculate stats
    const statsQuery = { course: { $in: courseIds } };
    const allEnrollments = await Enrollment.find(statsQuery).lean();
    
    const stats = {
      totalEnrollments: allEnrollments.length,
      activeEnrollments: allEnrollments.filter(e => e.status === 'active').length,
      completedEnrollments: allEnrollments.filter(e => e.status === 'completed').length,
      totalRevenue: allEnrollments.reduce((sum, e) => sum + (e.paymentAmount || 0), 0),
      averageProgress: allEnrollments.length > 0 
        ? Math.round(allEnrollments.reduce((sum, e) => sum + e.progress, 0) / allEnrollments.length)
        : 0
    };

    return NextResponse.json({
      data: {
        enrollments: transformedEnrollments,
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        },
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching instructor enrollments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const body = await request.json();
    const { student, course, status = 'active', progress = 0, paymentStatus = 'pending', paymentAmount, paymentMethod, paymentId, notes } = body;

    // Verify the course belongs to this instructor
    const courseDoc = await Course.findById(course);
    if (!courseDoc) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (courseDoc.createdBy.toString() !== session.user.id) {
      return NextResponse.json({ error: 'You can only enroll students in your own courses' }, { status: 403 });
    }

    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({ student, course });
    if (existingEnrollment) {
      return NextResponse.json({ error: 'Student is already enrolled in this course' }, { status: 400 });
    }

    // Create enrollment
    const enrollment = new Enrollment({
      student,
      course,
      status,
      progress,
      paymentStatus,
      paymentAmount,
      paymentMethod,
      paymentId,
      notes,
      enrolledAt: new Date()
    });

    await enrollment.save();

    // Populate the enrollment data
    await enrollment.populate('student', 'firstName lastName email avatar');
    await enrollment.populate('course', 'title category');

    return NextResponse.json({
      data: {
        ...enrollment.toObject(),
        studentInfo: enrollment.student,
        courseInfo: enrollment.course,
        student: enrollment.student?._id,
        course: enrollment.course?._id
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating instructor enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
      { status: 500 }
    );
  }
}
