import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import { paymentLogger } from '@/lib/paymentLogger';

interface CheckTransactionRequest {
  tranId: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const body: CheckTransactionRequest = await request.json();
    const { tranId } = body;

    // Validate required fields
    if (!tranId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    // Check if transaction ID exists in our database
    const enrollment = await Enrollment.findOne({ paymentId: tranId });

    if (!enrollment) {
      // Log invalid transaction ID attempt
      await paymentLogger.logPaymentFailed({
        transactionId: tranId,
        userId: session.user.id,
        courseId: 'UNKNOWN',
        amount: 0,
        currency: 'BDT',
        error: 'Invalid transaction ID - transaction not found in database',
        ip: paymentLogger.getClientIP(request),
        userAgent: paymentLogger.getUserAgent(request),
        details: { 
          tranId: tranId,
          reason: 'Transaction ID does not exist in enrollment records'
        }
      });
      
      return NextResponse.json({
        success: true,
        exists: false,
        message: 'Transaction ID not found'
      });
    }

    // Log successful transaction check
    await paymentLogger.logPaymentValidation({
      transactionId: tranId,
      userId: session.user.id,
      courseId: enrollment.course?.toString() || 'UNKNOWN',
      amount: enrollment.paymentAmount || 0,
      currency: 'BDT',
      status: 'FOUND',
      ip: paymentLogger.getClientIP(request),
      userAgent: paymentLogger.getUserAgent(request),
      details: { 
        enrollmentId: enrollment._id?.toString(),
        paymentStatus: enrollment.paymentStatus,
        enrollmentStatus: enrollment.status
      }
    });

    return NextResponse.json({
      success: true,
      exists: true,
      message: 'Transaction ID found',
      enrollment: {
        id: enrollment._id,
        status: enrollment.status,
        paymentStatus: enrollment.paymentStatus,
        paymentAmount: enrollment.paymentAmount
      }
    });

  } catch (error) {
    console.error('Transaction check error:', error);
    
    // Log transaction check error
    await paymentLogger.logPaymentFailed({
      transactionId: 'UNKNOWN',
      userId: 'UNKNOWN',
      courseId: 'UNKNOWN',
      amount: 0,
      currency: 'BDT',
      error: error instanceof Error ? error.message : 'Internal server error',
      ip: paymentLogger.getClientIP(request),
      userAgent: paymentLogger.getUserAgent(request),
      details: { error: error }
    });
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
