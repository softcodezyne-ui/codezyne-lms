import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Chapter from '@/models/Chapter';
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
    const course = searchParams.get('course') || '';
    const isPublished = searchParams.get('isPublished');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        data: { chapters: [] },
      });
    }

    // Build search query
    const searchQuery: any = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
      ],
    };

    if (course) {
      searchQuery.course = course;
    }

    if (isPublished !== null) {
      searchQuery.isPublished = isPublished === 'true';
    }

    const chapters = await Chapter.find(searchQuery)
      .populate('course', 'title')
      .sort({ title: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        chapters: chapters.map(chapter => ({
          ...(chapter as any),
          _id: (chapter as any)._id.toString(),
          course: (chapter as any).course.toString(),
          createdAt: (chapter as any).createdAt.toISOString(),
          updatedAt: (chapter as any).updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error('Error searching chapters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search chapters' },
      { status: 500 }
    );
  }
}
