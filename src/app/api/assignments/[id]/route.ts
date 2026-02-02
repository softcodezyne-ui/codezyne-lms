import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UpdateAssignmentRequest } from '@/types/assignment';

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
    
    const assignment = await Assignment.findById(id)
      .populate('createdBy', 'name email role')
      .populate('course', 'title')
      .populate('chapter', 'title')
      .populate('lesson', 'title');

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Get submission statistics for this assignment
    const submissionStats = await AssignmentSubmission.aggregate([
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

    const stats = submissionStats[0] || {
      totalSubmissions: 0,
      submittedSubmissions: 0,
      gradedSubmissions: 0,
      averageScore: 0,
      passedSubmissions: 0,
      lateSubmissions: 0
    };

    // Calculate pass rate
    const passRate = stats.gradedSubmissions > 0 
      ? (stats.passedSubmissions / stats.gradedSubmissions) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        assignment,
        stats: {
          ...stats,
          passRate
        }
      }
    });

  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignment' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const body: UpdateAssignmentRequest = await request.json();

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if user is the creator or admin
    if (assignment.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only the creator or admin can update this assignment' },
        { status: 403 }
      );
    }

    // Compute effective new values for validation
    const effectiveTotalMarks = body.totalMarks ?? assignment.totalMarks;
    const effectivePassingMarks = body.passingMarks ?? assignment.passingMarks;

    // Validate marks: ensure passingMarks never exceeds totalMarks
    if (effectivePassingMarks > effectiveTotalMarks) {
      return NextResponse.json(
        { error: 'Passing marks cannot exceed total marks' },
        { status: 400 }
      );
    }

    // If only total marks is changing, ensure it's not below existing passing marks
    if (body.totalMarks !== undefined && body.totalMarks < assignment.passingMarks) {
      return NextResponse.json(
        { error: 'Total marks cannot be less than current passing marks' },
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

    // Build minimal update object with only changed fields
    const updatableFields: Array<keyof UpdateAssignmentRequest> = [
      'title', 'description', 'instructions', 'type', 'course', 'chapter', 'lesson',
      'totalMarks', 'passingMarks', 'dueDate', 'startDate', 'isActive', 'isPublished',
      'allowLateSubmission', 'latePenaltyPercentage', 'maxAttempts', 'allowedFileTypes',
      'maxFileSize', 'attachments', 'rubric', 'isGroupAssignment', 'maxGroupSize',
      'autoGrade', 'timeLimit', 'showCorrectAnswers', 'allowReview'
    ];

    const updateData: Partial<UpdateAssignmentRequest> = {};
    for (const field of updatableFields) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        const incoming = (body as any)[field];
        const existing = (assignment as any)[field];
        const changed = (() => {
          // Compare dates by value
          if (existing instanceof Date || incoming instanceof Date) {
            const a = existing ? new Date(existing).getTime() : null;
            const b = incoming ? new Date(incoming).getTime() : null;
            return a !== b;
          }
          // Compare arrays/objects via JSON stringification
          if (typeof incoming === 'object') {
            return JSON.stringify(incoming) !== JSON.stringify(existing);
          }
          // Primitive comparison
          return incoming !== existing;
        })();
        if (changed) {
          (updateData as any)[field] = incoming;
        }
      }
    }

    // If nothing changed, return the current populated document
    if (Object.keys(updateData).length === 0) {
      const populated = await Assignment.findById(id)
        .populate('createdBy', 'name email role')
        .populate('course', 'title')
        .populate('chapter', 'title')
        .populate('lesson', 'title');
      return NextResponse.json({ success: true, data: populated, message: 'No changes detected' });
    }

    // Update assignment with minimal changed fields
    const updatedAssignment = await Assignment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email role')
      .populate('course', 'title')
      .populate('chapter', 'title')
      .populate('lesson', 'title');

    return NextResponse.json({
      success: true,
      data: updatedAssignment
    });

  } catch (error: any) {
    // Surface validation errors clearly to the client
    if (error?.name === 'ValidationError') {
      const errorsRecord = (error.errors ?? {}) as Record<string, { message?: string }>;
      const firstError = Object.values(errorsRecord)[0] as { message?: string } | undefined;
      const firstMessage = firstError?.message ?? 'Validation error';
      return NextResponse.json(
        { error: firstMessage },
        { status: 400 }
      );
    }
    console.error('Error updating assignment:', error);
    return NextResponse.json(
      { error: 'Failed to update assignment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if user is the creator or admin
    if (assignment.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only the creator or admin can delete this assignment' },
        { status: 403 }
      );
    }

    // Check if there are any submissions
    const submissionCount = await AssignmentSubmission.countDocuments({ assignment: id });
    if (submissionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete assignment with existing submissions' },
        { status: 400 }
      );
    }

    await Assignment.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Assignment deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: 'Failed to delete assignment' },
      { status: 500 }
    );
  }
}
