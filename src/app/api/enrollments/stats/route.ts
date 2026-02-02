import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import { EnrollmentStats, CourseEnrollmentStats, StudentEnrollmentStats } from '@/types/enrollment';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'general';
    const courseId = searchParams.get('courseId') || '';
    const studentId = searchParams.get('studentId') || '';

    if (type === 'course' && courseId) {
      // Get course-specific enrollment stats
      const stats = await Enrollment.aggregate([
        { $match: { course: courseId } },
        {
          $group: {
            _id: null,
            totalEnrollments: { $sum: 1 },
            activeEnrollments: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            completedEnrollments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            averageProgress: { $avg: '$progress' },
            revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$paymentAmount', 0] } }
          }
        }
      ]);

      const courseStats = stats[0] || {
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        averageProgress: 0,
        revenue: 0
      };

      // Get course title
      const Course = (await import('@/models/Course')).default;
      const course = await Course.findById(courseId).select('title').lean();

      const completionRate = courseStats.totalEnrollments > 0 
        ? (courseStats.completedEnrollments / courseStats.totalEnrollments) * 100 
        : 0;

      const response: CourseEnrollmentStats = {
        courseId,
        courseTitle: (course as any)?.title || 'Unknown Course',
        totalEnrollments: courseStats.totalEnrollments,
        activeEnrollments: courseStats.activeEnrollments,
        completedEnrollments: courseStats.completedEnrollments,
        completionRate: Math.round(completionRate * 100) / 100,
        averageProgress: Math.round(courseStats.averageProgress * 100) / 100,
        revenue: courseStats.revenue
      };

      return NextResponse.json({
        success: true,
        data: response
      });

    } else if (type === 'student' && studentId) {
      // Get student-specific enrollment stats
      const stats = await Enrollment.aggregate([
        { $match: { student: studentId } },
        {
          $group: {
            _id: null,
            totalEnrollments: { $sum: 1 },
            activeEnrollments: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            completedEnrollments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            averageProgress: { $avg: '$progress' },
            totalSpent: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$paymentAmount', 0] } }
          }
        }
      ]);

      const studentStats = stats[0] || {
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        averageProgress: 0,
        totalSpent: 0
      };

      // Get student name
      const User = (await import('@/models/User')).default;
      const student = await User.findById(studentId).select('firstName lastName').lean();

      const completionRate = studentStats.totalEnrollments > 0 
        ? (studentStats.completedEnrollments / studentStats.totalEnrollments) * 100 
        : 0;

      const response: StudentEnrollmentStats = {
        studentId,
        studentName: student ? `${(student as any).firstName} ${(student as any).lastName}` : 'Unknown Student',
        totalEnrollments: studentStats.totalEnrollments,
        activeEnrollments: studentStats.activeEnrollments,
        completedEnrollments: studentStats.completedEnrollments,
        completionRate: Math.round(completionRate * 100) / 100,
        averageProgress: Math.round(studentStats.averageProgress * 100) / 100,
        totalSpent: studentStats.totalSpent
      };

      return NextResponse.json({
        success: true,
        data: response
      });

    } else {
      // Get general enrollment stats
      const stats = await Enrollment.aggregate([
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
      const completionRate = enrollmentStats.total > 0 
        ? (enrollmentStats.completed / enrollmentStats.total) * 100 
        : 0;
      const dropRate = enrollmentStats.total > 0 
        ? (enrollmentStats.dropped / enrollmentStats.total) * 100 
        : 0;

      const response: EnrollmentStats = {
        ...enrollmentStats,
        completionRate: Math.round(completionRate * 100) / 100,
        dropRate: Math.round(dropRate * 100) / 100
      };

      return NextResponse.json({
        success: true,
        data: response
      });
    }

  } catch (error) {
    console.error('Error fetching enrollment stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enrollment stats' },
      { status: 500 }
    );
  }
}
