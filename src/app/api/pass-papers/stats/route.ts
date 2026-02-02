import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { PassPaper } from '@/models/PassPaper';
import { PassPaperStats } from '@/types/pass-paper';

// GET /api/pass-papers/stats - Get pass paper statistics
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

    // Get basic counts
    const [totalPapers, activePapers, inactivePapers] = await Promise.all([
      PassPaper.countDocuments(),
      PassPaper.countDocuments({ isActive: true }),
      PassPaper.countDocuments({ isActive: false })
    ]);

    // Get papers by type
    const [questionPapers, marksPdfs, workSolutions] = await Promise.all([
      PassPaper.countDocuments({ 
        questionPaperUrl: { $exists: true, $ne: '' } 
      }),
      PassPaper.countDocuments({ 
        marksPdfUrl: { $exists: true, $ne: '' } 
      }),
      PassPaper.countDocuments({ 
        workSolutionUrl: { $exists: true, $ne: '' } 
      })
    ]);

    // Get papers by subject
    const papersBySubject = await PassPaper.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get papers by year
    const papersByYear = await PassPaper.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 10 }
    ]);

    // Get recent uploads
    const recentUploads = await PassPaper.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('sessionName year subject examType createdAt uploadedBy')
      .lean();

    // Convert aggregation results to objects
    const papersBySubjectObj = papersBySubject.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    const papersByYearObj = papersByYear.reduce((acc: any, item: any) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<number, number>);

    const stats: PassPaperStats = {
      totalPapers,
      activePapers,
      inactivePapers,
      papersByType: {
        questionPapers,
        marksPdfs,
        workSolutions
      },
      papersBySubject: papersBySubjectObj,
      papersByYear: papersByYearObj,
      recentUploads
    };

    return NextResponse.json({ stats });

  } catch (error) {
    console.error('Get pass paper stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
