import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ChapterProgress from '@/models/ChapterProgress';
import UserProgress from '@/models/UserProgress';
import Lesson from '@/models/Lesson';
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
    const chapterId = searchParams.get('chapter');

    if (!courseId || !chapterId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Course ID and Chapter ID are required' 
      }, { status: 400 });
    }

    // Find the specific chapter progress
    const chapterProgress = await ChapterProgress.findOne({
      user: session.user.id,
      course: courseId,
      chapter: chapterId
    }).populate('chapter', 'title order');

    // Get all lessons in this chapter
    const chapterLessons = await Lesson.find({
      course: courseId,
      chapter: chapterId,
      isPublished: true
    }).sort({ order: 1 });

    // Get lesson progress for this chapter
    const lessonProgress = await UserProgress.find({
      user: session.user.id,
      course: courseId,
      lesson: { $in: chapterLessons.map(l => l._id) }
    }).populate('lesson', 'title order');

    // Calculate completion stats
    const totalLessons = chapterLessons.length;
    const completedLessons = lessonProgress.filter(lp => lp.isCompleted).length;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const isCompleted = completedLessons === totalLessons && totalLessons > 0;

    // Calculate total time spent in chapter
    const totalTimeSpent = lessonProgress.reduce((sum, lp) => sum + (lp.timeSpent || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        isCompleted: chapterProgress?.isCompleted || isCompleted,
        progressPercentage: chapterProgress?.progressPercentage || progressPercentage,
        totalLessons,
        completedLessons,
        totalTimeSpent: chapterProgress?.totalTimeSpent || totalTimeSpent,
        completedAt: chapterProgress?.completedAt,
        lastAccessedAt: chapterProgress?.lastAccessedAt,
        chapter: {
          id: chapterId,
          title: chapterProgress?.chapter?.title || 'Unknown Chapter',
          order: chapterProgress?.chapter?.order || 0
        },
        lessons: chapterLessons.map(lesson => {
          const lessonProg = lessonProgress.find(lp => lp.lesson._id.toString() === lesson._id.toString());
          return {
            id: lesson._id.toString(),
            title: lesson.title,
            order: lesson.order,
            isCompleted: lessonProg?.isCompleted || false,
            progressPercentage: lessonProg?.progressPercentage || 0,
            timeSpent: lessonProg?.timeSpent || 0,
            completedAt: lessonProg?.completedAt,
            lastAccessedAt: lessonProg?.lastAccessedAt
          };
        })
      }
    });

  } catch (error) {
    console.error('Error fetching chapter status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapter status' },
      { status: 500 }
    );
  }
}
