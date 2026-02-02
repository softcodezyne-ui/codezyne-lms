import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import CourseProgress from '@/models/CourseProgress';
import Payment from '@/models/Payment';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const instructor = await User.findOne({ email: session.user.email });
    if (!instructor || instructor.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find courses taught by this instructor
    const instructorCourses = await Course.find({ instructor: instructor._id }).select('_id title createdAt');
    const courseIds = instructorCourses.map((c: any) => c._id);

    // Parallel aggregations
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfLastWeek = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalCourses,
      totalEnrollments,
      totalStudents,
      recentEnrollments,
      successfulPayments,
      totalRevenue,
      weeklyCompletions,
      lastWeekCompletions,
      enrollmentTrends
    ] = await Promise.all([
      Course.countDocuments({ instructor: instructor._id }),
      Enrollment.countDocuments({ course: { $in: courseIds } }),
      Enrollment.distinct('student', { course: { $in: courseIds } }).then((arr) => arr.length),
      Enrollment.find({ course: { $in: courseIds } })
        .populate('student', 'firstName lastName email')
        .populate('course', 'title')
        .sort({ enrolledAt: -1 })
        .limit(10),
      Payment.countDocuments({ status: 'success', course: { $in: courseIds } }),
      Payment.aggregate([
        { $match: { status: 'success', course: { $in: courseIds } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).then((r) => (r[0]?.total ?? 0)),
      CourseProgress.countDocuments({
        isCompleted: true,
        course: { $in: courseIds },
        $or: [
          { completedAt: { $gte: startOfWeek } },
          { completedAt: { $exists: false }, updatedAt: { $gte: startOfWeek } }
        ]
      }),
      CourseProgress.countDocuments({
        isCompleted: true,
        course: { $in: courseIds },
        $or: [
          { completedAt: { $gte: startOfLastWeek, $lt: startOfWeek } },
          { completedAt: { $exists: false }, updatedAt: { $gte: startOfLastWeek, $lt: startOfWeek } }
        ]
      }),
      Enrollment.aggregate([
        { $match: { course: { $in: courseIds } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$enrolledAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    const completionChange = lastWeekCompletions > 0
      ? Math.round(((weeklyCompletions - lastWeekCompletions) / lastWeekCompletions) * 100)
      : (weeklyCompletions > 0 ? 100 : 0);

    const data = {
      overview: {
        totalCourses,
        totalStudents,
        totalEnrollments,
        weeklyCompletions,
        completionChange,
        successfulPayments,
        totalRevenue
      },
      recentEnrollments: recentEnrollments.map((e: any) => ({
        id: String(e._id),
        studentName: `${e.student?.firstName ?? ''} ${e.student?.lastName ?? ''}`.trim() || 'Unknown',
        studentEmail: e.student?.email ?? 'Unknown',
        courseTitle: e.course?.title ?? 'Unknown',
        enrolledAt: e.enrolledAt,
        status: e.status
      })),
      trends: {
        enrollments: enrollmentTrends
      }
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Instructor dashboard error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}


