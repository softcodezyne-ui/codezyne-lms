import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import User from '@/models/User';
import Course from '@/models/Course';

// GET /api/payment/refund-history - Get refund history and statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await User.findById(session.user.id);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status'); // 'initiated', 'processing', 'refunded', 'failed'
    const skip = (page - 1) * limit;

    // Build query
    const query: any = { status: 'refunded' };
    if (status) {
      query.refundStatus = status;
    }

    // Get refunded payments with pagination
    const refundedPayments = await Payment.find(query)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title thumbnailUrl price')
      .populate('refundedBy', 'firstName lastName email')
      .sort({ refundedAt: -1 })
      .limit(limit)
      .skip(skip);

    // Get total count
    const totalCount = await Payment.countDocuments(query);

    // Get refund statistics
    const refundStats = await Payment.aggregate([
      {
        $match: { status: 'refunded' }
      },
      {
        $group: {
          _id: null,
          totalRefunds: { $sum: 1 },
          totalRefundAmount: { $sum: '$refundAmount' },
          averageRefundAmount: { $avg: '$refundAmount' },
          initiated: { $sum: { $cond: [{ $eq: ['$refundStatus', 'initiated'] }, 1, 0] } },
          processing: { $sum: { $cond: [{ $eq: ['$refundStatus', 'processing'] }, 1, 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$refundStatus', 'refunded'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$refundStatus', 'failed'] }, 1, 0] } }
        }
      }
    ]);

    // Get recent refund activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentRefundActivity = await Payment.aggregate([
      {
        $match: {
          status: 'refunded',
          refundedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$refundedAt' },
            month: { $month: '$refundedAt' },
            day: { $dayOfMonth: '$refundedAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$refundAmount' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      },
      {
        $limit: 30
      }
    ]);

    // Get top refund reasons
    const topRefundReasons = await Payment.aggregate([
      {
        $match: { status: 'refunded' }
      },
      {
        $group: {
          _id: '$refundReason',
          count: { $sum: 1 },
          totalAmount: { $sum: '$refundAmount' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    return NextResponse.json({
      success: true,
      data: {
        refundedPayments,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        statistics: refundStats[0] || {
          totalRefunds: 0,
          totalRefundAmount: 0,
          averageRefundAmount: 0,
          initiated: 0,
          processing: 0,
          refunded: 0,
          failed: 0
        },
        recentActivity: recentRefundActivity,
        topRefundReasons
      }
    });

  } catch (error) {
    console.error('Refund history API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
