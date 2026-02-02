import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Assignment from '@/models/Assignment';
import AssignmentSubmission from '@/models/AssignmentSubmission';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, submissionId } = await params;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Only admin or assignment creator can delete submissions
    if (assignment.createdBy.toString() !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only the assignment creator or admin can delete submissions' },
        { status: 403 }
      );
    }

    const submission = await AssignmentSubmission.findOne({
      _id: submissionId,
      assignment: id,
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    await AssignmentSubmission.findByIdAndDelete(submissionId);

    return NextResponse.json({
      success: true,
      data: { deleted: true },
      message: 'Submission deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    );
  }
}
