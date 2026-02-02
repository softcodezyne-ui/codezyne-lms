import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseCategory from '@/models/CourseCategory';
import Course from '@/models/Course';

// GET /api/categories/stats - Get category statistics
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

    // Get basic stats
    const basicStats = await CourseCategory.aggregate([
      {
        $group: {
          _id: null,
          totalCategories: { $sum: 1 },
          activeCategories: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveCategories: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          }
        }
      }
    ]);

    // Get categories with courses count
    const categoriesWithCourses = await CourseCategory.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'name',
          foreignField: 'category',
          as: 'courses'
        }
      },
      {
        $match: {
          'courses.0': { $exists: true }
        }
      },
      {
        $count: 'categoriesWithCourses'
      }
    ]);

    // Get category distribution with course counts
    const categoryDistribution = await CourseCategory.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'name',
          foreignField: 'category',
          as: 'courses'
        }
      },
      {
        $project: {
          name: 1,
          color: 1,
          icon: 1,
          isActive: 1,
          courseCount: { $size: '$courses' }
        }
      },
      {
        $sort: { courseCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get most used colors
    const colorStats = await CourseCategory.aggregate([
      {
        $group: {
          _id: '$color',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Get recent categories (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStats = await CourseCategory.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          recentCategories: { $sum: 1 },
          recentActiveCategories: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      }
    ]);

    // Get monthly category creation trend (last 12 months)
    const monthlyTrend = await CourseCategory.aggregate([
      {
        $match: {
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
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const stats = {
      ...basicStats[0],
      categoriesWithCourses: categoriesWithCourses[0]?.categoriesWithCourses || 0,
      recentCategories: recentStats[0]?.recentCategories || 0,
      recentActiveCategories: recentStats[0]?.recentActiveCategories || 0,
      categoryDistribution: categoryDistribution,
      colorStats: colorStats.map(item => ({
        color: item._id,
        count: item.count
      })),
      monthlyTrend: monthlyTrend.map(item => ({
        month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        count: item.count
      }))
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching category stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category statistics' },
      { status: 500 }
    );
  }
}
