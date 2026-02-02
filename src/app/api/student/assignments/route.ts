import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import Enrollment from '@/models/Enrollment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const course = searchParams.get('course');
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = (searchParams.get('sortBy') || 'dueDate') as 'dueDate' | 'createdAt' | 'title';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

    // Get enrolled courses
    const enrollments = await Enrollment.find({ 
      student: session.user.id, 
      status: 'active' 
    }).select('course');

    const enrolledCourseIds = enrollments.map(e => e.course);

    if (enrolledCourseIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          assignments: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          }
        }
      });
    }

    // Build query: show assignments in enrolled courses that are active.
    // We only require isActive so assignments show even if isPublished was not set (defaults to false in schema).
    const query: any = {
      course: { $in: enrolledCourseIds },
      isActive: true
    };

    if (course) {
      query.course = course;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    // Filter by status
    const now = new Date();
    switch (status) {
      case 'upcoming':
        query.startDate = { $gt: now };
        break;
      case 'active':
        query.$or = [
          { startDate: { $lte: now }, dueDate: { $gte: now } },
          { startDate: { $exists: false }, dueDate: { $exists: false } }
        ];
        break;
      case 'overdue':
        query.dueDate = { $lt: now };
        break;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    // Provide a stable secondary sort
    if (sortBy !== 'createdAt') {
      sort.createdAt = -1;
    }

    // Execute query
    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .populate('course', 'title')
        .populate('chapter', 'title')
        .populate('lesson', 'title')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Assignment.countDocuments(query)
    ]);

    // Get submission status for each assignment
    const assignmentIds = assignments.map(a => a._id);
    const submissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds },
      student: session.user.id
    }).select('assignment status score maxScore isLate submittedAt attemptNumber');

    const submissionMap = submissions.reduce((acc: any, sub: any) => {
      const assignmentId = sub.assignment.toString();
      if (!acc[assignmentId]) {
        acc[assignmentId] = [];
      }
      acc[assignmentId].push(sub);
      return acc;
    }, {});

    // Add submission info to assignments
    const assignmentsWithSubmissions = assignments.map((assignment: any) => {
      const assignmentSubmissions = submissionMap[String(assignment._id)] || [];
      const latestSubmission = assignmentSubmissions.sort((a: any, b: any) => 
        new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime()
      )[0];

      return {
        ...assignment,
        submissionStatus: latestSubmission ? latestSubmission.status : 'not_started',
        latestScore: latestSubmission ? latestSubmission.score : null,
        maxScore: latestSubmission ? latestSubmission.maxScore : assignment.totalMarks,
        isLate: latestSubmission ? latestSubmission.isLate : false,
        submittedAt: latestSubmission ? latestSubmission.submittedAt : null,
        attemptNumber: latestSubmission ? latestSubmission.attemptNumber : 0,
        canSubmit: assignment.maxAttempts > (latestSubmission ? latestSubmission.attemptNumber : 0),
        isOverdue: assignment.dueDate && new Date(assignment.dueDate) < now
      };
    });

    // Build student-level stats
    const totalAssignments = total;
    const studentTotalSubmissions = submissions.length;
    const studentGradedSubmissions = submissions.filter((s: any) => s.status === 'graded').length;
    const studentAverageScore = (() => {
      const graded = submissions.filter((s: any) => s.status === 'graded' && typeof s.score === 'number');
      if (graded.length === 0) return 0;
      const sum = graded.reduce((acc: number, s: any) => acc + s.score, 0);
      return sum / graded.length;
    })();
    const studentPassed = submissions.filter((s: any) => s.status === 'graded' && typeof s.score === 'number' && s.score >= (s.maxScore * 0.5)).length;
    const studentPassRate = studentGradedSubmissions > 0 ? (studentPassed / studentGradedSubmissions) * 100 : 0;
    const studentLateSubmissions = submissions.filter((s: any) => s.isLate).length;

    return NextResponse.json({
      success: true,
      data: {
        assignments: assignmentsWithSubmissions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          totalAssignments,
          totalSubmissions: studentTotalSubmissions,
          gradedSubmissions: studentGradedSubmissions,
          averageScore: studentAverageScore,
          passRate: studentPassRate,
          lateSubmissions: studentLateSubmissions
        }
      }
    });

  } catch (error) {
    console.error('Error fetching student assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
