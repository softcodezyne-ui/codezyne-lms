import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Question from '@/models/Question';
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

    const { searchParams } = new URL(request.url);
    const filters: QuestionFilters = {
      search: searchParams.get('search') || undefined,
      type: (searchParams.get('type') as any) || 'all',
      difficulty: (searchParams.get('difficulty') as any) || 'all',
      category: searchParams.get('category') || undefined,
      tags: searchParams.get('tags')?.split(',') || undefined,
      exam: searchParams.get('exam') || undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
    };

    // Build query
    const query: any = {};
    
    if (filters.search) {
      query.$or = [
        { question: { $regex: filters.search, $options: 'i' } },
        { explanation: { $regex: filters.search, $options: 'i' } }
      ];
    }
    
    if (filters.type && filters.type !== 'all') {
      query.type = filters.type;
    }
    
    if (filters.difficulty && filters.difficulty !== 'all') {
      query.difficulty = filters.difficulty;
    }
    
    if (filters.category) {
      query.category = { $regex: filters.category, $options: 'i' };
    }
    
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }
    
    if (filters.exam) {
      query.exam = filters.exam;
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
        .populate('createdBy', 'name email role')
        .populate('exam', 'title')
        .sort(sort)
        .skip(skip)
        .limit(filters.limit!)
        .lean(),
      Question.countDocuments(query)
    ]);

    // Calculate comprehensive stats
    const stats = await Question.aggregate([
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          activeQuestions: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          mcqQuestions: {
            $sum: { $cond: [{ $eq: ['$type', 'mcq'] }, 1, 0] }
          },
          totalMarks: { $sum: '$marks' },
          questionsByType: {
            $push: {
              type: '$type',
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
      mcqQuestions: 0,
      totalMarks: 0,
      questionsByType: []
    };

    // Process type and difficulty stats
    const typeStats = questionStats.questionsByType.reduce((acc: any, item: any) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    const difficultyStats = questionStats.questionsByType.reduce((acc: any, item: any) => {
      acc[item.difficulty] = (acc[item.difficulty] || 0) + 1;
      return acc;
    }, {});

    const statusStats = questionStats.questionsByType.reduce((acc: any, item: any) => {
      const status = item.isActive ? 'active' : 'inactive';
      acc[status] = (acc[status] || 0) + 1;
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
          mcqQuestions: questionStats.mcqQuestions,
          totalMarks: questionStats.totalMarks,
          byType: typeStats,
          byDifficulty: difficultyStats,
          byStatus: statusStats
        }
      }
    });

  } catch (error) {
    console.error('Error fetching questions:', error);
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

    const body: CreateQuestionData = await request.json();
    
    // Validate required fields
    if (!body.question || !body.type || !body.marks || !body.difficulty) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate MCQ questions
    if (body.type === 'mcq') {
      if (!body.options || body.options.length < 2) {
        return NextResponse.json(
          { error: 'MCQ questions must have at least 2 options' },
          { status: 400 }
        );
      }
      if (body.options.length > 6) {
        return NextResponse.json(
          { error: 'MCQ questions cannot have more than 6 options' },
          { status: 400 }
        );
      }
      const correctOptions = body.options.filter(option => option.isCorrect);
      if (correctOptions.length === 0) {
        return NextResponse.json(
          { error: 'MCQ questions must have at least one correct option' },
          { status: 400 }
        );
      }
    }

    // Validate True/False questions
    if (body.type === 'true_false') {
      if (!body.options || body.options.length !== 2) {
        return NextResponse.json(
          { error: 'True/False questions must have exactly 2 options' },
          { status: 400 }
        );
      }
    }

    // Validate written questions
    if (body.type === 'written' || body.type === 'essay') {
      if (!body.correctAnswer || body.correctAnswer.trim().length === 0) {
        return NextResponse.json(
          { error: 'Written/Essay questions must have a correct answer' },
          { status: 400 }
        );
      }
    }

    // Validate timeLimit
    if (body.timeLimit !== undefined && body.timeLimit < 1) {
      return NextResponse.json(
        { error: 'Time limit must be at least 1 minute' },
        { status: 400 }
      );
    }

    // Create question
    const question = new Question({
      ...body,
      createdBy: session.user.id
    });

    await question.save();
    await question.populate('createdBy', 'name email role');
    if (question.exam) {
      await question.populate('exam', 'title');
    }

    return NextResponse.json({
      success: true,
      data: question
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
