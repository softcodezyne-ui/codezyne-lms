import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GradeSubmissionRequest } from '@/types/assignment';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, submissionId } = await params;
    const body: GradeSubmissionRequest = await request.json();

    // Check if assignment exists
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
        { error: 'Only the assignment creator or admin can grade submissions' },
        { status: 403 }
      );
    }

    // Check if submission exists
    const submission = await AssignmentSubmission.findOne({
      _id: submissionId,
      assignment: id
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    // Validate score
    if (body.score < 0 || body.score > assignment.totalMarks) {
      return NextResponse.json(
        { error: `Score must be between 0 and ${assignment.totalMarks}` },
        { status: 400 }
      );
    }

    // Validate rubric scores if provided
    if (body.rubricScores && assignment.rubric && assignment.rubric.length > 0) {
      const totalRubricMarks = assignment.rubric.reduce(
        (sum: number, item: { marks: number }) => sum + item.marks,
        0
      );
      const providedRubricMarks = body.rubricScores.reduce(
        (sum: number, item: { score: number }) => sum + item.score,
        0
      );
      
      if (Math.abs(totalRubricMarks - providedRubricMarks) > 0.01) {
        return NextResponse.json(
          { error: 'Rubric scores do not match assignment rubric' },
          { status: 400 }
        );
      }

      // Validate individual rubric scores
      for (const rubricScore of body.rubricScores) {
        const rubricItem = assignment.rubric.find(
          (r: { criteria: string; marks: number }) => r.criteria === rubricScore.criteria
        );
        if (!rubricItem) {
          return NextResponse.json(
            { error: `Invalid rubric criteria: ${rubricScore.criteria}` },
            { status: 400 }
          );
        }
        
        if (rubricScore.score < 0 || rubricScore.score > rubricItem.marks) {
          return NextResponse.json(
            { error: `Score for ${rubricScore.criteria} must be between 0 and ${rubricItem.marks}` },
            { status: 400 }
          );
        }
      }
    }

    // Update submission
    const updatedSubmission = await AssignmentSubmission.findByIdAndUpdate(
      submissionId,
      {
        score: body.score,
        feedback: body.feedback,
        rubricScores: body.rubricScores,
        status: 'graded',
        gradedAt: new Date(),
        gradedBy: session.user.id
      },
      { new: true, runValidators: true }
    )
      .populate('student', 'name email')
      .populate('groupMembers', 'name email')
      .populate('gradedBy', 'name email');

    return NextResponse.json({
      success: true,
      data: updatedSubmission
    });

  } catch (error) {
    console.error('Error grading assignment submission:', error);
    return NextResponse.json(
      { error: 'Failed to grade assignment submission' },
      { status: 500 }
    );
  }
}
