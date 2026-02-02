import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Chapter from '@/models/Chapter';
import Course from '@/models/Course';
import { ChapterFilters, ChapterListResponse } from '@/types/chapter';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const filters: ChapterFilters = {
      course: searchParams.get('course') || undefined,
      isPublished: searchParams.get('isPublished') ? searchParams.get('isPublished') === 'true' : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: (searchParams.get('sortBy') as any) || 'order',
      sortOrder: (searchParams.get('sortOrder') as any) || 'asc',
    };

    // Build query
    const query: any = {};
    
    if (filters.course) {
      query.course = filters.course;
    }
    
    if (filters.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
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
    const chapters = await Chapter.find(query)
      .populate('course', 'title')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Chapter.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Calculate stats
    const stats = await Chapter.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          published: {
            $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
          },
          unpublished: {
            $sum: { $cond: [{ $eq: ['$isPublished', false] }, 1, 0] }
          }
        }
      }
    ]);

    const lessonStats = await Chapter.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'lessons',
          localField: '_id',
          foreignField: 'chapter',
          as: 'lessons'
        }
      },
      {
        $group: {
          _id: null,
          totalLessons: { $sum: { $size: '$lessons' } },
          averageLessonsPerChapter: { $avg: { $size: '$lessons' } }
        }
      }
    ]);

    const chapterStats = {
      total: stats[0]?.total || 0,
      published: stats[0]?.published || 0,
      unpublished: stats[0]?.unpublished || 0,
      totalLessons: lessonStats[0]?.totalLessons || 0,
      averageLessonsPerChapter: Math.round((lessonStats[0]?.averageLessonsPerChapter || 0) * 100) / 100,
    };

    const response: ChapterListResponse = {
      chapters: chapters.map(chapter => ({
        ...(chapter as any),
        _id: (chapter as any)._id.toString(),
        course: typeof (chapter as any).course === 'object' && (chapter as any).course
          ? (chapter as any).course._id.toString() 
          : (chapter as any).course ? (chapter as any).course.toString() : null,
        createdAt: (chapter as any).createdAt.toISOString(),
        updatedAt: (chapter as any).updatedAt.toISOString(),
      })),
      pagination: { page, limit, total, pages },
      stats: chapterStats,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { title, description, course, order, isPublished = false } = body;

    // Validate required fields
    if (!title || !course || !order) {
      return NextResponse.json(
        { success: false, error: 'Title, course, and order are required' },
        { status: 400 }
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

    // Check if order is unique within the course
    const existingChapter = await Chapter.findOne({
      course,
      order,
    });

    if (existingChapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter order must be unique within a course' },
        { status: 400 }
      );
    }

    const chapter = new Chapter({
      title,
      description,
      course,
      order,
      isPublished,
    });

    await chapter.save();

    return NextResponse.json({
      success: true,
      data: {
        ...chapter.toObject(),
        _id: chapter._id.toString(),
        course: chapter.course.toString(),
        createdAt: chapter.createdAt.toISOString(),
        updatedAt: chapter.updatedAt.toISOString(),
      },
      message: 'Chapter created successfully',
    });
  } catch (error) {
    console.error('Error creating chapter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create chapter' },
      { status: 500 }
    );
  }
}
