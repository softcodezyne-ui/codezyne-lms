import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Lesson from '@/models/Lesson';
import Chapter from '@/models/Chapter';
import Course from '@/models/Course';
import { LessonFilters, LessonListResponse } from '@/types/lesson';
import connectDB from '@/lib/mongodb';
// Extract a YouTube video ID from either a full URL or a raw ID
function extractYouTubeId(input?: string | null): string | undefined {
  if (!input) return undefined;
  const value = String(input).trim();
  if (!value) return undefined;
  // If already looks like an ID
  if (/^[a-zA-Z0-9_-]{8,20}$/.test(value)) return value;
  try {
    const url = new URL(value);
    // https://www.youtube.com/watch?v=ID or youtu.be/ID
    const v = url.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{8,20}$/.test(v)) return v;
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.hostname.includes('youtu.be') && parts[0] && /^[a-zA-Z0-9_-]{8,20}$/.test(parts[0])) return parts[0];
    // /embed/ID
    const embedIdx = parts.indexOf('embed');
    if (embedIdx >= 0 && parts[embedIdx + 1] && /^[a-zA-Z0-9_-]{8,20}$/.test(parts[embedIdx + 1])) return parts[embedIdx + 1];
  } catch (_) {
    // not a URL; fallthrough
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const filters: LessonFilters = {
      chapter: searchParams.get('chapter') || undefined,
      course: searchParams.get('course') || undefined,
      isPublished: searchParams.get('isPublished') ? searchParams.get('isPublished') === 'true' : undefined,
      isFree: searchParams.get('isFree') ? searchParams.get('isFree') === 'true' : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: (searchParams.get('sortBy') as any) || 'order',
      sortOrder: (searchParams.get('sortOrder') as any) || 'asc',
    };

    // Build query
    const query: any = {};
    
    if (filters.chapter) {
      query.chapter = filters.chapter;
    }
    
    if (filters.course) {
      query.course = filters.course;
    }
    
    if (filters.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }
    
    if (filters.isFree !== undefined) {
      query.isFree = filters.isFree;
    }
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { content: { $regex: filters.search, $options: 'i' } },
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
    const lessons = await Lesson.find(query)
      .populate('chapter', 'title order')
      .populate('course', 'title')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Lesson.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Calculate stats
    const stats = await Lesson.aggregate([
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
          },
          free: {
            $sum: { $cond: [{ $eq: ['$isFree', true] }, 1, 0] }
          },
          paid: {
            $sum: { $cond: [{ $eq: ['$isFree', false] }, 1, 0] }
          },
          averageDuration: { $avg: '$duration' },
          totalDuration: { $sum: '$duration' },
          withVideo: {
            $sum: { $cond: [{ $or: [{ $ne: ['$videoUrl', null] }, { $ne: ['$youtubeVideoId', null] }] }, 1, 0] }
          },
          withYouTubeVideo: {
            $sum: { $cond: [{ $ne: ['$youtubeVideoId', null] }, 1, 0] }
          },
          withAttachments: {
            $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$attachments', []] } }, 0] }, 1, 0] }
          }
        }
      }
    ]);

    const lessonStats = {
      total: stats[0]?.total || 0,
      published: stats[0]?.published || 0,
      unpublished: stats[0]?.unpublished || 0,
      free: stats[0]?.free || 0,
      paid: stats[0]?.paid || 0,
      averageDuration: Math.round((stats[0]?.averageDuration || 0) * 100) / 100,
      totalDuration: stats[0]?.totalDuration || 0,
      withVideo: stats[0]?.withVideo || 0,
      withYouTubeVideo: stats[0]?.withYouTubeVideo || 0,
      withAttachments: stats[0]?.withAttachments || 0,
    };

    const response: LessonListResponse = {
      lessons: lessons.map(lesson => ({
        ...(lesson as any),
        _id: (lesson as any)._id.toString(),
        chapter: typeof (lesson as any).chapter === 'object' && (lesson as any).chapter
          ? (lesson as any).chapter._id.toString() 
          : (lesson as any).chapter ? (lesson as any).chapter.toString() : null,
        course: typeof (lesson as any).course === 'object' && (lesson as any).course
          ? (lesson as any).course._id.toString() 
          : (lesson as any).course ? (lesson as any).course.toString() : null,
        createdAt: (lesson as any).createdAt.toISOString(),
        updatedAt: (lesson as any).updatedAt.toISOString(),
      })),
      pagination: { page, limit, total, pages },
      stats: lessonStats,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lessons' },
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
    const {
      title,
      description,
      content,
      chapter,
      course,
      order,
      duration,
      youtubeVideoId,
      videoUrl,
      videoDuration,
      attachments = [],
      isPublished = false,
      isFree = false,
    } = body;

    // Validate required fields
    if (!title || !chapter || !course || !order) {
      return NextResponse.json(
        { success: false, error: 'Title, chapter, course, and order are required' },
        { status: 400 }
      );
    }

    // Check if chapter exists
    const chapterExists = await Chapter.findById(chapter);
    if (!chapterExists) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
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

    // Check if order is unique within the chapter
    const existingLesson = await Lesson.findOne({
      chapter,
      order,
    });

    if (existingLesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson order must be unique within a chapter' },
        { status: 400 }
      );
    }

    const normalizedYouTubeId = extractYouTubeId(youtubeVideoId) ?? undefined;
    const lesson = new Lesson({
      title,
      description,
      content,
      chapter,
      course,
      order,
      duration,
      youtubeVideoId: normalizedYouTubeId,
      videoUrl,
      videoDuration,
      attachments,
      isPublished,
      isFree,
    });

    await lesson.save();

    return NextResponse.json({
      success: true,
      data: {
        ...lesson.toObject(),
        _id: lesson._id.toString(),
        chapter: lesson.chapter.toString(),
        course: lesson.course.toString(),
        createdAt: lesson.createdAt.toISOString(),
        updatedAt: lesson.updatedAt.toISOString(),
      },
      message: 'Lesson created successfully',
    });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lesson' },
      { status: 500 }
    );
  }
}
