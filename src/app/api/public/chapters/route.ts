import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Chapter from '@/models/Chapter';

// GET /api/public/chapters - Get published chapters for a course (public access)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const course = searchParams.get('course');
    const isPublished = searchParams.get('isPublished') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Build filter
    const filter: any = { course };
    
    if (isPublished) {
      filter.isPublished = true;
    }

    // Get chapters
    const chapters = await Chapter.find(filter)
      .sort({ order: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        chapters
      }
    });

  } catch (error) {
    console.error('Error fetching public chapters:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}
