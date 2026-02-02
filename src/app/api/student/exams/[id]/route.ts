import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Exam from '@/models/Exam';
import Question from '@/models/Question';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Ensure referenced models are registered for population
    await import('@/models/Course');
    await import('@/models/User');

    // Get exam details
    const exam = await Exam.findById(id)
      .populate('createdBy', 'name email')
      .populate('course', 'title')
      .lean();

    if (!exam) {
      console.log('Student Exam GET - not found', { id });
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    if (!(exam as any).isPublished || !(exam as any).isActive) {
      console.log('Student Exam GET - not available', { isPublished: (exam as any).isPublished, isActive: (exam as any).isActive });
      return NextResponse.json(
        { error: 'Exam is not available' },
        { status: 400 }
      );
    }

    // Check if exam is within time limits
    const now = new Date();
    if ((exam as any).startDate && now < new Date((exam as any).startDate)) {
      console.log('Student Exam GET - not started yet', { startDate: (exam as any).startDate, now });
      return NextResponse.json(
        { error: 'Exam has not started yet' },
        { status: 400 }
      );
    }

    if ((exam as any).endDate && now > new Date((exam as any).endDate)) {
      console.log('Student Exam GET - expired', { endDate: (exam as any).endDate, now });
      return NextResponse.json(
        { error: 'Exam has expired' },
        { status: 400 }
      );
    }

    // Get questions for the exam
    const questions = await Question.find({ _id: { $in: (exam as any).questions } })
      .lean();

    // Shuffle questions if required
    let shuffledQuestions = [...questions];
    if ((exam as any).shuffleQuestions) {
      shuffledQuestions = questions.sort(() => Math.random() - 0.5);
    }

    // Shuffle options if required
    if ((exam as any).shuffleOptions) {
      shuffledQuestions = shuffledQuestions.map(question => {
        if (question.type === 'mcq' && question.options) {
          return {
            ...question,
            options: question.options.sort(() => Math.random() - 0.5)
          };
        }
        return question;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          ...exam,
          questionCount: (exam as any).questions ? (exam as any).questions.length : 0
        },
        questions: shuffledQuestions
      }
    });

  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam' },
      { status: 500 }
    );
  }
}
