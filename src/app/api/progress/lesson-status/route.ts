import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UserProgress from '@/models/UserProgress';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course');
    const lessonId = searchParams.get('lesson');

    if (!courseId || !lessonId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Course ID and Lesson ID are required' 
      }, { status: 400 });
    }

    // Find the specific lesson progress
    const lessonProgress = await UserProgress.findOne({
      user: session.user.id,
      course: courseId,
      lesson: lessonId
    }).populate('lesson', 'title order chapter');

    if (!lessonProgress) {
      return NextResponse.json({
        success: true,
        data: {
          isCompleted: false,
          progressPercentage: 0,
          timeSpent: 0,
          completedAt: null,
          lastAccessedAt: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        isCompleted: lessonProgress.isCompleted,
        progressPercentage: lessonProgress.progressPercentage,
        timeSpent: lessonProgress.timeSpent,
        completedAt: lessonProgress.completedAt,
        lastAccessedAt: lessonProgress.lastAccessedAt,
        lesson: {
          id: lessonProgress.lesson._id.toString(),
          title: lessonProgress.lesson.title,
          order: lessonProgress.lesson.order
        }
      }
    });

  } catch (error) {
    console.error('Error fetching lesson status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lesson status' },
      { status: 500 }
    );
  }
}
