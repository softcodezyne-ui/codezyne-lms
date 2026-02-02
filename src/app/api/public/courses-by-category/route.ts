import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import Chapter from '@/models/Chapter';
import Lesson from '@/models/Lesson';
import CourseCategory from '@/models/CourseCategory';
import User from '@/models/User';

// Public API endpoint to get courses by category (no authentication required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || '';
    const limitParam = searchParams.get('limit');
    // If no limit specified or category is "All", use a high limit to show all courses
    const limit = limitParam ? parseInt(limitParam) : (category === '' || category === 'All' || category === 'all' ? 1000 : 20);

    // Remove caching to always get fresh data from database
    // This ensures deleted courses don't appear in the list
    await connectDB();
    
    // Build filter
    const filter: any = { status: 'published' };
    if (category && category !== 'All' && category !== 'all' && category !== '') {
      filter.category = category;
    }
    
    // Build query
    let query = Course.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .populate('instructor', 'firstName lastName email')
      .sort({ createdAt: -1 });
    
    // Only apply limit if specified (for "All", we want to show as many as possible)
    if (limit && limit < 1000) {
      query = query.limit(limit);
    }
    
    const courses = await query.lean();

    // Get course stats (lesson count and duration) for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course: any) => {
        // Get chapters for this course
        const chapters = await Chapter.find({ course: course._id }).lean();
        const chapterIds = chapters.map(ch => ch._id);
        
        // Get lessons for all chapters
        const lessons = await Lesson.find({ chapter: { $in: chapterIds } }).lean();
        
        // Calculate lesson count and total duration
        const lessonCount = lessons.length;
        const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
        
        // Get category info
        let categoryInfo = null;
        if (course.category) {
          const categoryDoc = await CourseCategory.findOne({ name: course.category }).lean();
          categoryInfo = categoryDoc && !Array.isArray(categoryDoc) ? {
            name: (categoryDoc as any).name,
            color: (categoryDoc as any).color
          } : null;
        }
        
        // Calculate final price
        const finalPrice = course.isPaid ? (course.salePrice || course.price || 0) : 0;
        const discountPercentage = course.isPaid && course.salePrice && course.price && course.salePrice < course.price 
          ? Math.round(((course.price - course.salePrice) / course.price) * 100) 
          : 0;
        
        // Get instructor info
        const instructor = course.instructor || course.createdBy;
        const instructorName = instructor 
          ? `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim() || instructor.email
          : 'Unknown Instructor';
        
        return {
          _id: course._id.toString(),
          title: course.title,
          description: course.description,
          category: course.category,
          thumbnailUrl: course.thumbnailUrl,
          isPaid: course.isPaid,
          price: course.price,
          salePrice: course.salePrice,
          finalPrice,
          discountPercentage,
          lessonCount,
          totalDuration,
          instructor: {
            _id: instructor?._id?.toString() || '',
            name: instructorName,
            avatar: instructor?.avatar,
          },
          categoryInfo,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: coursesWithStats,
    });
  } catch (error) {
    console.error('Error fetching courses by category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

