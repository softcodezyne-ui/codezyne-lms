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
    const query = searchParams.get('q') || '';
    const chapter = searchParams.get('chapter') || '';
    const course = searchParams.get('course') || '';
    const isPublished = searchParams.get('isPublished');
    const isFree = searchParams.get('isFree');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: { lessons: [] },
      });
    }

    // Build search query
    const searchQuery: any = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
      ],
    };

    if (chapter) {
      searchQuery.chapter = chapter;
    }

    if (course) {
      searchQuery.course = course;
    }

    if (isPublished !== null) {
      searchQuery.isPublished = isPublished === 'true';
    }

    if (isFree !== null) {
      searchQuery.isFree = isFree === 'true';
    }

    const lessons = await Lesson.find(searchQuery)
      .populate('chapter', 'title order')
      .populate('course', 'title')
      .sort({ title: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        lessons: lessons.map(lesson => ({
          ...(lesson as any),
          _id: (lesson as any)._id.toString(),
          chapter: (lesson as any).chapter.toString(),
          course: (lesson as any).course.toString(),
          createdAt: (lesson as any).createdAt.toISOString(),
          updatedAt: (lesson as any).updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Error searching lessons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search lessons' },
      { status: 500 }
    );
  }
}
