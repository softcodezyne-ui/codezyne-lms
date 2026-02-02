import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import CourseCategory from '@/models/CourseCategory';
import { CourseSearchParams, CourseFilters } from '@/types/course';

// GET /api/courses - Get all courses with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Allow public access for published courses only
    const isPublicAccess = !session;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const isPaid = searchParams.get('isPaid');
    const status = searchParams.get('status');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const createdBy = searchParams.get('createdBy'); // Filter by creator


    // Build filter object
    const filters: any = {};

    // For public access, only show published courses
    if (isPublicAccess) {
      filters.status = 'published';
    } else {
      // For authenticated users, show their own courses or all courses if admin
      if (session.user.role !== 'admin' && !createdBy) {
        filters.createdBy = session.user.id;
      }
    }

    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      filters.category = { $regex: category, $options: 'i' };
    }

    if (isPaid !== null && isPaid !== undefined) {
      filters.isPaid = isPaid === 'true';
    }

    if (status && !isPublicAccess) {
      filters.status = status;
    }

    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) {
        filters.price.$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        filters.price.$lte = parseFloat(maxPrice);
      }
    }

    if (createdBy) {
      filters.createdBy = createdBy;
    }


    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Course.countDocuments(filters);

    // Get courses with creator and instructor information
    const courses = await Course.find(filters)
      .populate('createdBy', 'firstName lastName email role')
      .populate({
        path: 'instructor',
        select: 'firstName lastName email role',
        options: { strictPopulate: false }
      })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get category information for each course and calculate virtual fields
    const coursesWithCategories = await Promise.all(
      courses.map(async (course) => {
        // Calculate finalPrice and discountPercentage manually since .lean() doesn't include virtuals
        const finalPrice = course.isPaid ? (course.salePrice || course.price || 0) : 0;
        const discountPercentage = course.isPaid && course.salePrice && course.price && course.salePrice < course.price 
          ? Math.round(((course.price - course.salePrice) / course.price) * 100) 
          : 0;

        const baseData = {
          ...course,
          status: course.status ?? 'draft', // Ensure status is always present
          finalPrice,
          discountPercentage
        };
        
        if (course.category) {
          const categoryInfo = await CourseCategory.findOne({ name: course.category }).lean();
          return {
            ...baseData,
            categoryInfo: categoryInfo || null
          };
        }
        return {
          ...baseData,
          categoryInfo: null
        };
      })
    );

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    // Calculate stats
    const statsPipeline = [
      {
        $group: {
          _id: null,
          totalCourses: { $sum: 1 },
          publishedCourses: {
            $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
          },
          paidCourses: {
            $sum: { $cond: [{ $eq: ['$isPaid', true] }, 1, 0] }
          },
          freeCourses: {
            $sum: { $cond: [{ $eq: ['$isPaid', false] }, 1, 0] }
          }
        }
      }
    ];

    // Add additional stats for authenticated users
    if (!isPublicAccess) {
      (statsPipeline[0].$group as any).draftCourses = {
        $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
      };
      (statsPipeline[0].$group as any).archivedCourses = {
        $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] }
      };
      (statsPipeline[0].$group as any).totalRevenue = {
        $sum: {
          $cond: [
            { $eq: ['$isPaid', true] },
            { $ifNull: ['$salePrice', '$price'] },
            0
          ]
        }
      };
      (statsPipeline[0].$group as any).averagePrice = {
        $avg: {
          $cond: [
            { $eq: ['$isPaid', true] },
            { $ifNull: ['$salePrice', '$price'] },
            null
          ]
        }
      };
    }

    const stats = await Course.aggregate(statsPipeline);

    const categoryStats = await Course.aggregate([
      { $match: { category: { $exists: true, $ne: null, $nin: [''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const courseStats = {
      totalCourses: stats[0]?.totalCourses || 0,
      publishedCourses: stats[0]?.publishedCourses || 0,
      paidCourses: stats[0]?.paidCourses || 0,
      freeCourses: stats[0]?.freeCourses || 0,
      ...(isPublicAccess ? {} : {
        draftCourses: stats[0]?.draftCourses || 0,
        archivedCourses: stats[0]?.archivedCourses || 0,
        totalRevenue: stats[0]?.totalRevenue || 0,
        averagePrice: stats[0]?.averagePrice || 0,
      }),
      categories: categoryStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };

    return NextResponse.json({
      success: true,
      data: {
        courses: coursesWithCategories,
        pagination: {
          page,
          limit,
          total,
          pages
        },
        stats: courseStats
      }
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

// POST /api/courses - Create a new course
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin, instructor, or teacher role
    if (!['admin', 'instructor', 'teacher'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    console.log('Raw request body:', body);
    console.log('Body type:', typeof body);
    console.log('Body keys:', Object.keys(body));
   
    const {
      title,
      shortDescription,
      description,
      category,
      thumbnailUrl,
      isPaid,
      status,
      price,
      salePrice,
      instructor
    } = body;
    
    console.log('Destructured values:');
    console.log('title:', title);
    console.log('description:', description);
    console.log('category:', category);
    console.log('thumbnailUrl:', thumbnailUrl);
    console.log('isPaid:', isPaid);
    console.log('status:', status);
    console.log('price:', price);
    console.log('salePrice:', salePrice);
    console.log('instructor:', instructor);

    // Validation
    if (!title || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Course title is required' },
        { status: 400 }
      );
    }

    if (isPaid && (!price || price <= 0)) {
      return NextResponse.json(
        { success: false, error: 'Paid courses must have a valid price' },
        { status: 400 }
      );
    }

    if (salePrice && price && salePrice >= price) {
      return NextResponse.json(
        { success: false, error: 'Sale price must be less than regular price' },
        { status: 400 }
      );
    }

    console.log('Session user ID:', session);
    // Create course
    const courseData = {
      title: title.trim(),
      shortDescription: shortDescription?.trim(),
      description: description?.trim(),
      category: category?.trim(),
      thumbnailUrl,
      isPaid: isPaid || false,
      status: status || 'draft',
      price: isPaid ? price : undefined,
      salePrice: isPaid && salePrice ? salePrice : undefined,
      createdBy: session.user.id, // Track who created the course
      instructor: instructor || undefined // Assign instructor if provided
    };

    console.log('Creating course with data:', courseData);
    console.log('Status value:', status);
    console.log('Status type:', typeof status);

    const course = new Course(courseData);

    try {
      await course.save();
      console.log('Course saved successfully:', course);
      
      // Revalidate courses cache
      revalidateTag('courses', 'max');
    } catch (error) {
      console.error('Error saving course:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: course,
      message: 'Course created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating course:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
