import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UserProgress from '@/models/UserProgress';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Progress ID is required' },
        { status: 400 }
      );
    }

    const progress = await UserProgress.findById(id)
      .populate('user', 'name email')
      .populate('course', 'title')
      .populate('lesson', 'title duration')
      .lean();

    if (!progress) {
      return NextResponse.json(
        { success: false, error: 'Progress not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...progress,
        _id: (progress as any)._id.toString(),
        user: (progress as any).user.toString(),
        course: (progress as any).course.toString(),
        lesson: (progress as any).lesson.toString(),
        createdAt: (progress as any).createdAt.toISOString(),
        updatedAt: (progress as any).updatedAt.toISOString(),
        completedAt: (progress as any).completedAt?.toISOString(),
        lastAccessedAt: (progress as any).lastAccessedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Progress ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isCompleted, progressPercentage, timeSpent } = body;

    const progress = await UserProgress.findById(id);
    if (!progress) {
      return NextResponse.json(
        { success: false, error: 'Progress not found' },
        { status: 404 }
      );
    }

    // Check if user owns this progress
    if (progress.user.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update this progress' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
    if (progressPercentage !== undefined) updateData.progressPercentage = progressPercentage;
    if (timeSpent !== undefined) updateData.timeSpent = timeSpent;
    updateData.lastAccessedAt = new Date();

    const updatedProgress = await UserProgress.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email')
     .populate('course', 'title')
     .populate('lesson', 'title duration');

    return NextResponse.json({
      success: true,
      data: {
        ...updatedProgress.toObject(),
        _id: updatedProgress._id.toString(),
        user: (updatedProgress as any).user.toString(),
        course: (updatedProgress as any).course.toString(),
        lesson: (updatedProgress as any).lesson.toString(),
        createdAt: updatedProgress.createdAt.toISOString(),
        updatedAt: updatedProgress.updatedAt.toISOString(),
        completedAt: (updatedProgress as any).completedAt?.toISOString(),
        lastAccessedAt: (updatedProgress as any).lastAccessedAt.toISOString(),
      },
      message: 'Progress updated successfully',
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Progress ID is required' },
        { status: 400 }
      );
    }

    const progress = await UserProgress.findById(id);
    if (!progress) {
      return NextResponse.json(
        { success: false, error: 'Progress not found' },
        { status: 404 }
      );
    }

    // Check if user owns this progress
    if (progress.user.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to delete this progress' },
        { status: 403 }
      );
    }

    await UserProgress.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Progress deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete progress' },
      { status: 500 }
    );
  }
}
