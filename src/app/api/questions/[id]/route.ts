import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import Exam from '@/models/Exam';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UpdateQuestionData } from '@/types/exam';

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
    const question = await Question.findById(id)
      .populate('createdBy', 'name email role')
      .populate('exam', 'title')
      .lean();

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: question
    });

  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const body: UpdateQuestionData = await request.json();
    
    const question = await Question.findById(id);
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update
    if (question.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate MCQ questions
    if (body.type === 'mcq' || (body.type === undefined && question.type === 'mcq')) {
      const options = body.options || question.options;
      if (options && options.length < 2) {
        return NextResponse.json(
          { error: 'MCQ questions must have at least 2 options' },
          { status: 400 }
        );
      }
      if (options && options.length > 6) {
        return NextResponse.json(
          { error: 'MCQ questions cannot have more than 6 options' },
          { status: 400 }
        );
      }
      if (options) {
        const correctOptions = options.filter((option: any) => option.isCorrect);
        if (correctOptions.length === 0) {
          return NextResponse.json(
            { error: 'MCQ questions must have at least one correct option' },
            { status: 400 }
          );
        }
      }
    }

    // Validate True/False questions
    if (body.type === 'true_false' || (body.type === undefined && question.type === 'true_false')) {
      const options = body.options || question.options;
      if (options && options.length !== 2) {
        return NextResponse.json(
          { error: 'True/False questions must have exactly 2 options' },
          { status: 400 }
        );
      }
    }

    // Validate written questions
    if (body.type === 'written' || body.type === 'essay' || 
        (body.type === undefined && (question.type === 'written' || question.type === 'essay'))) {
      const correctAnswer = body.correctAnswer || question.correctAnswer;
      if (!correctAnswer || correctAnswer.trim().length === 0) {
        return NextResponse.json(
          { error: 'Written/Essay questions must have a correct answer' },
          { status: 400 }
        );
      }
    }

    // Sanitize the body to ensure proper ObjectId format
    const sanitizedBody = { ...body };
    
    // Handle exam field - ensure it's a valid ObjectId or undefined
    if (sanitizedBody.exam !== undefined) {
      console.log('Exam field received:', {
        value: sanitizedBody.exam,
        type: typeof sanitizedBody.exam,
        isString: typeof sanitizedBody.exam === 'string',
        isObject: typeof sanitizedBody.exam === 'object'
      });

      if (typeof sanitizedBody.exam === 'object' && sanitizedBody.exam !== null) {
        // If exam is an object, try to extract the _id
        sanitizedBody.exam = (sanitizedBody.exam as any)._id || (sanitizedBody.exam as any).id || null;
      }

      if (typeof sanitizedBody.exam === 'string' && sanitizedBody.exam.trim() !== '') {
        // Validate ObjectId format
        if (!/^[0-9a-fA-F]{24}$/.test(sanitizedBody.exam)) {
          console.log('Invalid exam ID format:', sanitizedBody.exam);
          return NextResponse.json(
            { error: 'Invalid exam ID format' },
            { status: 400 }
          );
        }
      } else {
        // Remove invalid or empty exam field
        delete sanitizedBody.exam;
      }
    }

    console.log('Question update - sanitized body:', sanitizedBody);

    // Update question
    const updatedQuestion = await Question.findByIdAndUpdate(
      id,
      sanitizedBody,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email role')
      .populate('exam', 'title');

    return NextResponse.json({
      success: true,
      data: updatedQuestion
    });

  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
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
    const question = await Question.findById(id);
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to delete
    if (question.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // If question is assigned to an exam, remove it from the exam first
    if (question.exam) {
      await Exam.findByIdAndUpdate(
        question.exam,
        { $pull: { questions: id } },
        { new: true }
      );
    }

    // Delete question
    await Question.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}
