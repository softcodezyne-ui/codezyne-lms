import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { PassPaper } from '@/models/PassPaper';
import { PassPaperResponse } from '@/types/pass-paper';

// GET /api/pass-papers/search - Advanced search for pass papers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const sessionName = searchParams.get('sessionName');
    const year = searchParams.get('year');
    const subject = searchParams.get('subject');
    const examType = searchParams.get('examType');
    const paperType = searchParams.get('paperType');
    const isActive = searchParams.get('isActive');
    const uploadedBy = searchParams.get('uploadedBy');
    const yearFrom = searchParams.get('yearFrom');
    const yearTo = searchParams.get('yearTo');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build query
    const query: any = {};

    // Text search across multiple fields
    if (search) {
      query.$or = [
        { sessionName: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { examType: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Exact field matches
    if (sessionName) {
      query.sessionName = { $regex: sessionName, $options: 'i' };
    }

    if (subject) {
      query.subject = { $regex: subject, $options: 'i' };
    }

    if (examType) {
      query.examType = { $regex: examType, $options: 'i' };
    }

    // Year filtering
    if (year) {
      query.year = parseInt(year);
    } else if (yearFrom || yearTo) {
      query.year = {};
      if (yearFrom) query.year.$gte = parseInt(yearFrom);
      if (yearTo) query.year.$lte = parseInt(yearTo);
    }

    // Paper type filtering
    if (paperType) {
      switch (paperType) {
        case 'question_paper':
          query.questionPaperUrl = { $exists: true, $ne: '' };
          break;
        case 'marks_pdf':
          query.marksPdfUrl = { $exists: true, $ne: '' };
          break;
        case 'work_solution':
          query.workSolutionUrl = { $exists: true, $ne: '' };
          break;
      }
    }

    // Status filtering
    if (isActive !== null && isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Uploader filtering
    if (uploadedBy) {
      query.uploadedBy = uploadedBy;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    // Execute search with pagination
    const [passPapers, total] = await Promise.all([
      PassPaper.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PassPaper.countDocuments(query)
    ]);

    // Get aggregation data for search suggestions
    const [subjects, examTypes, years] = await Promise.all([
      PassPaper.distinct('subject', query),
      PassPaper.distinct('examType', query),
      PassPaper.distinct('year', query)
    ]);

    // Sort years in descending order
    years.sort((a: number, b: number) => b - a);

    return NextResponse.json({
      passPapers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      suggestions: {
        subjects: subjects.slice(0, 10),
        examTypes: examTypes.slice(0, 10),
        years: years.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Search pass papers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
