import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExamAttempt from '@/models/ExamAttempt';
import Exam from '@/models/Exam';
import Question from '@/models/Question';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const body = await request.json();

    const attempt = await ExamAttempt.findById(id);

    if (!attempt) {
      return NextResponse.json(
        { error: 'Exam attempt not found' },
        { status: 404 }
      );
    }

    // Normalize to string for comparison in case of ObjectId
    const attemptStudentId = typeof (attempt as any).student === 'string'
      ? (attempt as any).student
      : ((attempt as any).student?.toString?.() || (attempt as any).student + '');
    if (attemptStudentId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Attempt already completed' },
        { status: 400 }
      );
    }

    // Get exam details
    const exam = await Exam.findById(attempt.exam);
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Get questions for scoring
    const questions = await Question.find({ _id: { $in: exam.questions } });

    // Calculate score
    let totalScore = 0;
    let correctAnswers = 0;
    const scoredAnswers = body.answers.map((answer: any) => {
      const question = questions.find(q => q._id.toString() === answer.questionId);
      if (!question) return answer;

      let isCorrect = false;
      let marks = 0;

      if (question.type === 'mcq') {
        const correctOption = question.options?.find((opt: any) => opt.isCorrect);
        if (correctOption && answer.answer === correctOption._id.toString()) {
          isCorrect = true;
          marks = question.marks;
          totalScore += marks;
          correctAnswers++;
        }
      } else if (question.type === 'true_false') {
        const correctAnswer = question.correctAnswer;
        if (answer.answer === correctAnswer) {
          isCorrect = true;
          marks = question.marks;
          totalScore += marks;
          correctAnswers++;
        }
      } else if (question.type === 'fill_blank') {
        const correctAnswer = question.correctAnswer?.toLowerCase().trim();
        const studentAnswer = answer.answer?.toLowerCase().trim();
        if (correctAnswer && studentAnswer && correctAnswer === studentAnswer) {
          isCorrect = true;
          marks = question.marks;
          totalScore += marks;
          correctAnswers++;
        }
      } else if (question.type === 'written' || question.type === 'essay') {
        // For written questions, we'll need manual grading
        // For now, we'll mark them as needing review
        marks = 0; // Will be updated by instructor
      }

      return {
        ...answer,
        isCorrect,
        marks
      };
    });

    // Calculate percentage
    const percentage = exam.totalMarks > 0 ? (totalScore / exam.totalMarks) * 100 : 0;
    const passed = percentage >= exam.passingMarks;

    // Update attempt
    const updatedAttempt = await ExamAttempt.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        score: totalScore,
        percentage: percentage,
        passed: passed,
        answers: scoredAnswers,
        timeSpent: body.timeSpent || 0,
        completedAt: new Date()
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: {
        attempt: updatedAttempt,
        score: {
          totalScore,
          percentage,
          passed,
          correctAnswers,
          totalQuestions: questions.length
        }
      }
    });

  } catch (error) {
    console.error('Error submitting exam:', error);
    return NextResponse.json(
      { error: 'Failed to submit exam' },
      { status: 500 }
    );
  }
}
