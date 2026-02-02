import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UserProgress from '@/models/UserProgress';
import ChapterProgress from '@/models/ChapterProgress';
import CourseProgress from '@/models/CourseProgress';
import Enrollment from '@/models/Enrollment';
import Lesson from '@/models/Lesson';
import Chapter from '@/models/Chapter';
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
    const lessonId = searchParams.get('lesson');

    if (!courseId) {
      return NextResponse.json({ success: false, error: 'Course ID is required' }, { status: 400 });
    }

    // Get course progress
    const courseProgress = await CourseProgress.findOne({
      user: session.user.id,
      course: courseId
    }).populate('course', 'title');

    // Get chapter progress for the course
    const chapterProgress = await ChapterProgress.find({
      user: session.user.id,
      course: courseId
    }).populate('chapter', 'title order');

    // Get lesson progress for the course
    const lessonProgress = await UserProgress.find({
      user: session.user.id,
      course: courseId
    }).populate('lesson', 'title order chapter');

    // Get all chapters in the course
    const chapters = await Chapter.find({
      course: courseId,
      isPublished: true
    }).sort({ order: 1 });

    // Get all lessons in the course
    const lessons = await Lesson.find({
      course: courseId,
      isPublished: true
    }).populate('chapter', 'title order').sort({ order: 1 });

    // Calculate detailed progress
    const progressDetails = {
      course: {
        id: courseId,
        title: courseProgress?.course?.title || 'Unknown Course',
        isCompleted: courseProgress?.isCompleted || false,
        progressPercentage: courseProgress?.progressPercentage || 0,
        totalLessons: courseProgress?.totalLessons || 0,
        completedLessons: courseProgress?.completedLessons || 0,
        totalTimeSpent: courseProgress?.totalTimeSpent || 0,
        startedAt: courseProgress?.startedAt,
        completedAt: courseProgress?.completedAt,
        lastAccessedAt: courseProgress?.lastAccessedAt
      },
      chapters: chapters.map(chapter => {
        const chapterProg = chapterProgress.find(cp => cp.chapter.toString() === chapter._id.toString());
        const chapterLessons = lessons.filter(lesson => lesson.chapter?.toString() === chapter._id.toString());
        const completedChapterLessons = lessonProgress.filter(lp => 
          chapterLessons.some(cl => cl._id.toString() === lp.lesson.toString()) && lp.isCompleted
        );

        return {
          id: chapter._id.toString(),
          title: chapter.title,
          order: chapter.order,
          isCompleted: chapterProg?.isCompleted || false,
          progressPercentage: chapterProg?.progressPercentage || 0,
          totalLessons: chapterLessons.length,
          completedLessons: completedChapterLessons.length,
          totalTimeSpent: chapterProg?.totalTimeSpent || 0,
          startedAt: chapterProg?.startedAt,
          completedAt: chapterProg?.completedAt,
          lastAccessedAt: chapterProg?.lastAccessedAt,
          lessons: chapterLessons.map(lesson => {
            const lessonProg = lessonProgress.find(lp => lp.lesson.toString() === lesson._id.toString());
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
        };
      })
    };

    return NextResponse.json({
      success: true,
      data: progressDetails
    });

  } catch (error) {
    console.error('Error fetching completion progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch completion progress' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { 
      course, 
      chapter, 
      lesson, 
      isCompleted = false, 
      progressPercentage = 0, 
      timeSpent = 0,
      type = 'lesson' // 'lesson' or 'chapter'
    } = body;

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course is required' },
        { status: 400 }
      );
    }

    if (type === 'lesson' && !lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson is required for lesson completion' },
        { status: 400 }
      );
    }

    if (type === 'chapter' && !chapter) {
      return NextResponse.json(
        { success: false, error: 'Chapter is required for chapter completion' },
        { status: 400 }
      );
    }

    let result: any = {};

    if (type === 'lesson') {
      // Handle lesson completion
      result = await handleLessonCompletion(session.user.id, course, lesson, isCompleted, progressPercentage, timeSpent);
    } else if (type === 'chapter') {
      // Handle chapter completion
      result = await handleChapterCompletion(session.user.id, course, chapter, isCompleted, progressPercentage, timeSpent);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `${type} completion updated successfully`
    });

  } catch (error) {
    console.error('Error updating completion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update completion' },
      { status: 500 }
    );
  }
}

