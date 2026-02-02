import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Exam from '@/models/Exam';
import Question from '@/models/Question';
import ExamAttempt from '@/models/ExamAttempt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UpdateExamData } from '@/types/exam';

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
    const exam = await Exam.findById(id)
      .populate('createdBy', 'name email role')
      .populate('course', 'title')
      .lean();

    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Get exam statistics
    const stats = await ExamAttempt.aggregate([
      { $match: { exam: id } },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          completedAttempts: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageScore: { $avg: '$percentage' },
          passRate: {
            $avg: { $cond: [{ $eq: ['$isPassed', true] }, 1, 0] }
          }
        }
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        exam,
        stats: stats[0] || {
          totalAttempts: 0,
          completedAttempts: 0,
          averageScore: 0,
          passRate: 0
        }
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
    const body: UpdateExamData = await request.json();
    
    console.log('Exam update request:', {
      id,
      body,
      passingMarks: body.passingMarks,
      totalMarks: body.totalMarks
    });
    
    const exam = await Exam.findById(id);
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to update
    if (exam.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get the final values for validation
    const finalTotalMarks = body.totalMarks !== undefined ? body.totalMarks : exam.totalMarks;
    const finalPassingMarks = body.passingMarks !== undefined ? body.passingMarks : exam.passingMarks;

    console.log('Validation values:', {
      currentExam: { totalMarks: exam.totalMarks, passingMarks: exam.passingMarks },
      updateBody: { totalMarks: body.totalMarks, passingMarks: body.passingMarks },
      finalValues: { totalMarks: finalTotalMarks, passingMarks: finalPassingMarks },
      isValid: finalPassingMarks <= finalTotalMarks
    });

    // Validate passing marks against final total marks
    if (finalPassingMarks > finalTotalMarks) {
      console.log('Validation failed: passing marks exceed total marks');
      return NextResponse.json(
        { error: 'Passing marks cannot exceed total marks' },
        { status: 400 }
      );
    }

    // Additional validation for edge cases
    if (finalTotalMarks <= 0) {
      return NextResponse.json(
        { error: 'Total marks must be greater than 0' },
        { status: 400 }
      );
    }

    if (finalPassingMarks < 0) {
      return NextResponse.json(
        { error: 'Passing marks cannot be negative' },
        { status: 400 }
      );
    }

    // Update exam (skip validators since we've already validated)
    const updatedExam = await Exam.findByIdAndUpdate(
      id,
      { ...body },
      { new: true, runValidators: false }
    )
      .populate('createdBy', 'name email role')
      .populate('course', 'title');

    return NextResponse.json({
      success: true,
      data: updatedExam
    });

  } catch (error) {
    console.error('Error updating exam:', error);
    return NextResponse.json(
      { error: 'Failed to update exam' },
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

    // Check if user has permission to delete
    if (exam.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if exam has attempts
    const attemptCount = await ExamAttempt.countDocuments({ exam: id });
    if (attemptCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete exam with existing attempts' },
        { status: 400 }
      );
    }

    // Delete exam
    await Exam.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Exam deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting exam:', error);
    return NextResponse.json(
      { error: 'Failed to delete exam' },
      { status: 500 }
    );
  }
}
