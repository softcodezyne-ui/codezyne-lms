import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UserProgress from '@/models/UserProgress';
import ChapterProgress from '@/models/ChapterProgress';
import CourseProgress from '@/models/CourseProgress';
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

    if (!courseId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Course ID is required' 
      }, { status: 400 });
    }

    // Get course progress
    const courseProgress = await CourseProgress.findOne({
      user: session.user.id,
      course: courseId
    }).populate('course', 'title description');

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

    // Get chapter progress
    const chapterProgress = await ChapterProgress.find({
      user: session.user.id,
      course: courseId
    }).populate('chapter', 'title order');

    // Get lesson progress
    const lessonProgress = await UserProgress.find({
      user: session.user.id,
      course: courseId
    }).populate('lesson', 'title order chapter');

    // Calculate overall statistics
    const totalLessons = lessons.length;
    const completedLessons = lessonProgress.filter(lp => lp.isCompleted).length;
    const totalChapters = chapters.length;
    const completedChapters = chapterProgress.filter(cp => cp.isCompleted).length;

    // Calculate time spent
    const totalTimeSpent = lessonProgress.reduce((sum, lp) => sum + (lp.timeSpent || 0), 0);
    const averageTimePerLesson = completedLessons > 0 ? Math.round(totalTimeSpent / completedLessons) : 0;

    // Get recent activity (last 10 completed lessons)
    const recentActivity = lessonProgress
      .filter(lp => lp.isCompleted && lp.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
      .slice(0, 10)
      .map(lp => ({
        id: lp.lesson._id.toString(),
        title: lp.lesson.title,
        completedAt: lp.completedAt,
        timeSpent: lp.timeSpent
      }));

    // Calculate chapter-wise progress
    const chapterProgressDetails = chapters.map(chapter => {
      const chapterProg = chapterProgress.find(cp => cp.chapter._id.toString() === chapter._id.toString());
      const chapterLessons = lessons.filter(lesson => lesson.chapter?._id.toString() === chapter._id.toString());
      const completedChapterLessons = lessonProgress.filter(lp => 
        chapterLessons.some(cl => cl._id.toString() === lp.lesson._id.toString()) && lp.isCompleted
      );

      const chapterTimeSpent = lessonProgress
        .filter(lp => chapterLessons.some(cl => cl._id.toString() === lp.lesson._id.toString()))
        .reduce((sum, lp) => sum + (lp.timeSpent || 0), 0);

      return {
        id: chapter._id.toString(),
        title: chapter.title,
        order: chapter.order,
        isCompleted: chapterProg?.isCompleted || false,
        progressPercentage: chapterProg?.progressPercentage || 0,
        totalLessons: chapterLessons.length,
        completedLessons: completedChapterLessons.length,
        totalTimeSpent: chapterTimeSpent,
        completedAt: chapterProg?.completedAt,
        lastAccessedAt: chapterProg?.lastAccessedAt,
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
      };
    });

    // Calculate learning streaks
    const completedDates = lessonProgress
      .filter(lp => lp.completedAt)
      .map(lp => new Date(lp.completedAt!).toDateString())
      .sort();

    const uniqueDates = [...new Set(completedDates)];
    const currentStreak = calculateCurrentStreak(uniqueDates);
    const longestStreak = calculateLongestStreak(uniqueDates);

    const dashboardData = {
      course: {
        id: courseId,
        title: courseProgress?.course?.title || 'Unknown Course',
        description: courseProgress?.course?.description,
        isCompleted: courseProgress?.isCompleted || false,
        progressPercentage: courseProgress?.progressPercentage || 0,
        totalLessons,
        completedLessons,
        totalChapters,
        completedChapters,
        totalTimeSpent,
        averageTimePerLesson,
        startedAt: courseProgress?.startedAt,
        completedAt: courseProgress?.completedAt,
        lastAccessedAt: courseProgress?.lastAccessedAt
      },
      statistics: {
        completionRate: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        chapterCompletionRate: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0,
        averageTimePerLesson,
        totalTimeSpent,
        currentStreak,
        longestStreak,
        totalStudyDays: uniqueDates.length
      },
      chapters: chapterProgressDetails,
      recentActivity,
      milestones: calculateMilestones(completedLessons, totalLessons)
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching progress dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress dashboard' },
      { status: 500 }
    );
  }
}

// Helper function to calculate current streak
function calculateCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  
  const today = new Date().toDateString();
  let streak = 0;
  let currentDate = new Date();
  
  for (let i = 0; i < 365; i++) { // Check up to a year
    const dateString = currentDate.toDateString();
    if (dates.includes(dateString)) {
      streak++;
    } else {
      break;
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }
  
  return streak;
}

// Helper function to calculate longest streak
function calculateLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  
  let longestStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;
  
  for (const dateString of dates) {
    const currentDate = new Date(dateString);
    
    if (previousDate === null) {
      currentStreak = 1;
    } else {
      const diffTime = currentDate.getTime() - previousDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }
    
    previousDate = currentDate;
  }
  
  return Math.max(longestStreak, currentStreak);
}

// Helper function to calculate milestones
function calculateMilestones(completed: number, total: number): any[] {
  const milestones = [];
  const percentages = [25, 50, 75, 100];
  
  for (const percentage of percentages) {
    const target = Math.ceil((percentage / 100) * total);
    if (target <= total) {
      milestones.push({
        percentage,
        target,
        achieved: completed >= target,
        completed: Math.min(completed, target)
      });
    }
  }
  
  return milestones;
}
