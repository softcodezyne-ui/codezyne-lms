import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Chapter from '@/models/Chapter';
import Lesson from '@/models/Lesson';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const course = searchParams.get('course');

    // Build base query
    const baseQuery = course ? { course } : {};

    // Get chapter stats
    const chapterStats = await Chapter.aggregate([
      { $match: baseQuery },
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

    // Get lesson stats for chapters
    const lessonStats = await Chapter.aggregate([
      { $match: baseQuery },
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

    // Get chapters with most lessons
    const topChapters = await Chapter.aggregate([
      { $match: baseQuery },
      {
        $lookup: {
          from: 'lessons',
          localField: '_id',
          foreignField: 'chapter',
          as: 'lessons'
        }
      },
      {
        $project: {
          title: 1,
          course: 1,
          lessonCount: { $size: '$lessons' },
          isPublished: 1
        }
      },
      { $sort: { lessonCount: -1 } },
      { $limit: 5 }
    ]);

    const stats = {
      total: chapterStats[0]?.total || 0,
      published: chapterStats[0]?.published || 0,
      unpublished: chapterStats[0]?.unpublished || 0,
      totalLessons: lessonStats[0]?.totalLessons || 0,
      averageLessonsPerChapter: Math.round((lessonStats[0]?.averageLessonsPerChapter || 0) * 100) / 100,
      topChapters: topChapters.map(chapter => ({
        ...chapter,
        _id: chapter._id.toString(),
        course: chapter.course.toString(),
      })),
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching chapter stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapter stats' },
      { status: 500 }
    );
  }
}
