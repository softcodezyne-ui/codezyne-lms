import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseCategory from '@/models/CourseCategory';
import Course from '@/models/Course';

// GET /api/categories/search - Search categories with advanced filtering
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
    const query = searchParams.get('q') || '';
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build search query
    let searchQuery: any = {};

    // Text search
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    // Active/Inactive filter
    if (isActive !== null && isActive !== undefined) {
      searchQuery.isActive = isActive === 'true';
    }

    // Build sort criteria
    let sort: any = {};

    switch (sortBy) {
      case 'name':
        sort = { name: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'createdAt':
        sort = { createdAt: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'updatedAt':
        sort = { updatedAt: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'courseCount':
        // We'll sort by course count after getting the data
        sort = { name: 1 }; // Default sort for now
        break;
      default:
        sort = { name: 1 };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await CourseCategory.countDocuments(searchQuery);

    // Get categories
    let categories = await CourseCategory.find(searchQuery)
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

    // Sort by course count if requested
    if (sortBy === 'courseCount') {
      categoriesWithCounts.sort((a, b) => {
        return sortOrder === 'asc' 
          ? a.courseCount - b.courseCount 
          : b.courseCount - a.courseCount;
      });
    }

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    // Get search suggestions
    const suggestions = await CourseCategory.aggregate([
      {
        $match: {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          names: { $addToSet: '$name' },
          descriptions: { $addToSet: '$description' }
        }
      }
    ]);

    const searchSuggestions = {
      names: suggestions[0]?.names?.slice(0, 5) || [],
      descriptions: suggestions[0]?.descriptions?.filter(Boolean).slice(0, 5) || []
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
        suggestions: searchSuggestions,
        query: {
          q: query,
          isActive,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Error searching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search categories' },
      { status: 500 }
    );
  }
}
