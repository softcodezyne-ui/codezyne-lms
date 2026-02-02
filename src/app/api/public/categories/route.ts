import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import connectDB from '@/lib/mongodb';
import CourseCategory from '@/models/CourseCategory';

// Public API endpoint to get active categories (no authentication required)
export async function GET(request: NextRequest) {
  try {
    const getCachedCategories = unstable_cache(
      async () => {
        await connectDB();
        const categories = await CourseCategory.find({ isActive: true })
          .sort({ name: 1 })
          .select('name description color icon isActive')
          .lean();
        
        return categories.map((cat: any) => ({
          _id: cat._id?.toString() || '',
          name: cat.name,
          description: cat.description,
          color: cat.color,
          icon: cat.icon,
          isActive: cat.isActive,
        }));
      },
      ['public-categories'],
      {
        tags: ['categories'],
        revalidate: false, // No time-based revalidation
      }
    );

    const categories = await getCachedCategories();

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

