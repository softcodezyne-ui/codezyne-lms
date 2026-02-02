import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tranId: string }> }
) {

  // console.log('params', params);
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { tranId } = await params;
    console.log('tranId', tranId);

    // Validate transaction ID parameter
    if (!tranId || typeof tranId !== 'string' || tranId.trim() === '') {
      console.error('Invalid transaction ID parameter:', { tranId, type: typeof tranId });
      return NextResponse.json(
        { success: false, error: 'Invalid transaction ID' },
        { status: 400 }
      );
    }

    // Additional validation to ensure the transaction ID doesn't contain malicious characters
    // Allow alphanumeric, underscore, hyphen, and dot - typical for IDs like ENROLL_68da96aca51d1bd60234118a_68dbc4d7c4255375eaf325ff_1759554398774
    if (!/^[a-zA-Z0-9._-]+$/.test(tranId)) {
      console.error('Transaction ID contains invalid characters:', tranId);
      return NextResponse.json(
        { success: false, error: 'Invalid transaction ID format' },
        { status: 400 }
      );
    }
    // Find payment by transaction ID
    const payment = await Payment.findOne({ transactionId: tranId })
      .populate('student', 'firstName lastName email phone address')
      .populate('course', 'title description thumbnailUrl price finalPrice category')
      .populate('enrollment', 'status progress enrolledAt lastAccessedAt');

      console.log('payment', payment);
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check if user can access this payment
    // Admin can access any payment, student can only access their own
    if (session.user.role !== 'admin' && payment.student._id.toString() !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Get payment details error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
