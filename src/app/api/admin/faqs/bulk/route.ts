import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Types } from 'mongoose';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import CourseFAQ from '@/models/CourseFAQ';

// POST /api/admin/faqs/bulk - Create multiple course FAQs at once
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { course, faqs: faqList } = body;

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(faqList) || faqList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one FAQ (question and answer) is required' },
        { status: 400 }
      );
    }

    const validPairs = faqList
      .map((item: { question?: string; answer?: string }) => ({
        question: typeof item.question === 'string' ? item.question.trim() : '',
        answer: typeof item.answer === 'string' ? item.answer.trim() : '',
      }))
      .filter((item: { question: string; answer: string }) => item.question && item.answer);

    if (validPairs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one FAQ must have both question and answer' },
        { status: 400 }
      );
    }

    await connectDB();

    const maxOrder = await CourseFAQ.findOne({ course })
      .sort({ order: -1 })
      .select('order')
      .lean();
    let nextOrder = typeof maxOrder?.order === 'number' ? maxOrder.order + 1 : 0;

    const created = await CourseFAQ.insertMany(
      validPairs.map((pair: { question: string; answer: string }) => ({
        course,
        question: pair.question,
        answer: pair.answer,
        order: nextOrder++,
      }))
    );

    const ids = created.map((c) => c._id as Types.ObjectId);
    const populated = await CourseFAQ.find({ _id: { $in: ids } })
      .populate('course', 'title')
      .sort({ order: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: { faqs: populated },
      message: `${created.length} FAQ(s) created successfully`,
    });
  } catch (error) {
    console.error('Error bulk creating course FAQs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create FAQs' },
      { status: 500 }
    );
  }
}
