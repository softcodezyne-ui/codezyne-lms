import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    const chapter = searchParams.get('chapter');

    // Build base query
    const baseQuery: any = {};
    if (course) baseQuery.course = course;
    if (chapter) baseQuery.chapter = chapter;

    // Get lesson stats
    const lessonStats = await Lesson.aggregate([
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

    // Get lessons by duration ranges
    const durationStats = await Lesson.aggregate([
      { $match: { ...baseQuery, duration: { $exists: true, $ne: null } } },
      {
        $bucket: {
          groupBy: '$duration',
          boundaries: [0, 5, 15, 30, 60, 120, 300],
          default: '300+',
          output: {
            count: { $sum: 1 },
            lessons: { $push: { title: '$title', duration: '$duration' } }
          }
        }
      }
    ]);

    // Get lessons by type (video, text, mixed)
    const typeStats = await Lesson.aggregate([
      { $match: baseQuery },
      {
        $project: {
          title: 1,
          hasVideo: { $ne: ['$videoUrl', null] },
          hasContent: { $ne: ['$content', null] },
          hasAttachments: { $gt: [{ $size: { $ifNull: ['$attachments', []] } }, 0] }
        }
      },
      {
        $group: {
          _id: null,
          videoOnly: {
            $sum: { $cond: [{ $and: ['$hasVideo', { $not: '$hasContent' }] }, 1, 0] }
          },
          textOnly: {
            $sum: { $cond: [{ $and: ['$hasContent', { $not: '$hasVideo' }] }, 1, 0] }
          },
          mixed: {
            $sum: { $cond: [{ $and: ['$hasVideo', '$hasContent'] }, 1, 0] }
          },
          withAttachments: {
            $sum: { $cond: ['$hasAttachments', 1, 0] }
          }
        }
      }
    ]);

    const stats = {
      total: lessonStats[0]?.total || 0,
      published: lessonStats[0]?.published || 0,
      unpublished: lessonStats[0]?.unpublished || 0,
      free: lessonStats[0]?.free || 0,
      paid: lessonStats[0]?.paid || 0,
      averageDuration: Math.round((lessonStats[0]?.averageDuration || 0) * 100) / 100,
      totalDuration: lessonStats[0]?.totalDuration || 0,
      withVideo: lessonStats[0]?.withVideo || 0,
      withYouTubeVideo: lessonStats[0]?.withYouTubeVideo || 0,
      withAttachments: lessonStats[0]?.withAttachments || 0,
      durationRanges: durationStats,
      typeBreakdown: {
        videoOnly: typeStats[0]?.videoOnly || 0,
        textOnly: typeStats[0]?.textOnly || 0,
        mixed: typeStats[0]?.mixed || 0,
        withAttachments: typeStats[0]?.withAttachments || 0,
      }
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching lesson stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lesson stats' },
      { status: 500 }
    );
  }
}