// Helper function to handle lesson completion
async function handleLessonCompletion(userId: string, courseId: string, lessonId: string, isCompleted: boolean, progressPercentage: number, timeSpent: number) {
  // Update lesson progress
  const lessonProgress = await UserProgress.findOneAndUpdate(
    { user: userId, lesson: lessonId },
    {
      user: userId,
      course: courseId,
      lesson: lessonId,
      isCompleted,
      progressPercentage,
      timeSpent,
      completedAt: isCompleted ? new Date() : undefined,
      lastAccessedAt: new Date()
    },
    { upsert: true, new: true, runValidators: true }
  ).populate('lesson', 'title order chapter');

  // Get the lesson's chapter
  const lesson = await Lesson.findById(lessonId).populate('chapter');
  const chapterId = lesson?.chapter?._id;

  // Update chapter progress if lesson belongs to a chapter
  if (chapterId) {
    await updateChapterProgress(userId, courseId, chapterId.toString());
  }

  // Update course progress
  await updateCourseProgress(userId, courseId);

  return lessonProgress;
}

// Helper function to handle chapter completion
async function handleChapterCompletion(userId: string, courseId: string, chapterId: string, isCompleted: boolean, progressPercentage: number, timeSpent: number) {
  // Update chapter progress
  const chapterProgress = await ChapterProgress.findOneAndUpdate(
    { user: userId, chapter: chapterId },
    {
      user: userId,
      course: courseId,
      chapter: chapterId,
      isCompleted,
      progressPercentage,
      timeSpent,
      completedAt: isCompleted ? new Date() : undefined,
      lastAccessedAt: new Date()
    },
    { upsert: true, new: true, runValidators: true }
  ).populate('chapter', 'title order');

  // Update course progress
  await updateCourseProgress(userId, courseId);

  return chapterProgress;
}

// Helper function to update chapter progress
async function updateChapterProgress(userId: string, courseId: string, chapterId: string) {
  try {
    // Get total lessons in chapter
    const totalLessons = await Lesson.countDocuments({ 
      course: courseId, 
      chapter: chapterId, 
      isPublished: true 
    });
    
    // Get completed lessons for this user in this chapter
    const completedLessons = await UserProgress.countDocuments({
      user: userId,
      course: courseId,
      lesson: { $in: await Lesson.find({ chapter: chapterId }).distinct('_id') },
      isCompleted: true,
    });

    // Get total time spent in this chapter
    const timeStats = await UserProgress.aggregate([
      { 
        $match: { 
          user: userId, 
          course: courseId,
          lesson: { $in: await Lesson.find({ chapter: chapterId }).distinct('_id') }
        } 
      },
      { $group: { _id: null, totalTimeSpent: { $sum: '$timeSpent' } } }
    ]);

    const totalTimeSpent = timeStats[0]?.totalTimeSpent || 0;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const isCompleted = completedLessons === totalLessons && totalLessons > 0;

    // Update or create chapter progress
    await ChapterProgress.findOneAndUpdate(
      { user: userId, chapter: chapterId },
      {
        user: userId,
        course: courseId,
        chapter: chapterId,
        isCompleted,
        progressPercentage,
        totalLessons,
        completedLessons,
        totalTimeSpent,
        lastAccessedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );
  } catch (error) {
    console.error('Error updating chapter progress:', error);
  }
}

// Helper function to update course progress
async function updateCourseProgress(userId: string, courseId: string) {
  try {
    // Get total lessons in course
    const totalLessons = await Lesson.countDocuments({ course: courseId, isPublished: true });
    
    // Get completed lessons for this user in this course
    const completedLessons = await UserProgress.countDocuments({
      user: userId,
      course: courseId,
      isCompleted: true,
    });

    // Get total time spent in this course
    const timeStats = await UserProgress.aggregate([
      { $match: { user: userId, course: courseId } },
      { $group: { _id: null, totalTimeSpent: { $sum: '$timeSpent' } } }
    ]);

    const totalTimeSpent = timeStats[0]?.totalTimeSpent || 0;
    const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const isCompleted = completedLessons === totalLessons && totalLessons > 0;

    // Update or create course progress
    await CourseProgress.findOneAndUpdate(
      { user: userId, course: courseId },
      {
        user: userId,
        course: courseId,
        isCompleted,
        progressPercentage,
        totalLessons,
        completedLessons,
        totalTimeSpent,
        lastAccessedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );

    // Update enrollment progress
    await Enrollment.findOneAndUpdate(
      { student: userId, course: courseId },
      {
        progress: progressPercentage,
        status: isCompleted ? 'completed' : 'active',
        lastAccessedAt: new Date(),
        ...(isCompleted && { completedAt: new Date() })
      },
      { upsert: false, new: true, runValidators: true }
    );
  } catch (error) {
    console.error('Error updating course progress:', error);
  }
}
