import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseFAQ from '@/models/CourseFAQ';

// GET /api/admin/faqs - List FAQs, optionally filtered by course
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const filter: Record<string, unknown> = {};
    if (courseId) {
      filter.course = courseId;
    }

    const skip = (page - 1) * limit;
    const [faqs, total] = await Promise.all([
      CourseFAQ.find(filter)
        .populate('course', 'title')
        .sort({ order: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseFAQ.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        faqs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching course FAQs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch FAQs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/faqs - Create a new course FAQ
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { course, question, answer, order } = body;

    if (!course || !question?.trim() || !answer?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Course, question, and answer are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const maxOrder = await CourseFAQ.findOne({ course })
      .sort({ order: -1 })
      .select('order')
      .lean();
    const nextOrder = typeof order === 'number' && order >= 0 ? order : (maxOrder?.order ?? 0) + 1;

    const faq = await CourseFAQ.create({
      course,
      question: question.trim(),
      answer: answer.trim(),
      order: nextOrder,
    });

    const populated = await CourseFAQ.findById(faq._id)
      .populate('course', 'title')
      .lean();

    return NextResponse.json({
      success: true,
      data: populated,
      message: 'FAQ created successfully',
    });
  } catch (error) {
    console.error('Error creating course FAQ:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create FAQ' },
      { status: 500 }
    );
  }
}
