import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Exam from '@/models/Exam';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExamFilters, CreateExamData } from '@/types/exam';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    console.log('Instructor Exams API - Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userRole: session?.user?.role
    });
    
    if (!session?.user) {
      console.log('Instructor Exams API - Unauthorized: No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is instructor
    if (session.user.role !== 'instructor') {
      console.log('Instructor Exams API - Forbidden: User is not an instructor');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filters: ExamFilters = {
      search: searchParams.get('search') || undefined,
      type: (searchParams.get('type') as any) || 'all',
      status: (searchParams.get('status') as any) || 'all',
      difficulty: (searchParams.get('difficulty') as any) || 'all',
      course: searchParams.get('course') || undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      isPublished: searchParams.get('isPublished') ? searchParams.get('isPublished') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
    };

    // Build query - only show exams created by this instructor
    const query: any = {
      createdBy: session.user.id
    };
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    if (filters.type && filters.type !== 'all') {
      query.type = filters.type;
    }
    
    if (filters.status && filters.status !== 'all') {
      const now = new Date();
      switch (filters.status) {
        case 'draft':
          query.isPublished = false;
          break;
        case 'published':
          query.isPublished = true;
          query.isActive = true;
          break;
        case 'scheduled':
          query.startDate = { $gt: now };
          query.isPublished = true;
          break;
        case 'active':
          query.isPublished = true;
          query.isActive = true;
          query.$or = [
            { startDate: { $lte: now }, endDate: { $gte: now } },
            { startDate: { $exists: false }, endDate: { $exists: false } }
          ];
          break;
        case 'expired':
          query.endDate = { $lt: now };
          break;
        case 'inactive':
          query.isActive = false;
          break;
      }
    }
    
    if (filters.course) {
      query.course = filters.course;
    }
    
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    
    if (filters.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }

    // Calculate pagination
    const skip = (filters.page! - 1) * filters.limit!;
    
    // Build sort
    const sort: any = {};
    sort[filters.sortBy!] = filters.sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [exams, total] = await Promise.all([
      Exam.find(query)
        .populate('createdBy', 'name email role')
        .populate('course', 'title')
        .sort(sort)
        .skip(skip)
        .limit(filters.limit!)
        .lean(),
      Exam.countDocuments(query)
    ]);

    // Add question count to each exam since lean() doesn't include virtuals
    const examsWithQuestionCount = exams.map(exam => ({
      ...exam,
      questionCount: exam.questions ? exam.questions.length : 0
    }));

    // Calculate comprehensive stats for this instructor's exams
    const stats = await Exam.aggregate([
      { $match: { createdBy: session.user.id } },
      {
        $group: {
          _id: null,
          totalExams: { $sum: 1 },
          publishedExams: {
            $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
          },
          draftExams: {
            $sum: { $cond: [{ $eq: ['$isPublished', false] }, 1, 0] }
          },
          activeExams: {
            $sum: { $cond: [{ $and: [{ $eq: ['$isActive', true] }, { $eq: ['$isPublished', true] }] }, 1, 0] }
          },
          totalQuestions: { $sum: { $size: { $ifNull: ['$questions', []] } } },
          examsByType: {
            $push: {
              type: '$type',
              isPublished: '$isPublished',
              isActive: '$isActive'
            }
          }
        }
      }
    ]);

    const examStats = stats[0] || {
      totalExams: 0,
      publishedExams: 0,
      draftExams: 0,
      activeExams: 0,
      totalQuestions: 0,
      examsByType: []
    };

    // Process type statistics
    const typeStats = examStats.examsByType.reduce((acc: any, item: any) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    // Get exam attempts statistics for this instructor's exams
    const ExamAttempt = (await import('@/models/ExamAttempt')).default;
    const attemptStats = await ExamAttempt.aggregate([
      {
        $lookup: {
          from: 'exams',
          localField: 'exam',
          foreignField: '_id',
          as: 'examData'
        }
      },
      {
        $match: {
          'examData.createdBy': session.user.id
        }
      },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          completedAttempts: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          averageScore: {
            $avg: { $cond: [{ $eq: ['$status', 'completed'] }, '$score', null] }
          },
          passedAttempts: {
            $sum: { $cond: [{ $and: [{ $eq: ['$status', 'completed'] }, { $eq: ['$isPassed', true] }] }, 1, 0] }
          }
        }
      }
    ]);

    const attemptData = attemptStats[0] || {
      totalAttempts: 0,
      completedAttempts: 0,
      averageScore: 0,
      passedAttempts: 0
    };

    // Calculate pass rate
    const passRate = attemptData.completedAttempts > 0 
      ? (attemptData.passedAttempts / attemptData.completedAttempts) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        exams: examsWithQuestionCount,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          pages: Math.ceil(total / filters.limit!)
        },
        stats: {
          totalExams: examStats.totalExams,
          publishedExams: examStats.publishedExams,
          draftExams: examStats.draftExams,
          activeExams: examStats.activeExams,
          totalQuestions: examStats.totalQuestions,
          totalAttempts: attemptData.totalAttempts,
          averageScore: attemptData.averageScore || 0,
          passRate: passRate,
          examsByType: typeStats
        }
      }
    });

  } catch (error) {
    console.error('Error fetching instructor exams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
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

    // Check if user is instructor
    if (session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: CreateExamData = await request.json();
    
    // Validate required fields
    if (!body.title || !body.type || !body.duration || !body.totalMarks || !body.passingMarks) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate passing marks
    if (body.passingMarks > body.totalMarks) {
      return NextResponse.json(
        { error: 'Passing marks cannot exceed total marks' },
        { status: 400 }
      );
    }

    // Create exam
    const exam = new Exam({
      ...body,
      createdBy: session.user.id,
      questions: body.questions || []
    });

    await exam.save();
    await exam.populate('createdBy', 'name email role');
    await exam.populate('course', 'title');

    return NextResponse.json({
      success: true,
      data: exam
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating instructor exam:', error);
    return NextResponse.json(
      { error: 'Failed to create exam' },
      { status: 500 }
    );
  }
}
