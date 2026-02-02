import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import LessonQuizResult from '@/models/LessonQuizResult';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id: lessonId } = await params;
    if (!lessonId) {
      return NextResponse.json({ success: false, error: 'Lesson ID is required' }, { status: 400 });
    }

    // Fetch all quiz results for this lesson and user, ordered by submission date (newest first)
    const results = await LessonQuizResult.find({
      lesson: lessonId,
      user: session.user.id
    })
    .sort({ submittedAt: -1 })
    .select('scorePercentage correctAnswers totalQuestions isPracticeMode submittedAt')
    .lean();

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error fetching quiz submission history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch submission history' },
      { status: 500 }
    );
  }
}
