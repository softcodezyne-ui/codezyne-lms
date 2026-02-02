import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { PassPaper } from '@/models/PassPaper';
import { PassPaperResponse } from '@/types/pass-paper';

// GET /api/pass-papers - Get all pass papers with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const sessionName = searchParams.get('sessionName');
    const year = searchParams.get('year');
    const subject = searchParams.get('subject');
    const examType = searchParams.get('examType');
    const paperType = searchParams.get('paperType');
    const isActive = searchParams.get('isActive');
    const uploadedBy = searchParams.get('uploadedBy');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { sessionName: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { examType: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    if (sessionName) {
      query.sessionName = { $regex: sessionName, $options: 'i' };
    }

    if (year) {
      query.year = parseInt(year);
    }

    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    if (examType) {
      query.examType = { $regex: examType, $options: 'i' };
    }

    if (paperType) {
      switch (paperType) {
        case 'question_paper':
          query.questionPaperUrl = { $exists: true, $ne: '' };
          break;
        case 'marks_pdf':
          query.marksPdfUrl = { $exists: true, $ne: '' };
          break;
        case 'work_solution':
          query.workSolutionUrl = { $exists: true, $ne: '' };
          break;
      }
    }

    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (uploadedBy) {
      query.uploadedBy = uploadedBy;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [passPapers, total] = await Promise.all([
      PassPaper.find(query)
        .populate('course', 'title')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PassPaper.countDocuments(query)
    ]);

    return NextResponse.json({
      passPapers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    } as PassPaperResponse);

  } catch (error) {
    console.error('Get pass papers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/pass-papers - Create new pass paper
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['admin', 'instructor'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and instructors can create pass papers.' },
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log('Received pass paper data:', body);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const {
      course,
      sessionName,
      year,
      subject,
      examType,
      questionPaperUrl,
      marksPdfUrl,
      workSolutionUrl,
      description,
      tags,
      isActive = true
    } = body;

    // Validation
    if (!course || typeof course !== 'string' || course === 'none') {
      return NextResponse.json(
        { error: 'Course is required' },
        { status: 400 }
      );
    }
    if (!sessionName || !year || !subject || !examType) {
      return NextResponse.json(
        { error: 'Session name, year, subject, and exam type are required' },
        { status: 400 }
      );
    }

    if (typeof year !== 'number' || year < 1900 || year > new Date().getFullYear() + 1) {
      return NextResponse.json(
        { error: 'Year must be a valid number between 1900 and next year' },
        { status: 400 }
      );
    }

    // All PDFs are optional - no validation needed

    await connectDB();

    // Check for duplicate pass paper
    const existingPaper = await PassPaper.findOne({
      course,
      sessionName: sessionName.trim(),
      year,
      subject: subject.trim(),
      examType: examType.trim()
    });

    if (existingPaper) {
      return NextResponse.json(
        { error: 'A pass paper with this session, year, subject, and exam type already exists' },
        { status: 409 }
      );
    }

    // Create new pass paper
    try {
      const passPaper = new PassPaper({
        course,
        sessionName: sessionName.trim(),
        year,
        subject: subject.trim(),
        examType: examType.trim(),
        questionPaperUrl: questionPaperUrl?.trim() || undefined,
        marksPdfUrl: marksPdfUrl?.trim() || undefined,
        workSolutionUrl: workSolutionUrl?.trim() || undefined,
        description: description?.trim() || undefined,
        tags: tags?.trim() || undefined,
        isActive,
        uploadedBy: session.user.email
      });

      console.log('Creating pass paper with data:', {
        course,
        sessionName: sessionName.trim(),
        year,
        subject: subject.trim(),
        examType: examType.trim(),
        questionPaperUrl: questionPaperUrl?.trim(),
        marksPdfUrl: marksPdfUrl?.trim(),
        workSolutionUrl: workSolutionUrl?.trim(),
        description: description?.trim(),
        tags: tags?.trim(),
        isActive,
        uploadedBy: session.user.email
      });

      await passPaper.save();
      console.log('Pass paper created successfully:', passPaper._id);

      return NextResponse.json({
        message: 'Pass paper created successfully',
        passPaper: passPaper.toObject()
      }, { status: 201 });
    } catch (dbError) {
      console.error('Database error creating pass paper:', dbError);
      return NextResponse.json(
        { error: 'Failed to create pass paper in database' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Create pass paper error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
