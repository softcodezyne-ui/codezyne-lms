import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExamAttempt from '@/models/ExamAttempt';
import Exam from '@/models/Exam';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const status = searchParams.get('status');

    // Build query
    const query: any = {
      student: session.user.id
    };

    if (examId) {
      query.exam = examId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    // Get attempts with populated exam data
    const attempts = await ExamAttempt.find(query)
      .populate('exam', 'title type duration totalMarks passingMarks timeLimit')
      .sort({ createdAt: -1 })
      .lean();

    // Compute remainingSeconds for each attempt when possible
    const attemptsWithRemaining = attempts.map((att: any) => {
      const exam: any = att.exam || {};
      if (att.status === 'in_progress' && exam && exam.timeLimit) {
        const totalTime = (exam.duration || 0) * 60; // seconds
        const startedAtMs = att.startedAt ? new Date(att.startedAt).getTime() : Date.now();
        const baseSpent = att.timeSpent || 0;
        const elapsedSinceStart = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
        const effectiveSpent = Math.max(baseSpent, elapsedSinceStart);
        const spent = Math.min(totalTime, effectiveSpent);
        const remainingSeconds = Math.max(0, totalTime - spent);
        return { ...att, remainingSeconds };
      }
      return { ...att };
    });

    return NextResponse.json({
      success: true,
      data: {
        attempts: attemptsWithRemaining
      }
    });

  } catch (error) {
    console.error('Error fetching exam attempts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exam attempts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { examId } = body;

    if (!examId) {
      return NextResponse.json(
        { error: 'Exam ID is required' },
        { status: 400 }
      );
    }

    // Check if exam exists and is available
    const exam = await Exam.findById(examId);
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    if (!exam.isPublished || !exam.isActive) {
      return NextResponse.json(
        { error: 'Exam is not available' },
        { status: 400 }
      );
    }

    // Check if student has already completed this exam (exam expires for student once they participate)
    const completedAttempts = await ExamAttempt.find({
      exam: examId,
      student: session.user.id,
      status: 'completed'
    });

    if (completedAttempts.length > 0) {
      return NextResponse.json(
        { error: 'You have already completed this exam. This exam is no longer available for you.' },
        { status: 400 }
      );
    }

    // Check if there's already an in-progress attempt
    const existingAttempt = await ExamAttempt.findOne({
      exam: examId,
      student: session.user.id,
      status: 'in_progress'
    });

    if (existingAttempt) {
      const totalTime = exam.timeLimit ? (exam.duration * 60) : null; // seconds
      const startedAtMs = existingAttempt.startedAt ? new Date(existingAttempt.startedAt).getTime() : Date.now();
      const baseSpent = existingAttempt.timeSpent || 0;
      const ongoingSpent = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
      // Use the larger of persisted timeSpent and elapsed time since start to avoid reset
      const effectiveSpent = totalTime == null ? (baseSpent + ongoingSpent) : Math.max(baseSpent, ongoingSpent);
      const spent = totalTime == null ? effectiveSpent : Math.min(totalTime, effectiveSpent);
      const remainingSeconds = totalTime != null ? Math.max(0, totalTime - spent) : null;

      return NextResponse.json({
        success: true,
        data: {
          attempt: existingAttempt,
          remainingSeconds,
          message: 'Resuming existing attempt'
        }
      });
    }

    // Check remaining attempts (for in-progress attempts only)
    const allAttempts = await ExamAttempt.countDocuments({
      exam: examId,
      student: session.user.id
    });

    if (allAttempts >= exam.attempts) {
      return NextResponse.json(
        { error: 'No remaining attempts for this exam' },
        { status: 400 }
      );
    }

    // Create new attempt (include required fields from schema)
    const attempt = new ExamAttempt({
      exam: examId,
      student: session.user.id,
      status: 'in_progress',
      score: 0,
      percentage: 0,
      passed: false,
      timeSpent: 0,
      answers: [],
      startedAt: new Date(),
      attemptNumber: completedAttempts.length + 1,
      totalMarks: exam.totalMarks
    });

    await attempt.save();

    const totalTime = exam.timeLimit ? (exam.duration * 60) : null; // seconds
    const startedAtMs = attempt.startedAt ? new Date(attempt.startedAt).getTime() : Date.now();
    const baseSpent = attempt.timeSpent || 0;
    const ongoingSpent = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
    const spent = totalTime ? Math.min(totalTime, baseSpent + ongoingSpent) : baseSpent + ongoingSpent;
    const remainingSeconds = totalTime != null ? Math.max(0, totalTime - spent) : null;

    return NextResponse.json({
      success: true,
      data: {
        attempt,
        remainingSeconds
      }
    });

  } catch (error) {
    console.error('Error creating exam attempt:', error);
    return NextResponse.json(
      { error: 'Failed to create exam attempt' },
      { status: 500 }
    );
  }
}
