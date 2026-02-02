import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { revalidateTag } from 'next/cache';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseCategory from '@/models/CourseCategory';
import Course from '@/models/Course';
import { CourseCategorySearchParams } from '@/types/course-category';

// GET /api/categories - Get all categories with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build filter object
    const filters: any = {};

    if (search) {
      filters.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      filters.isActive = isActive === 'true';
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await CourseCategory.countDocuments(filters);

    // Get categories with course count
    const categories = await CourseCategory.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get course count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const courseCount = await Course.countDocuments({ category: category.name });
        return {
          ...category,
          courseCount
        };
      })
    );

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    // Calculate stats
    const stats = await CourseCategory.aggregate([
      {
        $group: {
          _id: null,
          totalCategories: { $sum: 1 },
          activeCategories: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactiveCategories: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          }
        }
      }
    ]);

    // Get categories with courses count
    const categoriesWithCourses = await CourseCategory.aggregate([
      {
        $lookup: {
          from: 'courses',
          localField: 'name',
          foreignField: 'category',
          as: 'courses'
        }
      },
      {
        $match: {
          'courses.0': { $exists: true }
        }
      },
      {
        $count: 'categoriesWithCourses'
      }
    ]);

    const categoryStats = {
      totalCategories: stats[0]?.totalCategories || 0,
      activeCategories: stats[0]?.activeCategories || 0,
      inactiveCategories: stats[0]?.inactiveCategories || 0,
      categoriesWithCourses: categoriesWithCourses[0]?.categoriesWithCourses || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        categories: categoriesWithCounts,
        pagination: {
          page,
          limit,
          total,
          pages
        },
        stats: categoryStats
      }
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has admin or instructor role
    if (!['admin', 'instructor'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const {
      name,
      description,
      color,
      icon,
      isActive
    } = body;

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Check if category name already exists
    const existingCategory = await CourseCategory.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category name already exists' },
        { status: 400 }
      );
    }

    // Create category
    const category = new CourseCategory({
      name: name.trim(),
      description: description?.trim(),
      color: color || '#3B82F6',
      icon: icon?.trim(),
      isActive: isActive !== undefined ? isActive : true
    });

    await category.save();

    // Revalidate categories cache
    revalidateTag('categories', 'max');

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating category:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
