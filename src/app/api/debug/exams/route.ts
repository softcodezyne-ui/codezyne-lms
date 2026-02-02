import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Exam from '@/models/Exam';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all exams without any filters
    const allExams = await Exam.find({})
      .populate('createdBy', 'name email')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .lean();

    // Get published exams
    const publishedExams = await Exam.find({ isPublished: true })
      .populate('createdBy', 'name email')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .lean();

    // Get active exams
    const activeExams = await Exam.find({ isActive: true })
      .populate('createdBy', 'name email')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .lean();

    // Get published and active exams
    const publishedAndActiveExams = await Exam.find({ 
      isPublished: true, 
      isActive: true 
    })
      .populate('createdBy', 'name email')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        allExams: allExams.length,
        publishedExams: publishedExams.length,
        activeExams: activeExams.length,
        publishedAndActiveExams: publishedAndActiveExams.length,
        examDetails: {
          all: allExams.map(exam => ({
            id: exam._id,
            title: exam.title,
            isPublished: exam.isPublished,
            isActive: exam.isActive,
            startDate: exam.startDate,
            endDate: exam.endDate,
            questionCount: exam.questions ? exam.questions.length : 0
          })),
          published: publishedExams.map(exam => ({
            id: exam._id,
            title: exam.title,
            isPublished: exam.isPublished,
            isActive: exam.isActive,
            startDate: exam.startDate,
            endDate: exam.endDate,
            questionCount: exam.questions ? exam.questions.length : 0
          })),
          active: activeExams.map(exam => ({
            id: exam._id,
            title: exam.title,
            isPublished: exam.isPublished,
            isActive: exam.isActive,
            startDate: exam.startDate,
            endDate: exam.endDate,
            questionCount: exam.questions ? exam.questions.length : 0
          })),
          publishedAndActive: publishedAndActiveExams.map(exam => ({
            id: exam._id,
            title: exam.title,
            isPublished: exam.isPublished,
            isActive: exam.isActive,
            startDate: exam.startDate,
            endDate: exam.endDate,
            questionCount: exam.questions ? exam.questions.length : 0
          }))
        }
      }
    });

  } catch (error) {
    console.error('Error in debug exams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch debug data' },
      { status: 500 }
    );
  }
}
