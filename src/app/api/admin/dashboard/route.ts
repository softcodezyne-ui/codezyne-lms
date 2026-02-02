import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import CourseProgress from '@/models/CourseProgress';
import Payment from '@/models/Payment';
import Exam from '@/models/Exam';
import ExamAttempt from '@/models/ExamAttempt';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await User.findOne({ email: session.user.email });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    // Get current date ranges
    const now = new Date();
    const _now = new Date(now.getTime());
    const startOfWeek = new Date(_now.getFullYear(), _now.getMonth(), _now.getDate() - _now.getDay());
    const startOfMonth = new Date(_now.getFullYear(), _now.getMonth(), 1);
    const startOfLastWeek = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfLastMonth = new Date(_now.getFullYear(), _now.getMonth() - 1, 1);

    // Parallel data fetching
    const [
      totalStudents,
      totalCourses,
      totalEnrollments,
      totalTeachers,
      activeStudents,
      completedCourses,
      newEnrollmentsThisWeek,
      newEnrollmentsLastWeek,
      courseCompletionsThisWeek,
      courseCompletionsLastWeek,
      recentEnrollments,
      topPerformingStudents,
      courseStats,
      paymentStats,
      examStats
    ] = await Promise.all([
      // Basic counts
      User.countDocuments({ role: 'student' }),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      // Active instructors (teachers)
      User.countDocuments({ role: 'instructor', isActive: true }),
      
      // Active students (enrolled in at least one course)
      User.countDocuments({ 
        role: 'student',
        _id: { $in: await Enrollment.distinct('student') }
      }),
      
      // Completed courses
      CourseProgress.countDocuments({ isCompleted: true }),
      
      // Weekly enrollments
      Enrollment.countDocuments({ 
        enrolledAt: { $gte: startOfWeek } 
      }),
      Enrollment.countDocuments({ 
        enrolledAt: { $gte: startOfLastWeek, $lt: startOfWeek } 
      }),
      
      // Weekly course completions
      // Weekly course completions (fallback to updatedAt if completedAt missing)
      CourseProgress.countDocuments({ 
        isCompleted: true,
        $or: [
          { completedAt: { $gte: startOfWeek } },
          { completedAt: { $exists: false }, updatedAt: { $gte: startOfWeek } }
        ]
      }),
      CourseProgress.countDocuments({ 
        isCompleted: true,
        $or: [
          { completedAt: { $gte: startOfLastWeek, $lt: startOfWeek } },
          { completedAt: { $exists: false }, updatedAt: { $gte: startOfLastWeek, $lt: startOfWeek } }
        ]
      }),
      
      // Recent enrollments
      Enrollment.find({})
        .populate('student', 'name email')
        .populate('course', 'title')
        .sort({ enrolledAt: -1 })
        .limit(10),
      
      // Top performing students (by course completions and average progress)
      CourseProgress.aggregate([
        {
          $group: {
            _id: '$user',
            completedCourses: { $sum: { $cond: ['$isCompleted', 1, 0] } },
            averageProgress: { $avg: '$progressPercentage' },
            totalTimeSpent: { $sum: '$totalTimeSpent' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $match: {
            'user.role': 'student'
          }
        },
        {
          $sort: { 
            completedCourses: -1, 
            averageProgress: -1 
          }
        },
        {
          $limit: 10
        },
        {
          $project: {
            _id: 1,
            name: '$user.name',
            email: '$user.email',
            completedCourses: 1,
            averageProgress: { $round: ['$averageProgress', 2] },
            totalTimeSpent: 1
          }
        }
      ]),
      
      // Course statistics
      Course.aggregate([
        {
          $lookup: {
            from: 'enrollments',
            localField: '_id',
            foreignField: 'course',
            as: 'enrollments'
          }
        },
        {
          $lookup: {
            from: 'courseprogresses',
            localField: '_id',
            foreignField: 'course',
            as: 'progresses'
          }
        },
        {
          $project: {
            title: 1,
            price: 1,
            status: 1,
            enrollmentCount: { $size: '$enrollments' },
            completionRate: {
              $cond: {
                if: { $gt: [{ $size: '$enrollments' }, 0] },
                then: {
                  $multiply: [
                    {
                      $divide: [
                        { $size: { $filter: { input: '$progresses', cond: { $eq: ['$$this.isCompleted', true] } } } },
                        { $size: '$enrollments' }
                      ]
                    },
                    100
                  ]
                },
                else: 0
              }
            },
            createdAt: 1
          }
        },
        {
          $sort: { enrollmentCount: -1 }
        },
        {
          $limit: 10
        }
      ]),
      
      // Payment statistics
      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] } },
            totalTransactions: { $count: {} },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
            },
            pendingPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            }
          }
        }
      ]),
      
      // Exam statistics
      Exam.aggregate([
        {
          $lookup: {
            from: 'examattempts',
            localField: '_id',
            foreignField: 'exam',
            as: 'attempts'
          }
        },
        {
          $project: {
            title: 1,
            totalAttempts: { $size: '$attempts' },
            averageScore: {
              $cond: {
                if: { $gt: [{ $size: '$attempts' }, 0] },
                then: { $avg: '$attempts.score' },
                else: 0
              }
            },
            createdAt: 1
          }
        },
        {
          $sort: { totalAttempts: -1 }
        },
        {
          $limit: 5
        }
      ])
    ]);

    // Calculate percentage changes
    const enrollmentChange = newEnrollmentsLastWeek > 0 
      ? ((newEnrollmentsThisWeek - newEnrollmentsLastWeek) / newEnrollmentsLastWeek * 100).toFixed(1)
      : newEnrollmentsThisWeek > 0 ? '100' : '0';
    
    const completionChange = courseCompletionsLastWeek > 0 
      ? ((courseCompletionsThisWeek - courseCompletionsLastWeek) / courseCompletionsLastWeek * 100).toFixed(1)
      : courseCompletionsThisWeek > 0 ? '100' : '0';

    // Format payment stats
    const paymentData = paymentStats[0] || {
      totalRevenue: 0,
      totalTransactions: 0,
      successfulPayments: 0,
      pendingPayments: 0,
      failedPayments: 0
    };


    // Get enrollment trends for all time (grouped by day)
    const rawEnrollmentTrends = await Enrollment.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$enrolledAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get course completion trends for all time (grouped by day)
    const rawCompletionTrends = await CourseProgress.aggregate([
      { $match: { isCompleted: true } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    // Use aggregated daily series across entire history
    const enrollmentTrends = rawEnrollmentTrends;
    const completionTrends = rawCompletionTrends;

    // Build revenue trends for the last 6 months
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(startOfCurrentMonth.getFullYear(), startOfCurrentMonth.getMonth() - 5, 1);

    const rawRevenueTrends = await Payment.aggregate([
      { $match: { status: 'success', completedAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Ensure 6 months present
    const monthKeys: string[] = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    });
    const revenueMap = new Map<string, number>(rawRevenueTrends.map((r: any) => [r._id, r.total]));
    const revenueTrends = monthKeys.map(k => ({ _id: k, total: revenueMap.get(k) || 0 }));

    const dashboardData = {
      overview: {
        totalStudents,
        totalCourses,
        totalEnrollments,
        totalTeachers,
        activeStudents,
        completedCourses,
        newEnrollmentsThisWeek,
        enrollmentChange: parseFloat(enrollmentChange),
        courseCompletionsThisWeek,
        completionChange: parseFloat(completionChange)
      },
      leaderboard: topPerformingStudents,
      recentEnrollments: recentEnrollments.map(enrollment => ({
        id: enrollment._id,
        studentName: enrollment.student?.name || 'Unknown',
        studentEmail: enrollment.student?.email || 'Unknown',
        courseTitle: enrollment.course?.title || 'Unknown',
        enrolledAt: enrollment.enrolledAt,
        status: enrollment.status
      })),
      courseStats: courseStats.map(course => ({
        id: course._id,
        title: course.title,
        price: course.price,
        status: course.status,
        enrollmentCount: course.enrollmentCount,
        completionRate: Math.round(course.completionRate),
        createdAt: course.createdAt
      })),
      paymentStats: {
        totalRevenue: paymentData.totalRevenue,
        totalTransactions: paymentData.totalTransactions,
        successfulPayments: paymentData.successfulPayments,
        pendingPayments: paymentData.pendingPayments,
        failedPayments: paymentData.failedPayments,
        successRate: paymentData.totalTransactions > 0 
          ? Math.round((paymentData.successfulPayments / paymentData.totalTransactions) * 100)
          : 0
      },
      examStats: examStats.map(exam => ({
        id: exam._id,
        title: exam.title,
        totalAttempts: exam.totalAttempts,
        averageScore: Math.round(exam.averageScore || 0),
        createdAt: exam.createdAt
      })),
      trends: {
        enrollments: enrollmentTrends,
        completions: completionTrends,
        revenue: revenueTrends
      }
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
