import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExamAttempt from '@/models/ExamAttempt';
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

    const attempt = await ExamAttempt.findById(id)
      .populate('exam', 'title type duration totalMarks passingMarks')
      .lean();

    if (!attempt) {
      return NextResponse.json(
        { error: 'Exam attempt not found' },
        { status: 404 }
      );
    }

    if ((attempt as any).student !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        attempt
      }
    });

  } catch (error) {
    console.error('Error fetching exam attempt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam attempt' },
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
    const body = await request.json();

    const attempt = await ExamAttempt.findById(id);

    if (!attempt) {
      return NextResponse.json(
        { error: 'Exam attempt not found' },
        { status: 404 }
      );
    }

    if ((attempt as any).student !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Cannot update completed attempt' },
        { status: 400 }
      );
    }

    // Update attempt with new answers and time spent
    const updateData: any = {};
    
    if (body.answers) {
      updateData.answers = body.answers;
    }
    
    if (body.timeSpent !== undefined) {
      updateData.timeSpent = body.timeSpent;
    }

    const updatedAttempt = await ExamAttempt.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        attempt: updatedAttempt
      }
    });

  } catch (error) {
    console.error('Error updating exam attempt:', error);
    return NextResponse.json(
      { error: 'Failed to update exam attempt' },
      { status: 500 }
    );
  }
}
