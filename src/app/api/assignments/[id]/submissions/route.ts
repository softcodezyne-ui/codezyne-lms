import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CreateSubmissionRequest, SubmissionFilters } from '@/types/assignment';

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
    
    // Check if assignment exists
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if user has access to view submissions
    const isCreator = assignment.createdBy.toString() === session.user.id;
    const isAdmin = session.user.role === 'admin';
    const isStudent = session.user.role === 'student';

    if (!isCreator && !isAdmin && !isStudent) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters: SubmissionFilters = {
      student: searchParams.get('student') || undefined,
      status: (searchParams.get('status') as any) || 'all',
      isLate: searchParams.get('isLate') ? searchParams.get('isLate') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: (searchParams.get('sortBy') as any) || 'submittedAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
    };

    // Build query
    const query: any = { assignment: id };
    
    if (filters.student) {
      query.student = filters.student;
    }
    
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    
    if (filters.isLate !== undefined) {
      query.isLate = filters.isLate;
    }

    // If student, only show their own submissions
    if (isStudent) {
      query.student = session.user.id;
    }

    // Calculate pagination
    const skip = (filters.page! - 1) * filters.limit!;
    
    // Build sort
    const sort: any = {};
    sort[filters.sortBy!] = filters.sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [submissions, total] = await Promise.all([
      AssignmentSubmission.find(query)
        .populate('student', 'name email')
        .populate('groupMembers', 'name email')
        .populate('gradedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(filters.limit!)
        .lean(),
      AssignmentSubmission.countDocuments(query)
    ]);

    // Calculate statistics
    const stats = await AssignmentSubmission.aggregate([
      { $match: { assignment: assignment._id } },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          submittedSubmissions: {
            $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] }
          },
          gradedSubmissions: {
            $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] }
          },
          averageScore: {
            $avg: { $cond: [{ $eq: ['$status', 'graded'] }, '$score', null] }
          },
          passedSubmissions: {
            $sum: { $cond: [{ $and: [{ $eq: ['$status', 'graded'] }, { $gte: ['$score', { $multiply: ['$maxScore', 0.5] }] }] }, 1, 0] }
          },
          lateSubmissions: {
            $sum: { $cond: [{ $eq: ['$isLate', true] }, 1, 0] }
          }
        }
      }
    ]);

    const submissionStats = stats[0] || {
      totalSubmissions: 0,
      submittedSubmissions: 0,
      gradedSubmissions: 0,
      averageScore: 0,
      passedSubmissions: 0,
      lateSubmissions: 0
    };

    // Calculate pass rate
    const passRate = submissionStats.gradedSubmissions > 0 
      ? (submissionStats.passedSubmissions / submissionStats.gradedSubmissions) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          pages: Math.ceil(total / filters.limit!)
        },
        stats: {
          ...submissionStats,
          passRate
        }
      }
    });

  } catch (error) {
    console.error('Error fetching assignment submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment submissions' },
      { status: 500 }
    );
  }
}

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
    const body: CreateSubmissionRequest = await request.json();

    // Check if assignment exists
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if assignment is published and active
    if (!assignment.isPublished || !assignment.isActive) {
      return NextResponse.json(
        { error: 'Assignment is not available for submission' },
        { status: 400 }
      );
    }

    // Check if assignment is within submission period
    const now = new Date();
    if (assignment.startDate && now < assignment.startDate) {
      return NextResponse.json(
        { error: 'Assignment submission period has not started yet' },
        { status: 400 }
      );
    }

    if (assignment.dueDate && now > assignment.dueDate && !assignment.allowLateSubmission) {
      return NextResponse.json(
        { error: 'Assignment submission deadline has passed' },
        { status: 400 }
      );
    }

    // Check if student has reached max attempts
    const existingSubmissions = await AssignmentSubmission.countDocuments({
      assignment: id,
      student: session.user.id
    });

    if (existingSubmissions >= assignment.maxAttempts) {
      return NextResponse.json(
        { error: 'Maximum number of attempts reached' },
        { status: 400 }
      );
    }

    // Check if assignment is late
    const isLate = assignment.dueDate && now > assignment.dueDate;

    // Create submission
    const submission = new AssignmentSubmission({
      assignment: id,
      student: session.user.id,
      content: body.content,
      files: body.files,
      answers: body.answers,
      status: 'submitted',
      submittedAt: new Date(),
      maxScore: assignment.totalMarks,
      isLate,
      attemptNumber: existingSubmissions + 1,
      timeSpent: body.timeSpent,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    });

    await submission.save();
    await submission.populate('student', 'name email');
    await submission.populate('groupMembers', 'name email');

    return NextResponse.json({
      success: true,
      data: submission
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating assignment submission:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment submission' },
      { status: 500 }
    );
  }
}
