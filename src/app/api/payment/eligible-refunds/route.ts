import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import User from '@/models/User';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';

// GET /api/payment/eligible-refunds - Get payments eligible for refund
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
    const search = searchParams.get('search'); // Search by student name, course title, or transaction ID
    const skip = (page - 1) * limit;

    // Build query for payments eligible for refund
    const query: any = { 
      status: 'success',
      refundStatus: { $exists: false }
    };

    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { transactionId: searchRegex },
        { bankTranId: searchRegex }
      ];
    }

    // Get eligible payments with pagination
    const eligiblePayments = await Payment.find(query)
      .populate('student', 'firstName lastName email')
      .populate('course', 'title thumbnailUrl price')
      .populate('enrollment', 'status progress')
      .sort({ completedAt: -1 })
      .limit(limit)
      .skip(skip);

    // Get total count
    const totalCount = await Payment.countDocuments(query);

    // Get statistics for eligible refunds
    const eligibleStats = await Payment.aggregate([
      {
        $match: { 
          status: 'success',
          refundStatus: { $exists: false }
        }
      },
      {
        $group: {
          _id: null,
          totalEligible: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          minAmount: { $min: '$amount' },
          maxAmount: { $max: '$amount' }
        }
      }
    ]);

    // Get eligible payments by course
    const eligibleByCourse = await Payment.aggregate([
      {
        $match: { 
          status: 'success',
          refundStatus: { $exists: false }
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo'
        }
      },
      {
        $unwind: '$courseInfo'
      },
      {
        $group: {
          _id: '$course',
          courseTitle: { $first: '$courseInfo.title' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Get eligible payments by student (simplified)
    const eligibleByStudent: any[] = [];

    return NextResponse.json({
      success: true,
      data: {
        eligiblePayments,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        statistics: eligibleStats[0] || {
          totalEligible: 0,
          totalAmount: 0,
          averageAmount: 0,
          minAmount: 0,
          maxAmount: 0
        },
        byCourse: eligibleByCourse,
        byStudent: eligibleByStudent
      }
    });

  } catch (error) {
    console.error('Eligible refunds API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
