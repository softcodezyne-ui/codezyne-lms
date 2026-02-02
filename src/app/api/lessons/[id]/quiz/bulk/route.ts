import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Lesson from '@/models/Lesson';
import LessonQuizQuestion from '@/models/LessonQuizQuestion';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
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

    const body = await request.json();
    const { questions } = body as { questions: Array<{ question: string; options: string[]; correctOptionIndex: number; explanation?: string; isActive?: boolean; }> };

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ success: false, error: 'Questions array is required' }, { status: 400 });
    }

    const docs = questions.map((q) => ({
      lesson: id,
      course: (lesson as any).course,
      question: q.question,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      explanation: q.explanation,
      isActive: q.isActive !== false,
    }));

    const created = await LessonQuizQuestion.insertMany(docs, { ordered: false });

    return NextResponse.json({
      success: true,
      data: created.map((c) => ({
        _id: c._id.toString(),
        lesson: c.lesson.toString(),
        course: c.course.toString(),
        question: c.question,
        options: c.options,
        explanation: c.explanation,
        isActive: c.isActive,
        createdAt: (c as any).createdAt.toISOString(),
        updatedAt: (c as any).updatedAt.toISOString(),
      })),
      message: 'Questions created successfully',
    });
  } catch (error: any) {
    console.error('Error creating quiz questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create quiz questions' },
      { status: 500 }
    );
  }
}


