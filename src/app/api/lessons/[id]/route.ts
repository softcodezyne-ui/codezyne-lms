import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Lesson from '@/models/Lesson';
import connectDB from '@/lib/mongodb';
// Extract a YouTube video ID from either a full URL or a raw ID
function extractYouTubeId(input?: string | null): string | undefined {
  if (!input) return undefined;
  const value = String(input).trim();
  if (!value) return undefined;
  if (/^[a-zA-Z0-9_-]{8,20}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const v = url.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{8,20}$/.test(v)) return v;
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.hostname.includes('youtu.be') && parts[0] && /^[a-zA-Z0-9_-]{8,20}$/.test(parts[0])) return parts[0];
    const embedIdx = parts.indexOf('embed');
    if (embedIdx >= 0 && parts[embedIdx + 1] && /^[a-zA-Z0-9_-]{8,20}$/.test(parts[embedIdx + 1])) return parts[embedIdx + 1];
  } catch (_) {}
  return undefined;
}

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
        { success: false, error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    const lesson = await Lesson.findById(id)
      .populate('chapter', 'title order')
      .populate('course', 'title')
      .lean();

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...lesson,
        _id: (lesson as any)._id.toString(),
        chapter: (lesson as any).chapter.toString(),
        course: (lesson as any).course.toString(),
        createdAt: (lesson as any).createdAt.toISOString(),
        updatedAt: (lesson as any).updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lesson' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      content,
      order,
      duration,
      youtubeVideoId,
      videoUrl,
      videoDuration,
      attachments,
      isPublished,
      isFree,
    } = body;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Check if order is unique within the chapter (if order is being updated)
    if (order && order !== lesson.order) {
      const existingLesson = await Lesson.findOne({
        chapter: lesson.chapter,
        order,
        _id: { $ne: id },
      });

      if (existingLesson) {
        return NextResponse.json(
          { success: false, error: 'Lesson order must be unique within a chapter' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (order !== undefined) updateData.order = order;
    if (duration !== undefined) updateData.duration = duration;
    if (youtubeVideoId !== undefined) {
      const normalizedYouTubeId = extractYouTubeId(youtubeVideoId) ?? undefined;
      updateData.youtubeVideoId = normalizedYouTubeId;
    }
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (videoDuration !== undefined) updateData.videoDuration = videoDuration;
    if (attachments !== undefined) updateData.attachments = attachments;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (isFree !== undefined) updateData.isFree = isFree;

    const updatedLesson = await Lesson.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('chapter', 'title order')
      .populate('course', 'title');

    return NextResponse.json({
      success: true,
      data: {
        ...updatedLesson.toObject(),
        _id: (updatedLesson as any)._id.toString(),
        chapter: (updatedLesson as any).chapter.toString(),
        course: (updatedLesson as any).course.toString(),
        createdAt: (updatedLesson as any).createdAt.toISOString(),
        updatedAt: (updatedLesson as any).updatedAt.toISOString(),
      },
      message: 'Lesson updated successfully',
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lesson' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 }
      );
    }

    await Lesson.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Lesson deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete lesson' },
      { status: 500 }
    );
  }
}
