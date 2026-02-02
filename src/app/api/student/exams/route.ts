import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Exam from '@/models/Exam';
import ExamAttempt from '@/models/ExamAttempt';
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
    const course = searchParams.get('course');
    const status = searchParams.get('status');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    // Ensure referenced models are registered for population
    // These imports register schemas on the active mongoose connection
    await import('@/models/Course');
    await import('@/models/User');

    // Build query for published and active exams
    const query: any = {
      isPublished: true,
      isActive: true
    };

    // Filter by course if specified
    if (course && course !== 'all') {
      query.course = course;
    }

    // Optional search on title/description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    console.log('Student Exams API - Query:', JSON.stringify(query, null, 2));

    // Get exams with populated fields
    const total = await Exam.countDocuments(query);

    let exams = await Exam.find(query)
      .populate('createdBy', 'name email')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    console.log('Student Exams API - Found exams with query:', exams.length);

    // If no exams found with the strict query, let's try a more permissive approach
    if (exams.length === 0) {
      console.log('Student Exams API - No exams found with strict query, trying permissive query...');
      const permissiveQuery = { isPublished: true };
      exams = await Exam.find(permissiveQuery)
        .populate('createdBy', 'name email')
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .lean();
      console.log('Student Exams API - Found exams with permissive query:', exams.length);
    }

    console.log('Student Exams API - Final exam details:', exams.map(exam => ({
      id: exam._id,
      title: exam.title,
      isPublished: exam.isPublished,
      isActive: exam.isActive,
      startDate: exam.startDate,
      endDate: exam.endDate
    })));

    // Get all exam attempts for this student
    const studentAttempts = await ExamAttempt.find({
      student: session.user.id,
      status: 'completed'
    }).select('exam').lean();

    // Create a set of exam IDs that the student has already completed
    const completedExamIds = new Set(
      studentAttempts.map((attempt: any) => attempt.exam?.toString())
    );

    // Filter out exams that the student has already completed
    const availableExams = exams.filter(exam => {
      const examId = exam._id?.toString();
      return !completedExamIds.has(examId);
    });

    // Add question count to each exam
    const examsWithQuestionCount = availableExams.map(exam => ({
      ...exam,
      questionCount: exam.questions ? exam.questions.length : 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        exams: examsWithQuestionCount,
        pagination: {
          page,
          limit,
          total: availableExams.length,
          pages: Math.ceil(availableExams.length / limit)
        },
        stats: {
          availableExams: availableExams.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching student exams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
      { status: 500 }
    );
  }
}
