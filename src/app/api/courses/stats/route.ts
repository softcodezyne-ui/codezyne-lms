import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';

// GET /api/courses/stats - Get course statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Build match filter for user-specific stats
    const matchFilter: any = {};
    
    // For non-admin users, only show their own courses
    if (session.user.role !== 'admin') {
      matchFilter.createdBy = session.user.id;
    }

    // Get basic stats
    const basicStats = await Course.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          paidCourses: {
            $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] }
          },
          freeCourses: {
            $sum: { $cond: [{ $eq: ['$isPaid', false] }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$isPaid', true] },
                { $ifNull: ['$salePrice', '$price'] },
                0
              ]
            }
          },
          averagePrice: {
            $avg: {
              $cond: [
                { $eq: ['$isPaid', true] },
                { $ifNull: ['$salePrice', '$price'] },
                null
              ]
            }
          },
          minPrice: {
            $min: {
              $cond: [
                { $eq: ['$isPaid', true] },
                { $ifNull: ['$salePrice', '$price'] },
                null
              ]
            }
          },
          maxPrice: {
            $max: {
              $cond: [
                { $eq: ['$isPaid', true] },
                { $ifNull: ['$salePrice', '$price'] },
                null
              ]
            }
          }
        }
      }
    ]);

    // Get category distribution
    const categoryStats = await Course.aggregate([
      { $match: { ...matchFilter, category: { $exists: true, $ne: null, $nin: [''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get courses with discounts
    const discountStats = await Course.aggregate([
      {
        $match: {
          ...matchFilter,
          isPaid: true,
          salePrice: { $exists: true, $ne: null },
          price: { $exists: true, $ne: null },
          $expr: { $lt: ['$salePrice', '$price'] }
        }
      },
      {
        $group: {
          _id: null,
          coursesWithDiscounts: { $sum: 1 },
          averageDiscount: {
            $avg: {
              $multiply: [
                {
                  $divide: [
                    { $subtract: ['$price', '$salePrice'] },
                    '$price'
                  ]
                },
                100
              ]
            }
          }
        }
      }
    ]);

    // Get recent courses (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStats = await Course.aggregate([
      {
        $match: {
          ...matchFilter,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          recentCourses: { $sum: 1 },
          recentPaidCourses: {
            $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] }
          },
          recentRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$isPaid', true] },
                { $ifNull: ['$salePrice', '$price'] },
                0
              ]
            }
          }
        }
      }
    ]);

    // Get monthly course creation trend (last 12 months)
    const monthlyTrend = await Course.aggregate([
      {
        $match: {
          ...matchFilter,
          createdAt: {
            $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [
                { $eq: ['$isPaid', true] },
                { $ifNull: ['$salePrice', '$price'] },
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const stats = {
      ...basicStats[0],
      coursesWithDiscounts: discountStats[0]?.coursesWithDiscounts || 0,
      averageDiscount: discountStats[0]?.averageDiscount || 0,
      recentCourses: recentStats[0]?.recentCourses || 0,
      recentPaidCourses: recentStats[0]?.recentPaidCourses || 0,
      recentRevenue: recentStats[0]?.recentRevenue || 0,
      categories: categoryStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      monthlyTrend: monthlyTrend.map(item => ({
        month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        count: item.count,
        revenue: item.revenue
      }))
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching course stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course statistics' },
      { status: 500 }
    );
  }
}
