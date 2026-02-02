import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Chapter from '@/models/Chapter';
import Lesson from '@/models/Lesson';
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
        { success: false, error: 'Chapter ID is required' },
        { status: 400 }
      );
    }

    const chapter = await Chapter.findById(id)
      .populate('course', 'title')
      .lean();

    if (!chapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Get lesson count
    const lessonCount = await Lesson.countDocuments({ chapter: id });

    return NextResponse.json({
      success: true,
      data: {
        ...chapter,
        _id: (chapter as any)._id.toString(),
        course: typeof (chapter as any).course === 'object' 
          ? (chapter as any).course._id.toString() 
          : (chapter as any).course.toString(),
        lessonCount,
        createdAt: (chapter as any).createdAt.toISOString(),
        updatedAt: (chapter as any).updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapter' },
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
        { success: false, error: 'Chapter ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, description, order, isPublished } = body;

    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Check if order is unique within the course (if order is being updated)
    if (order && order !== chapter.order) {
      const existingChapter = await Chapter.findOne({
        course: chapter.course,
        order,
        _id: { $ne: id },
      });

      if (existingChapter) {
        return NextResponse.json(
          { success: false, error: 'Chapter order must be unique within a course' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const updatedChapter = await Chapter.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('course', 'title');

    return NextResponse.json({
      success: true,
      data: {
        ...updatedChapter.toObject(),
        _id: (updatedChapter as any)._id.toString(),
        course: typeof (updatedChapter as any).course === 'object' 
          ? (updatedChapter as any).course._id.toString() 
          : (updatedChapter as any).course.toString(),
        createdAt: (updatedChapter as any).createdAt.toISOString(),
        updatedAt: (updatedChapter as any).updatedAt.toISOString(),
      },
      message: 'Chapter updated successfully',
    });
  } catch (error) {
    console.error('Error updating chapter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update chapter' },
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
        { success: false, error: 'Chapter ID is required' },
        { status: 400 }
      );
    }

    const chapter = await Chapter.findById(id);
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter not found' },
        { status: 404 }
      );
    }

    // Check if chapter has lessons
    const lessonCount = await Lesson.countDocuments({ chapter: id });
    if (lessonCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete chapter with existing lessons' },
        { status: 400 }
      );
    }

    await Chapter.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Chapter deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete chapter' },
      { status: 500 }
    );
  }
}
