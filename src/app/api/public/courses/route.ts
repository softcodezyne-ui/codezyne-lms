import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';

// GET /api/public/courses - Get all published courses (public access)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const pricing = searchParams.get('pricing') || 'all';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter for published courses only
    const filter: any = { status: 'published' };

    // Add search filter
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add category filter
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Add pricing filter
    if (pricing === 'free') {
      filter.isPaid = false;
    } else if (pricing === 'paid') {
      filter.isPaid = true;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Get courses with pagination
    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('createdBy', 'name email role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter)
    ]);

    // Calculate virtual fields for each course
    const coursesWithCalculatedFields = courses.map((course: any) => {
      const finalPrice = course.isPaid ? (course.salePrice || course.price || 0) : 0;
      const discountPercentage = course.isPaid && course.salePrice && course.price && course.salePrice < course.price 
        ? Math.round(((course.price - course.salePrice) / course.price) * 100) 
        : 0;

      return {
        ...course,
        finalPrice,
        discountPercentage,
        // Remove sensitive fields
        createdBy: {
          name: course.createdBy?.name || 'Unknown',
          role: course.createdBy?.role || 'instructor'
        }
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        courses: coursesWithCalculatedFields,
        pagination: {
          page,
          limit,
          total,
          pages: totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching public courses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
