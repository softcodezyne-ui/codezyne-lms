import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';

// GET /api/courses/search - Search courses with advanced filtering
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
    const category = searchParams.get('category') || '';
    const isPaid = searchParams.get('isPaid');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const hasDiscount = searchParams.get('hasDiscount');
    const sortBy = searchParams.get('sortBy') || 'relevance';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Build search query
    let searchQuery: any = {};

    // Text search
    if (query) {
      searchQuery.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ];
    }

    // Category filter
    if (category) {
      searchQuery.category = { $regex: category, $options: 'i' };
    }

    // Paid/Free filter
    if (isPaid !== null && isPaid !== undefined) {
      searchQuery.isPaid = isPaid === 'true';
    }

    // Price range filter
    if (minPrice || maxPrice) {
      searchQuery.price = {};
      if (minPrice) {
        searchQuery.price.$gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        searchQuery.price.$lte = parseFloat(maxPrice);
      }
    }

    // Discount filter
    if (hasDiscount === 'true') {
      searchQuery.$and = [
        { isPaid: true },
        { salePrice: { $exists: true, $ne: null } },
        { price: { $exists: true, $ne: null } },
        { $expr: { $lt: ['$salePrice', '$price'] } }
      ];
    }

    // Build sort criteria
    let sort: any = {};

    switch (sortBy) {
      case 'relevance':
        // For text search, we'll sort by title match first, then by creation date
        if (query) {
          sort = { title: 1, createdAt: -1 };
        } else {
          sort = { createdAt: -1 };
        }
        break;
      case 'title':
        sort = { title: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'price':
        sort = { price: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'createdAt':
        sort = { createdAt: sortOrder === 'asc' ? 1 : -1 };
        break;
      case 'updatedAt':
        sort = { updatedAt: sortOrder === 'asc' ? 1 : -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await Course.countDocuments(searchQuery);

    // Get courses
    const courses = await Course.find(searchQuery)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate pagination info
    const pages = Math.ceil(total / limit);

    // Get search suggestions (categories and titles)
    const suggestions = await Course.aggregate([
      {
        $match: {
          $or: [
            { title: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          titles: { $addToSet: '$title' },
          categories: { $addToSet: '$category' }
        }
      }
    ]);

    const searchSuggestions = {
      titles: suggestions[0]?.titles?.slice(0, 5) || [],
      categories: suggestions[0]?.categories?.filter(Boolean).slice(0, 5) || []
    };

    return NextResponse.json({
      success: true,
      data: {
        courses,
        pagination: {
          page,
          limit,
          total,
          pages
        },
        suggestions: searchSuggestions,
        query: {
          q: query,
          category,
          isPaid,
          minPrice,
          maxPrice,
          hasDiscount,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    console.error('Error searching courses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search courses' },
      { status: 500 }
    );
  }
}
