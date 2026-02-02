import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Lesson from '@/models/Lesson';

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { chapterId, lessonOrders } = await request.json();

    if (!chapterId || !Array.isArray(lessonOrders) || lessonOrders.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const bulkOperations = lessonOrders.map((lessonOrder: { lessonId: string; order: number }) => ({
      updateOne: {
        filter: { _id: lessonOrder.lessonId, chapter: chapterId },
        update: { $set: { order: lessonOrder.order } },
      },
    }));

    const result = await Lesson.bulkWrite(bulkOperations);

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} lessons reordered successfully`,
    });
  } catch (error) {
    console.error('Error reordering lessons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reorder lessons' },
      { status: 500 }
    );
  }
}
