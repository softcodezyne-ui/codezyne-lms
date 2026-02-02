import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Lesson from '@/models/Lesson';

// GET /api/public/lessons - Get published lessons for a course (public access)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const course = searchParams.get('course');
    const chapter = searchParams.get('chapter');
    const isPublished = searchParams.get('isPublished') === 'true';
    const limit = parseInt(searchParams.get('limit') || '1000');

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Build filter
    const filter: any = { course };
    
    if (chapter) {
      filter.chapter = chapter;
    }
    
    if (isPublished) {
      filter.isPublished = true;
    }

    // Get lessons
    const lessons = await Lesson.find(filter)
      .populate('chapter', 'title order')
      .sort({ order: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        lessons
      }
    });

  } catch (error) {
    console.error('Error fetching public lessons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
