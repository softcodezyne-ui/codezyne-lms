import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CourseFAQ from '@/models/CourseFAQ';
import Course from '@/models/Course';
import mongoose from 'mongoose';

// GET /api/public/faqs?course=courseId - Get FAQs for a course (public, no auth)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course');

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: 'Valid course ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Ensure the course exists and is published
    const course = await Course.findOne({ _id: courseId, status: 'published' })
      .select('_id')
      .lean();
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found or not published' },
        { status: 404 }
      );
    }

    const faqs = await CourseFAQ.find({ course: courseId })
      .sort({ order: 1, createdAt: 1 })
      .select('question answer order')
      .lean();

    const list = faqs.map((f: { _id: unknown; question: string; answer: string; order: number }) => ({
      _id: String(f._id),
      question: f.question,
      answer: f.answer,
      order: f.order ?? 0,
    }));

    return NextResponse.json({
      success: true,
      data: { faqs: list },
    });
  } catch (error) {
    console.error('Error fetching public course FAQs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch FAQs' },
      { status: 500 }
    );
  }
}
