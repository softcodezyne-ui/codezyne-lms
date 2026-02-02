import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Lesson from '@/models/Lesson';
import LessonQuizQuestion from '@/models/LessonQuizQuestion';
import LessonQuizResult from '@/models/LessonQuizResult';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await request.json();
    const { answers, startedAt, isPracticeMode } = body as {
      startedAt: string | Date;
      answers: Array<{ questionId: string; selectedIndex: number }>;
      isPracticeMode?: boolean;
    };

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ success: false, error: 'Answers are required' }, { status: 400 });
    }

    const questionIds = answers.map((a) => a.questionId);
    const questions = await LessonQuizQuestion.find({ _id: { $in: questionIds }, lesson: id, isActive: true }).lean();

    if (questions.length !== answers.length) {
      return NextResponse.json({ success: false, error: 'Invalid answers submitted' }, { status: 400 });
    }

    const questionMap = new Map(questions.map((q: any) => [q._id.toString(), q]));

    let correct = 0;
    const evaluated = answers.map((a) => {
      const q = questionMap.get(a.questionId);
      const isCorrect = q && a.selectedIndex === q.correctOptionIndex;
      if (isCorrect) correct += 1;
      return {
        questionId: a.questionId,
        selectedIndex: a.selectedIndex,
        isCorrect: !!isCorrect,
      };
    });

    const totalQuestions = answers.length;
    const scorePercentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;

    // Check if user has already submitted a non-practice quiz for this lesson
    if (!isPracticeMode) {
      const existingSubmission = await LessonQuizResult.findOne({
        user: (session as any).user.id,
        lesson: id,
        isPracticeMode: false
      });
      
      if (existingSubmission) {
        return NextResponse.json({ 
          success: false, 
          error: 'Quiz has already been submitted. You cannot submit again.' 
        }, { status: 400 });
      }
    }

    const result = new LessonQuizResult({
      user: (session as any).user.id,
      course: (lesson as any).course,
      lesson: id,
      totalQuestions,
      correctAnswers: correct,
      scorePercentage,
      answers: evaluated,
      isPracticeMode: isPracticeMode || false,
      startedAt: startedAt ? new Date(startedAt) : new Date(),
      submittedAt: new Date(),
    });

    await result.save();

    return NextResponse.json({
      success: true,
      data: {
        _id: result._id.toString(),
        user: (result as any).user.toString(),
        course: (result as any).course.toString(),
        lesson: (result as any).lesson.toString(),
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        scorePercentage: result.scorePercentage,
        answers: result.answers,
        isPracticeMode: result.isPracticeMode,
        startedAt: result.startedAt.toISOString(),
        submittedAt: result.submittedAt.toISOString(),
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
      message: 'Quiz submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit quiz' }, { status: 500 });
  }
}


