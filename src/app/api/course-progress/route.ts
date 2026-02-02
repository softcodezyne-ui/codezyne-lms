import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import CourseProgress from '@/models/CourseProgress';
import UserProgress from '@/models/UserProgress';
import Lesson from '@/models/Lesson';
import { ProgressFilters, CourseProgressListResponse } from '@/types/progress';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const filters: ProgressFilters = {
      user: searchParams.get('user') || session.user.id,
      course: searchParams.get('course') || undefined,
      isCompleted: searchParams.get('isCompleted') ? searchParams.get('isCompleted') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: (searchParams.get('sortBy') as any) || 'updatedAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    };

    // Build query
    const query: any = {};
    
    if (filters.user) {
      query.user = filters.user;
    }
    
    if (filters.course) {
      query.course = filters.course;
    }
    
    if (filters.isCompleted !== undefined) {
      query.isCompleted = filters.isCompleted;
    }

    // Build sort
    const sort: any = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;
    }

    // Pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Execute query
    const courseProgress = await CourseProgress.find(query)
      .populate('user', 'name email')
      .populate('course', 'title description thumbnailUrl')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await CourseProgress.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Calculate stats
    const stats = await CourseProgress.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalProgress: { $sum: 1 },
          completedProgress: {
            $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] }
          },
          averageProgressPercentage: { $avg: '$progressPercentage' },
          totalTimeSpent: { $sum: '$totalTimeSpent' },
          averageTimeSpent: { $avg: '$totalTimeSpent' }
        }
      }
    ]);

    const progressStats = {
      totalProgress: stats[0]?.totalProgress || 0,
      completedProgress: stats[0]?.completedProgress || 0,
      averageProgressPercentage: Math.round((stats[0]?.averageProgressPercentage || 0) * 100) / 100,
      totalTimeSpent: stats[0]?.totalTimeSpent || 0,
      averageTimeSpent: Math.round((stats[0]?.averageTimeSpent || 0) * 100) / 100,
      completionRate: stats[0]?.totalProgress > 0 ? 
        Math.round((stats[0].completedProgress / stats[0].totalProgress) * 100) : 0,
    };

    const response: CourseProgressListResponse = {
      courseProgress: courseProgress.map(prog => ({
        ...(prog as any),
        _id: (prog as any)._id.toString(),
        user: (prog as any).user.toString(),
        course: (prog as any).course.toString(),
        createdAt: (prog as any).createdAt.toISOString(),
        updatedAt: (prog as any).updatedAt.toISOString(),
        completedAt: (prog as any).completedAt?.toISOString(),
        lastAccessedAt: (prog as any).lastAccessedAt.toISOString(),
        startedAt: (prog as any).startedAt.toISOString(),
      })),
      pagination: { page, limit, total, pages },
      stats: progressStats,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching course progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch course progress' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { course } = body;

    // Validate required fields
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course is required' },
        { status: 400 }
      );
    }

    // Check if course progress already exists
    const existingProgress = await CourseProgress.findOne({
      user: session.user.id,
      course,
    });

    if (existingProgress) {
      return NextResponse.json(
        { success: false, error: 'Course progress already exists' },
        { status: 400 }
      );
    }

    // Get total lessons in course
    const totalLessons = await Lesson.countDocuments({ course, isPublished: true });

    // Create new course progress
    const courseProgress = new CourseProgress({
      user: session.user.id,
      course,
      totalLessons,
      completedLessons: 0,
      progressPercentage: 0,
      totalTimeSpent: 0,
      isCompleted: false,
      lastAccessedAt: new Date(),
      startedAt: new Date(),
    });

    await courseProgress.save();

    return NextResponse.json({
      success: true,
      data: {
        ...courseProgress.toObject(),
        _id: courseProgress._id.toString(),
        user: courseProgress.user.toString(),
        course: courseProgress.course.toString(),
        createdAt: courseProgress.createdAt.toISOString(),
        updatedAt: courseProgress.updatedAt.toISOString(),
        completedAt: (courseProgress as any).completedAt?.toISOString(),
        lastAccessedAt: (courseProgress as any).lastAccessedAt.toISOString(),
        startedAt: (courseProgress as any).startedAt.toISOString(),
      },
      message: 'Course progress created successfully',
    });
  } catch (error) {
    console.error('Error creating course progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create course progress' },
      { status: 500 }
    );
  }
}
