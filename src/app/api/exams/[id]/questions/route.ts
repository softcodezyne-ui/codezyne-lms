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
    const exam = await Exam.findById(id);
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    const questions = await Question.find({ exam: id })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: questions
    });

  } catch (error) {
    console.error('Error fetching exam questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam questions' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const exam = await Exam.findById(id);
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to add questions
    if (exam.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { questionIds } = body;

    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json(
        { error: 'Question IDs are required' },
        { status: 400 }
      );
    }

    // Validate that all questions exist
    const questions = await Question.find({ _id: { $in: questionIds } });
    if (questions.length !== questionIds.length) {
      return NextResponse.json(
        { error: 'Some questions not found' },
        { status: 400 }
      );
    }

    // Add questions to exam
    const existingQuestionIds = exam.questions.map((id: any) => id.toString());
    const newQuestionIds = questionIds.filter((id: any) => !existingQuestionIds.includes(id));
    
    if (newQuestionIds.length === 0) {
      return NextResponse.json(
        { error: 'All questions are already added to this exam' },
        { status: 400 }
      );
    }

    exam.questions.push(...newQuestionIds);
    await exam.save();

    // Update questions to reference this exam
    await Question.updateMany(
      { _id: { $in: newQuestionIds } },
      { exam: id }
    );

    return NextResponse.json({
      success: true,
      data: {
        addedQuestions: newQuestionIds.length,
        totalQuestions: exam.questions.length
      }
    });

  } catch (error) {
    console.error('Error adding questions to exam:', error);
    return NextResponse.json(
      { error: 'Failed to add questions to exam' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const exam = await Exam.findById(id);
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to remove questions
    if (exam.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { questionIds } = body;

    if (!questionIds || !Array.isArray(questionIds)) {
      return NextResponse.json(
        { error: 'Question IDs are required' },
        { status: 400 }
      );
    }

    // Remove questions from exam
    exam.questions = exam.questions.filter((id: any) => !questionIds.includes(id.toString()));
    await exam.save();

    // Remove exam reference from questions
    await Question.updateMany(
      { _id: { $in: questionIds } },
      { $unset: { exam: 1 } }
    );

    return NextResponse.json({
      success: true,
      data: {
        removedQuestions: questionIds.length,
        totalQuestions: exam.questions.length
      }
    });

  } catch (error) {
    console.error('Error removing questions from exam:', error);
    return NextResponse.json(
      { error: 'Failed to remove questions from exam' },
      { status: 500 }
    );
  }
}
