import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { PassPaper } from '@/models/PassPaper';

// GET /api/pass-papers/[id] - Get pass paper by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;
    const passPaper = await PassPaper.findById(id).lean();
    
    if (!passPaper) {
      return NextResponse.json(
        { error: 'Pass paper not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ passPaper });

  } catch (error) {
    console.error('Get pass paper error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/pass-papers/[id] - Update pass paper
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['admin', 'instructor'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and instructors can update pass papers.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      sessionName,
      year,
      subject,
      examType,
      questionPaperUrl,
      marksPdfUrl,
      workSolutionUrl,
      description,
      tags,
      isActive
    } = body;

    await connectDB();

    // Check if pass paper exists
    const existingPaper = await PassPaper.findById(id);
    if (!existingPaper) {
      return NextResponse.json(
        { error: 'Pass paper not found' },
        { status: 404 }
      );
    }

    // Validation
    if (year !== undefined && (typeof year !== 'number' || year < 1900 || year > new Date().getFullYear() + 1)) {
      return NextResponse.json(
        { error: 'Year must be a valid number between 1900 and next year' },
        { status: 400 }
      );
    }

    // Check for duplicate if updating key fields
    if (sessionName || year || subject || examType) {
      const duplicateQuery: any = {
        _id: { $ne: id }
      };

      if (sessionName) duplicateQuery.sessionName = sessionName.trim();
      if (year) duplicateQuery.year = year;
      if (subject) duplicateQuery.subject = subject.trim();
      if (examType) duplicateQuery.examType = examType.trim();

      const duplicate = await PassPaper.findOne(duplicateQuery);
      if (duplicate) {
        return NextResponse.json(
          { error: 'A pass paper with this session, year, subject, and exam type already exists' },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: any = {};
    
    if (sessionName !== undefined) updateData.sessionName = sessionName.trim();
    if (year !== undefined) updateData.year = year;
    if (subject !== undefined) updateData.subject = subject.trim();
    if (examType !== undefined) updateData.examType = examType.trim();
    if (questionPaperUrl !== undefined) updateData.questionPaperUrl = questionPaperUrl?.trim() || null;
    if (marksPdfUrl !== undefined) updateData.marksPdfUrl = marksPdfUrl?.trim() || null;
    if (workSolutionUrl !== undefined) updateData.workSolutionUrl = workSolutionUrl?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (tags !== undefined) updateData.tags = tags?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Check if at least one paper URL exists after update
    const updatedQuestionPaperUrl = questionPaperUrl !== undefined ? questionPaperUrl?.trim() : existingPaper.questionPaperUrl;
    const updatedMarksPdfUrl = marksPdfUrl !== undefined ? marksPdfUrl?.trim() : existingPaper.marksPdfUrl;
    const updatedWorkSolutionUrl = workSolutionUrl !== undefined ? workSolutionUrl?.trim() : existingPaper.workSolutionUrl;

    if (!updatedQuestionPaperUrl && !updatedMarksPdfUrl && !updatedWorkSolutionUrl) {
      return NextResponse.json(
        { error: 'At least one paper URL (question paper, marks PDF, or work solution) is required' },
        { status: 400 }
      );
    }

    // Update pass paper
    const updatedPaper = await PassPaper.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    if (!updatedPaper) {
      return NextResponse.json(
        { error: 'Pass paper not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Pass paper updated successfully',
      passPaper: updatedPaper
    });

  } catch (error) {
    console.error('Update pass paper error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/pass-papers/[id] - Delete pass paper
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !['admin', 'instructor'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and instructors can delete pass papers.' },
        { status: 401 }
      );
    }

    await connectDB();

    const { id } = await params;
    const passPaper = await PassPaper.findByIdAndDelete(id);

    if (!passPaper) {
      return NextResponse.json(
        { error: 'Pass paper not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Pass paper deleted successfully'
    });

  } catch (error) {
    console.error('Delete pass paper error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
