import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Lesson from '@/models/Lesson';
import LessonQuizQuestion from '@/models/LessonQuizQuestion';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Lesson ID is required' }, { status: 400 });
    }

    const lesson = await Lesson.findById(id).lean();
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'Lesson not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 100) : undefined;

    const query: any = { lesson: id };
    if (!includeInactive) query.isActive = true;

    let cursor = LessonQuizQuestion.find(query).sort({ createdAt: 1 });
    if (limit) cursor = cursor.limit(limit);

    const questions = await cursor.lean();

    return NextResponse.json({
      success: true,
      data: questions.map((q) => ({
        _id: (q as any)._id.toString(),
        lesson: (q as any).lesson.toString(),
        course: (q as any).course.toString(),
        question: q.question,
        options: q.options,
        // Hide correctOptionIndex in fetch API
        explanation: q.explanation,
        isActive: q.isActive,
        createdAt: (q as any).createdAt.toISOString(),
        updatedAt: (q as any).updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch quiz questions' }, { status: 500 });
  }
}


