import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ExamAttempt from '@/models/ExamAttempt';
import Exam from '@/models/Exam';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExamAttemptFilters, SubmitExamData } from '@/types/exam';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: ExamAttemptFilters = {
      exam: searchParams.get('exam') || undefined,
      student: searchParams.get('student') || undefined,
      status: (searchParams.get('status') as any) || 'all',
      isPassed: searchParams.get('isPassed') ? searchParams.get('isPassed') === 'true' : undefined,
      isSubmitted: searchParams.get('isSubmitted') ? searchParams.get('isSubmitted') === 'true' : undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: (searchParams.get('sortBy') as any) || 'startTime',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
    };

    // Build query
    const query: any = {};
    
    if (filters.exam) {
      query.exam = filters.exam;
    }
    
    if (filters.student) {
      query.student = filters.student;
    }
    
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    
    if (filters.isPassed !== undefined) {
      query.isPassed = filters.isPassed;
    }
    
    if (filters.isSubmitted !== undefined) {
      query.isSubmitted = filters.isSubmitted;
    }
    
    if (filters.startDate || filters.endDate) {
      query.startTime = {};
      if (filters.startDate) {
        query.startTime.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.startTime.$lte = new Date(filters.endDate);
      }
    }

    // Calculate pagination
    const skip = (filters.page! - 1) * filters.limit!;
    
    // Build sort
    const sort: any = {};
    sort[filters.sortBy!] = filters.sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [attempts, total] = await Promise.all([
      ExamAttempt.find(query)
        .populate('exam', 'title type duration totalMarks passingMarks')
        .populate('student', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(filters.limit!)
        .lean(),
      ExamAttempt.countDocuments(query)
    ]);

    // Calculate stats
    const stats = await ExamAttempt.aggregate([
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          completedAttempts: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          passedAttempts: {
            $sum: { $cond: [{ $eq: ['$isPassed', true] }, 1, 0] }
          },
          averageScore: { $avg: '$percentage' },
          averageTimeSpent: { $avg: '$timeSpent' }
        }
      }
    ]);

    const attemptStats = stats[0] || {
      totalAttempts: 0,
      completedAttempts: 0,
      passedAttempts: 0,
      averageScore: 0,
      averageTimeSpent: 0
    };

    return NextResponse.json({
      success: true,
      data: {
        attempts,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          pages: Math.ceil(total / filters.limit!)
        },
        stats: attemptStats
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

    const body: SubmitExamData = await request.json();
    
    // Validate required fields
    if (!body.exam || !body.answers || !Array.isArray(body.answers)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get exam details
    const exam = await Exam.findById(body.exam);
    if (!exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check if exam is active and published
    if (!exam.isPublished || !exam.isActive) {
      return NextResponse.json(
        { error: 'Exam is not available' },
        { status: 400 }
      );
    }

    // Check if student has already completed this exam (exam expires for student once they participate)
    const completedAttempts = await ExamAttempt.find({
      exam: body.exam,
      student: session.user.id,
      status: 'completed'
    });

    if (completedAttempts.length > 0) {
      return NextResponse.json(
        { error: 'You have already completed this exam. This exam is no longer available for you.' },
        { status: 400 }
      );
    }

    // Get existing attempts for this student and exam
    const existingAttempts = await ExamAttempt.find({
      exam: body.exam,
      student: session.user.id
    }).sort({ attemptNumber: -1 });

    const nextAttemptNumber = existingAttempts.length + 1;

    // Check if student has exceeded maximum attempts
    if (nextAttemptNumber > exam.attempts) {
      return NextResponse.json(
        { error: 'Maximum attempts exceeded' },
        { status: 400 }
      );
    }

    // Calculate marks and percentage
    let totalMarksObtained = 0;
    const processedAnswers = body.answers.map(answer => {
      // This is a simplified calculation - in a real system, you'd need more complex logic
      const marksObtained = answer.marksObtained || 0;
      totalMarksObtained += marksObtained;
      
      return {
        question: answer.question,
        selectedOptions: answer.selectedOptions || [],
        writtenAnswer: answer.writtenAnswer || '',
        isCorrect: answer.isCorrect || false,
        marksObtained,
        timeSpent: answer.timeSpent || 0,
        isAnswered: answer.isAnswered || false
      };
    });

    const percentage = Math.round((totalMarksObtained / exam.totalMarks) * 100);
    const isPassed = totalMarksObtained >= exam.passingMarks;

    // Create exam attempt
    const attempt = new ExamAttempt({
      exam: body.exam,
      student: session.user.id,
      answers: processedAnswers,
      totalMarks: exam.totalMarks,
      marksObtained: totalMarksObtained,
      percentage,
      isPassed,
      status: 'completed',
      timeSpent: body.timeSpent,
      isSubmitted: true,
      submittedAt: new Date(),
      attemptNumber: nextAttemptNumber,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    });

    await attempt.save();
    await attempt.populate('exam', 'title type duration totalMarks passingMarks');
    await attempt.populate('student', 'name email');

    return NextResponse.json({
      success: true,
      data: attempt
    }, { status: 201 });

  } catch (error) {
    console.error('Error submitting exam:', error);
    return NextResponse.json(
      { error: 'Failed to submit exam' },
      { status: 500 }
    );
  }
}
