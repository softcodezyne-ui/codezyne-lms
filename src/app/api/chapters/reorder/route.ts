import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Chapter from '@/models/Chapter';
import connectDB from '@/lib/mongodb';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { courseId, chapterOrders } = body;

    if (!courseId || !chapterOrders || !Array.isArray(chapterOrders)) {
      return NextResponse.json(
        { success: false, error: 'Course ID and chapter orders are required' },
        { status: 400 }
      );
    }

    // Validate chapter orders
    for (const item of chapterOrders) {
      if (!item.chapterId || !item.order || typeof item.order !== 'number') {
        return NextResponse.json(
          { success: false, error: 'Invalid chapter order data' },
          { status: 400 }
        );
      }
    }

    // Update chapters in bulk
    const updatePromises = chapterOrders.map(({ chapterId, order }) =>
      Chapter.findByIdAndUpdate(
        chapterId,
        { order },
        { new: true, runValidators: true }
      )
    );

    const updatedChapters = await Promise.all(updatePromises);

    // Verify all chapters belong to the same course
    const courseIds = [...new Set(updatedChapters.map(chapter => chapter?.course.toString()))];
    if (courseIds.length > 1 || courseIds[0] !== courseId) {
      return NextResponse.json(
        { success: false, error: 'All chapters must belong to the same course' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedChapters.map(chapter => ({
        ...chapter?.toObject(),
        _id: (chapter as any)?._id.toString(),
        course: (chapter as any)?.course.toString(),
        createdAt: (chapter as any)?.createdAt.toISOString(),
        updatedAt: (chapter as any)?.updatedAt.toISOString(),
      })),
      message: 'Chapters reordered successfully',
    });
  } catch (error) {
    console.error('Error reordering chapters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder chapters' },
      { status: 500 }
    );
  }
}
