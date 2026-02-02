import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import Course from '@/models/Course';
import User from '@/models/User';
import { AssignmentFilters } from '@/types/assignment';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an instructor
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'instructor') {
      return NextResponse.json({ error: 'Forbidden - Instructor access required' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const course = searchParams.get('course') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object
    const filter: any = {
      createdBy: session.user.id // Only show assignments created by this instructor
    };

    // Add search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add type filter
    if (type !== 'all') {
      filter.type = type;
    }

    // Add status filter
    if (status !== 'all') {
      if (status === 'published') {
        filter.isPublished = true;
      } else if (status === 'draft') {
        filter.isPublished = false;
      } else if (status === 'active') {
        filter.isActive = true;
      } else if (status === 'inactive') {
        filter.isActive = false;
      } else if (status === 'scheduled') {
        filter.startDate = { $gt: new Date() };
      } else if (status === 'expired') {
        filter.dueDate = { $lt: new Date() };
      }
    }

    // Add course filter
    if (course !== 'all') {
      filter.course = course;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get assignments with pagination
    const assignments = await Assignment.find(filter)
      .populate('course', 'title')
      .populate('createdBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await Assignment.countDocuments(filter);

    // Calculate stats
    const totalAssignments = await Assignment.countDocuments({ createdBy: session.user.id });
    const publishedAssignments = await Assignment.countDocuments({ 
      createdBy: session.user.id, 
      isPublished: true 
    });
    const draftAssignments = await Assignment.countDocuments({ 
      createdBy: session.user.id, 
      isPublished: false 
    });
    const activeAssignments = await Assignment.countDocuments({ 
      createdBy: session.user.id, 
      isActive: true 
    });

    // Get assignments by type
    const assignmentsByType = await Assignment.aggregate([
      { $match: { createdBy: session.user.id } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const typeStats = assignmentsByType.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Build submission stats for all this instructor's assignments
    const allInstructorAssignmentIds = await Assignment.find({ createdBy: session.user.id }).distinct('_id');
    let submissionStatsAgg: any[] = [];
    if (allInstructorAssignmentIds.length > 0) {
      submissionStatsAgg = await AssignmentSubmission.aggregate([
        { $match: { assignment: { $in: allInstructorAssignmentIds } } },
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            gradedSubmissions: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } },
            averageScore: { $avg: { $cond: [{ $eq: ['$status', 'graded'] }, '$score', null] } },
            passedSubmissions: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'graded'] }, { $gte: ['$score', { $multiply: ['$maxScore', 0.5] }] }] }, 1, 0] } },
            lateSubmissions: { $sum: { $cond: [{ $eq: ['$isLate', true] }, 1, 0] } }
          }
        }
      ]);
    }

    const submissionStats = submissionStatsAgg[0] || {
      totalSubmissions: 0,
      gradedSubmissions: 0,
      averageScore: 0,
      passedSubmissions: 0,
      lateSubmissions: 0
    };
    const passRate = submissionStats.gradedSubmissions > 0
      ? (submissionStats.passedSubmissions / submissionStats.gradedSubmissions) * 100
      : 0;

    const stats = {
      totalAssignments,
      publishedAssignments,
      draftAssignments,
      activeAssignments,
      assignmentsByType: typeStats,
      totalSubmissions: submissionStats.totalSubmissions,
      gradedSubmissions: submissionStats.gradedSubmissions,
      averageScore: submissionStats.averageScore || 0,
      passRate,
      lateSubmissions: submissionStats.lateSubmissions
    };

    return NextResponse.json({
      success: true,
      data: {
        assignments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching instructor assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}