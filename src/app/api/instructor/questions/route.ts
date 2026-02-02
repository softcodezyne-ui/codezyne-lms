import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
import Exam from '@/models/Exam';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { QuestionFilters, CreateQuestionData } from '@/types/exam';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const filters: QuestionFilters = {
      search: searchParams.get('search') || undefined,
      type: (searchParams.get('type') as any) || 'all',
      difficulty: (searchParams.get('difficulty') as any) || 'all',
      category: searchParams.get('category') || undefined,
      exam: searchParams.get('exam') || undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
    };

    // Build query - only show questions from exams created by this instructor
    const query: any = {};
    
    if (filters.exam) {
      // Verify that the exam belongs to this instructor
      const exam = await Exam.findById(filters.exam);
      if (!exam || (exam as any).createdBy.toString() !== session.user.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
      query.exam = filters.exam;
    } else {
      // If no specific exam, get all exams by this instructor and filter questions
      const instructorExams = await Exam.find({ createdBy: session.user.id }).select('_id');
      const examIds = instructorExams.map(exam => exam._id);
      query.exam = { $in: examIds };
    }
    
    if (filters.search) {
      query.$or = [
        { question: { $regex: filters.search, $options: 'i' } },
        { category: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    if (filters.type && filters.type !== 'all') {
      query.type = filters.type;
    }
    
    if (filters.difficulty && filters.difficulty !== 'all') {
      query.difficulty = filters.difficulty;
    }
    
    if (filters.category) {
      query.category = filters.category;
    }
    
    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    // Calculate pagination
    const skip = (filters.page! - 1) * filters.limit!;
    
    // Build sort
    const sort: any = {};
    sort[filters.sortBy!] = filters.sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [questions, total] = await Promise.all([
      Question.find(query)
        .populate('exam', 'title')
        .sort(sort)
        .skip(skip)
        .limit(filters.limit!)
        .lean(),
      Question.countDocuments(query)
    ]);

    // Calculate comprehensive stats for this instructor's questions
    const stats = await Question.aggregate([
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
          totalQuestions: { $sum: 1 },
          activeQuestions: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveQuestions: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
          questionsByType: {
            $push: {
              type: '$type',
              isActive: '$isActive'
            }
          },
          questionsByDifficulty: {
            $push: {
              difficulty: '$difficulty',
              isActive: '$isActive'
            }
          }
        }
      }
    ]);

    const questionStats = stats[0] || {
      totalQuestions: 0,
      activeQuestions: 0,
      inactiveQuestions: 0,
      questionsByType: [],
      questionsByDifficulty: []
    };

    // Process type and difficulty statistics
    const typeStats = questionStats.questionsByType.reduce((acc: any, item: any) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    const difficultyStats = questionStats.questionsByDifficulty.reduce((acc: any, item: any) => {
      acc[item.difficulty] = (acc[item.difficulty] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        questions,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          pages: Math.ceil(total / filters.limit!)
        },
        stats: {
          totalQuestions: questionStats.totalQuestions,
          activeQuestions: questionStats.activeQuestions,
          inactiveQuestions: questionStats.inactiveQuestions,
          questionsByType: typeStats,
          questionsByDifficulty: difficultyStats
        }
      }
    });

  } catch (error) {
    console.error('Error fetching instructor questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
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

    const body: CreateQuestionData = await request.json();
    
    // Validate required fields
    if (!body.question || !body.type || !body.marks || !body.exam) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify that the exam belongs to this instructor
    const exam = await Exam.findById(body.exam);
    if (!exam || (exam as any).createdBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Create question
    const question = new Question({
      ...body,
      createdBy: session.user.id
    });

    await question.save();
    await question.populate('exam', 'title');

    return NextResponse.json({
      success: true,
      data: question
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating instructor question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
