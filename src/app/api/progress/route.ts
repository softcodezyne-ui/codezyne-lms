import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import UserProgress from '@/models/UserProgress';
import ChapterProgress from '@/models/ChapterProgress';
import CourseProgress from '@/models/CourseProgress';
import Enrollment from '@/models/Enrollment';
import Lesson from '@/models/Lesson';
import Chapter from '@/models/Chapter';
import LessonQuizQuestion from '@/models/LessonQuizQuestion';
import { ProgressFilters, ProgressListResponse } from '@/types/progress';
import connectDB from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const filters: ProgressFilters = {
      user: searchParams.get('user') || session.user.id,
      course: searchParams.get('course') || undefined,
      lesson: searchParams.get('lesson') || undefined,
      isCompleted: searchParams.get('isCompleted') ? searchParams.get('isCompleted') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: (searchParams.get('sortBy') as any) || 'updatedAt',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
    };

    // Build query
    const query: any = {};
    
    if (filters.user) {
      query.user = filters.user;
    }
    
    if (filters.course) {
      query.course = filters.course;
    }
    
    if (filters.lesson) {
      query.lesson = filters.lesson;
    }
    
    if (filters.isCompleted !== undefined) {
      query.isCompleted = filters.isCompleted;
    }

    // Build sort
    const sort: any = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;
    }

    // Pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Execute query
    const progress = await UserProgress.find(query)
      .populate('user', 'name email')
      .populate('course', 'title')
      .populate('lesson', 'title duration')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await UserProgress.countDocuments(query);
    const pages = Math.ceil(total / limit);

    // Calculate stats
    const stats = await UserProgress.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalProgress: { $sum: 1 },
          completedProgress: {
            $sum: { $cond: [{ $eq: ['$isCompleted', true] }, 1, 0] }
          },
          averageProgressPercentage: { $avg: '$progressPercentage' },
          totalTimeSpent: { $sum: '$timeSpent' },
          averageTimeSpent: { $avg: '$timeSpent' }
        }
      }
    ]);

    const progressStats = {
      totalProgress: stats[0]?.totalProgress || 0,
      completedProgress: stats[0]?.completedProgress || 0,
      averageProgressPercentage: Math.round((stats[0]?.averageProgressPercentage || 0) * 100) / 100,
      totalTimeSpent: stats[0]?.totalTimeSpent || 0,
      averageTimeSpent: Math.round((stats[0]?.averageTimeSpent || 0) * 100) / 100,
      completionRate: stats[0]?.totalProgress > 0 ? 
        Math.round((stats[0].completedProgress / stats[0].totalProgress) * 100) : 0,
    };

    const response: ProgressListResponse = {
      progress: progress.map(prog => ({
        ...(prog as any),
        _id: (prog as any)._id.toString(),
        user: (prog as any).user.toString(),
        course: (prog as any).course.toString(),
        lesson: (prog as any).lesson.toString(),
        createdAt: (prog as any).createdAt.toISOString(),
        updatedAt: (prog as any).updatedAt.toISOString(),
        completedAt: (prog as any).completedAt?.toISOString(),
        lastAccessedAt: (prog as any).lastAccessedAt.toISOString(),
      })),
      pagination: { page, limit, total, pages },
      stats: progressStats,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch progress' },
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
    const { course, lesson, isCompleted = false, progressPercentage = 0, timeSpent = 0 } = body;

    // Validate required fields
    if (!course || !lesson) {
      return NextResponse.json(
        { success: false, error: 'Course and lesson are required' },
        { status: 400 }
      );
    }

    // Check if progress already exists
    const existingProgress = await UserProgress.findOne({
      user: session.user.id,
      lesson,
    });

    if (existingProgress) {
      // Update existing progress
      const updateData: any = {};
      if (isCompleted !== undefined) updateData.isCompleted = isCompleted;
      if (progressPercentage !== undefined) updateData.progressPercentage = progressPercentage;
      if (timeSpent !== undefined) updateData.timeSpent = timeSpent;
      if (isCompleted === true) updateData.completedAt = new Date();
      updateData.lastAccessedAt = new Date();

      const updatedProgress = await UserProgress.findByIdAndUpdate(
        existingProgress._id,
        updateData,
        { new: true, runValidators: true }
      ).populate('user', 'name email')
       .populate('course', 'title')
       .populate('lesson', 'title duration');

      // Determine quiz trigger
      let quiz: any = undefined;
      if ((updateData.isCompleted === true || existingProgress.isCompleted === true) && existingProgress.lesson) {
        const activeCount = await LessonQuizQuestion.countDocuments({ lesson: existingProgress.lesson, isActive: true });
        if (activeCount > 0) {
          quiz = {
            required: true,
            questionsCount: activeCount,
            fetchUrl: `/api/lessons/${existingProgress.lesson.toString()}/quiz`,
            submitUrl: `/api/lessons/${existingProgress.lesson.toString()}/quiz/submit`,
          };
        }
      }

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
        quiz,
        message: 'Progress updated successfully',
      });
    } else {
      // Create new progress
      const progress = new UserProgress({
        user: session.user.id,
        course,
        lesson,
        isCompleted,
        progressPercentage,
        timeSpent,
        completedAt: isCompleted ? new Date() : undefined,
        lastAccessedAt: new Date(),
      });

      await progress.save();

      // Update chapter progress if lesson belongs to a chapter
      const lessonDoc = await Lesson.findById(lesson).populate('chapter');
      if (lessonDoc?.chapter) {
        await updateChapterProgress(session.user.id, course, lessonDoc.chapter._id.toString());
      }

      // Update course progress
      await updateCourseProgress(session.user.id, course);

      // Determine quiz trigger
      let quiz: any = undefined;
      if (isCompleted === true) {
        const activeCount = await LessonQuizQuestion.countDocuments({ lesson, isActive: true });
        if (activeCount > 0) {
          quiz = {
            required: true,
            questionsCount: activeCount,
            fetchUrl: `/api/lessons/${lesson}/quiz`,
            submitUrl: `/api/lessons/${lesson}/quiz/submit`,
          };
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          ...progress.toObject(),
          _id: progress._id.toString(),
          user: progress.user.toString(),
          course: progress.course.toString(),
          lesson: progress.lesson.toString(),
          createdAt: progress.createdAt.toISOString(),
          updatedAt: progress.updatedAt.toISOString(),
          completedAt: (progress as any).completedAt?.toISOString(),
          lastAccessedAt: (progress as any).lastAccessedAt.toISOString(),
        },
        quiz,
        message: 'Progress created successfully',
      });
    }
  } catch (error) {
    console.error('Error creating/updating progress:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create/update progress' },
      { status: 500 }
    );
  }
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
