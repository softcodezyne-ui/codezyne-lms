import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AssignmentFilters, CreateAssignmentRequest } from '@/types/assignment';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filters: AssignmentFilters = {
      search: searchParams.get('search') || undefined,
      type: (searchParams.get('type') as any) || 'all',
      status: (searchParams.get('status') as any) || 'all',
      course: searchParams.get('course') || undefined,
      createdBy: searchParams.get('createdBy') || undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      isPublished: searchParams.get('isPublished') ? searchParams.get('isPublished') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
    };

    // Build query
    const query: any = {};
    
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { instructions: { $regex: filters.search, $options: 'i' } }
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
            { startDate: { $lte: now }, dueDate: { $gte: now } },
            { startDate: { $exists: false }, dueDate: { $exists: false } }
          ];
          break;
        case 'expired':
          query.dueDate = { $lt: now };
          break;
        case 'inactive':
          query.isActive = false;
          break;
      }
    }
    
    if (filters.course) {
      query.course = filters.course;
    }
    
    if (filters.createdBy) {
      query.createdBy = filters.createdBy;
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
    const [assignments, total] = await Promise.all([
      Assignment.find(query)
        .populate('createdBy', 'name email role')
        .populate('course', 'title')
        .populate('chapter', 'title')
        .populate('lesson', 'title')
        .sort(sort)
        .skip(skip)
        .limit(filters.limit!)
        .lean(),
      Assignment.countDocuments(query)
    ]);

    // Get submission counts for each assignment
    const assignmentIds = assignments.map(a => (a as any)._id);
    const submissionCounts = await AssignmentSubmission.aggregate([
      { $match: { assignment: { $in: assignmentIds } } },
      { $group: { _id: '$assignment', count: { $sum: 1 } } }
    ]);

    const submissionCountMap = submissionCounts.reduce((acc: any, item: any) => {
      acc[item._id.toString()] = item.count;
      return acc;
    }, {});

    // Add submission counts to assignments
    const assignmentsWithCounts = assignments.map((assignment: any) => ({
      ...assignment,
      submissionCount: submissionCountMap[String(assignment._id)] || 0
    }));

    // Calculate comprehensive stats
    const stats = await Assignment.aggregate([
      {
        $group: {
          _id: null,
          totalAssignments: { $sum: 1 },
          publishedAssignments: {
            $sum: { $cond: [{ $eq: ['$isPublished', true] }, 1, 0] }
          },
          draftAssignments: {
            $sum: { $cond: [{ $eq: ['$isPublished', false] }, 1, 0] }
          },
          activeAssignments: {
            $sum: { $cond: [{ $and: [{ $eq: ['$isActive', true] }, { $eq: ['$isPublished', true] }] }, 1, 0] }
          },
          assignmentsByType: {
            $push: {
              type: '$type',
              isPublished: '$isPublished',
              isActive: '$isActive'
            }
          }
        }
      }
    ]);

    const assignmentStats = stats[0] || {
      totalAssignments: 0,
      publishedAssignments: 0,
      draftAssignments: 0,
      activeAssignments: 0,
      assignmentsByType: []
    };

    // Process type statistics
    const typeStats = assignmentStats.assignmentsByType.reduce((acc: any, item: any) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    // Get submission statistics
    const submissionStats = await AssignmentSubmission.aggregate([
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
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

    const submissionData = submissionStats[0] || {
      totalSubmissions: 0,
      gradedSubmissions: 0,
      averageScore: 0,
      passedSubmissions: 0,
      lateSubmissions: 0
    };

    // Calculate pass rate
    const passRate = submissionData.gradedSubmissions > 0 
      ? (submissionData.passedSubmissions / submissionData.gradedSubmissions) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        assignments: assignmentsWithCounts,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          pages: Math.ceil(total / filters.limit!)
        },
        stats: {
          totalAssignments: assignmentStats.totalAssignments,
          publishedAssignments: assignmentStats.publishedAssignments,
          draftAssignments: assignmentStats.draftAssignments,
          activeAssignments: assignmentStats.activeAssignments,
          totalSubmissions: submissionData.totalSubmissions,
          gradedSubmissions: submissionData.gradedSubmissions,
          averageScore: submissionData.averageScore || 0,
          passRate: passRate,
          lateSubmissions: submissionData.lateSubmissions,
          assignmentsByType: typeStats
        }
      }
    });

  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
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

    // Check if user is instructor or admin
    if (!['instructor', 'admin'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Only instructors and admins can create assignments' },
        { status: 403 }
      );
    }

    const body: CreateAssignmentRequest = await request.json();
    
    // Validate required fields
    if (!body.title || !body.type || !body.course || !body.totalMarks || !body.passingMarks) {
      return NextResponse.json(
        { error: 'Missing required fields: title, type, course, totalMarks, passingMarks' },
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

    // Validate dates
    if (body.startDate && body.dueDate) {
      const startDate = new Date(body.startDate);
      const dueDate = new Date(body.dueDate);
      if (startDate >= dueDate) {
        return NextResponse.json(
          { error: 'Start date must be before due date' },
          { status: 400 }
        );
      }
    }

    // Validate group assignment settings
    if (body.isGroupAssignment && (!body.maxGroupSize || body.maxGroupSize < 2)) {
      return NextResponse.json(
        { error: 'Group assignments must have maxGroupSize of at least 2' },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = new Assignment({
      ...body,
      createdBy: session.user.id,
      maxAttempts: body.maxAttempts || 1,
      allowLateSubmission: body.allowLateSubmission || false,
      isGroupAssignment: body.isGroupAssignment || false,
      autoGrade: body.autoGrade || false,
      showCorrectAnswers: body.showCorrectAnswers !== false,
      allowReview: body.allowReview !== false
    });

    await assignment.save();
    await assignment.populate('createdBy', 'name email role');
    await assignment.populate('course', 'title');
    if (body.chapter) {
      await assignment.populate('chapter', 'title');
    }
    if (body.lesson) {
      await assignment.populate('lesson', 'title');
    }

    return NextResponse.json({
      success: true,
      data: assignment
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}
