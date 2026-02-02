import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';
import User from '@/models/User';
import { paymentLogger } from '@/lib/paymentLogger';

// SSLCOMMERZ Configuration
const SSLCOMMERZ_CONFIG = {
  storeId: process.env.SSLCOMMERZ_STORE_ID || 'testbox',
  storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || 'qwerty',
  sandboxUrl: process.env.SSLCOMMERZ_SANDBOX_URL || 'https://sandbox.sslcommerz.com',
  liveUrl: process.env.SSLCOMMERZ_LIVE_URL || 'https://securepay.sslcommerz.com',
  environment: process.env.SSLCOMMERZ_ENVIRONMENT || 'sandbox'
};

interface RefundRequest {
  paymentId: string;
  refundAmount?: number;
  refundReason: string;
  adminNotes?: string;
}

interface RefundStatusRequest {
  refundRefId: string;
}

// POST /api/payment/refund - Initiate a refund
export async function POST(request: NextRequest) {
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

    const body: RefundRequest = await request.json();
    const { paymentId, refundAmount, refundReason, adminNotes } = body;

    // Validate required fields
    if (!paymentId || !refundReason) {
      return NextResponse.json(
        { success: false, error: 'Payment ID and refund reason are required' },
        { status: 400 }
      );
    }

    // Find the payment
    const payment = await Payment.findById(paymentId)
      .populate('student', 'name email')
      .populate('course', 'title price')
      .populate('enrollment');

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check if payment is eligible for refund
    if (payment.status !== 'success') {
      return NextResponse.json(
        { success: false, error: 'Only successful payments can be refunded' },
        { status: 400 }
      );
    }

    if (payment.status === 'refunded') {
      return NextResponse.json(
        { success: false, error: 'Payment has already been refunded' },
        { status: 400 }
      );
    }

    // Validate refund amount
    const finalRefundAmount = refundAmount || payment.amount;
    if (finalRefundAmount > payment.amount) {
      return NextResponse.json(
        { success: false, error: 'Refund amount cannot exceed original payment amount' },
        { status: 400 }
      );
    }

    if (finalRefundAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Refund amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Generate unique refund transaction ID
    const refundTransactionId = `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Call SSLCOMMERZ refund API
      const refundResponse = await initiateSSLCOMMERZRefund({
        bankTranId: payment.bankTranId!,
        refundTransactionId,
        refundAmount: finalRefundAmount,
        refundReason,
        storeId: SSLCOMMERZ_CONFIG.storeId,
        storePassword: SSLCOMMERZ_CONFIG.storePassword,
        environment: SSLCOMMERZ_CONFIG.environment
      });

      if (refundResponse.success) {
        // Update payment status
        payment.status = 'refunded';
        payment.refundedAt = new Date();
        payment.refundReason = refundReason;
        payment.notes = adminNotes || '';
        payment.gatewayResponse = {
          ...payment.gatewayResponse,
          refund: {
            refundRefId: refundResponse.refundRefId,
            refundTransactionId,
            refundAmount: finalRefundAmount,
            refundReason,
            initiatedAt: new Date(),
            sslcommerzResponse: refundResponse
          }
        };
        await payment.save();

        // Update enrollment status
        const enrollment = await Enrollment.findById(payment.enrollment);
        if (enrollment) {
          enrollment.paymentStatus = 'refunded';
          enrollment.status = 'cancelled';
          enrollment.notes = `Payment refunded. Refund ID: ${refundResponse.refundRefId}. Reason: ${refundReason}`;
          await enrollment.save();
        }

        // Log refund initiation
        await paymentLogger.logPaymentRefund({
          paymentId: payment._id.toString(),
          transactionId: payment.transactionId,
          refundTransactionId,
          refundRefId: refundResponse.refundRefId,
          originalAmount: payment.amount,
          refundAmount: finalRefundAmount,
          refundReason,
          adminId: session.user.id,
          adminName: user.name || 'Admin',
          ip: paymentLogger.getClientIP(request),
          userAgent: paymentLogger.getUserAgent(request)
        });

        return NextResponse.json({
          success: true,
          data: {
            refundRefId: refundResponse.refundRefId,
            refundTransactionId,
            refundAmount: finalRefundAmount,
            status: 'initiated',
            message: 'Refund initiated successfully'
          }
        });
      } else {
        return NextResponse.json(
          { success: false, error: refundResponse.error || 'Failed to initiate refund' },
          { status: 400 }
        );
      }
    } catch (sslcommerzError) {
      console.error('SSLCOMMERZ refund error:', sslcommerzError);
      
      // Log failed refund attempt
      await paymentLogger.logPaymentRefund({
        paymentId: payment._id.toString(),
        transactionId: payment.transactionId,
        refundTransactionId,
        originalAmount: payment.amount,
        refundAmount: finalRefundAmount,
        refundReason,
        adminId: session.user.id,
        adminName: user.name || 'Admin',
        ip: paymentLogger.getClientIP(request),
        userAgent: paymentLogger.getUserAgent(request),
        error: sslcommerzError instanceof Error ? sslcommerzError.message : 'Unknown error'
      });

      return NextResponse.json(
        { success: false, error: 'Failed to process refund with payment gateway' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Refund API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/payment/refund?refundRefId=xxx - Check refund status
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
    const refundRefId = searchParams.get('refundRefId');

    if (!refundRefId) {
      return NextResponse.json(
        { success: false, error: 'Refund reference ID is required' },
        { status: 400 }
      );
    }

    try {
      // Query SSLCOMMERZ for refund status
      const refundStatus = await querySSLCOMMERZRefundStatus({
        refundRefId,
        storeId: SSLCOMMERZ_CONFIG.storeId,
        storePassword: SSLCOMMERZ_CONFIG.storePassword,
        environment: SSLCOMMERZ_CONFIG.environment
      });

      if (refundStatus.success) {
        // Update payment record if refund is completed
        if (refundStatus.status === 'refunded') {
          const payment = await Payment.findOne({
            'gatewayResponse.refund.refundRefId': refundRefId
          });

          if (payment && payment.gatewayResponse?.refund) {
            payment.gatewayResponse.refund.status = 'refunded';
            payment.gatewayResponse.refund.completedAt = new Date(refundStatus.refundedOn);
            await payment.save();
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            refundRefId,
            status: refundStatus.status,
            initiatedOn: refundStatus.initiatedOn,
            refundedOn: refundStatus.refundedOn,
            bankTranId: refundStatus.bankTranId,
            transId: refundStatus.transId
          }
        });
      } else {
        return NextResponse.json(
          { success: false, error: refundStatus.error || 'Failed to query refund status' },
          { status: 400 }
        );
      }
    } catch (sslcommerzError) {
      console.error('SSLCOMMERZ refund status query error:', sslcommerzError);
      return NextResponse.json(
        { success: false, error: 'Failed to query refund status' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Refund status API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// SSLCOMMERZ Refund API Integration
async function initiateSSLCOMMERZRefund(params: {
  bankTranId: string;
  refundTransactionId: string;
  refundAmount: number;
  refundReason: string;
  storeId: string;
  storePassword: string;
  environment: string;
}) {
  const { bankTranId, refundTransactionId, refundAmount, refundReason, storeId, storePassword, environment } = params;
  
  const baseUrl = environment === 'live' ? SSLCOMMERZ_CONFIG.liveUrl : SSLCOMMERZ_CONFIG.sandboxUrl;
  const apiUrl = `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`;

  const queryParams = new URLSearchParams({
    bank_tran_id: bankTranId,
    refund_trans_id: refundTransactionId,
    refund_amount: refundAmount.toString(),
    refund_remarks: refundReason,
    store_id: storeId,
    store_passwd: storePassword,
    v: '1',
    format: 'json'
  });

  try {
    const response = await fetch(`${apiUrl}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.APIConnect === 'DONE' && data.status === 'success') {
      return {
        success: true,
        refundRefId: data.refund_ref_id,
        bankTranId: data.bank_tran_id,
        transId: data.trans_id,
        status: data.status
      };
    } else {
      return {
        success: false,
        error: data.errorReason || 'Refund initiation failed'
      };
    }
  } catch (error) {
    console.error('SSLCOMMERZ refund API error:', error);
    return {
      success: false,
      error: 'Failed to connect to payment gateway'
    };
  }
}

// SSLCOMMERZ Refund Status Query
async function querySSLCOMMERZRefundStatus(params: {
  refundRefId: string;
  storeId: string;
  storePassword: string;
  environment: string;
}) {
  const { refundRefId, storeId, storePassword, environment } = params;
  
  const baseUrl = environment === 'live' ? SSLCOMMERZ_CONFIG.liveUrl : SSLCOMMERZ_CONFIG.sandboxUrl;
  const apiUrl = `${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`;

  const queryParams = new URLSearchParams({
    refund_ref_id: refundRefId,
    store_id: storeId,
    store_passwd: storePassword,
    format: 'json'
  });

  try {
    const response = await fetch(`${apiUrl}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (data.APIConnect === 'DONE') {
      return {
        success: true,
        refundRefId: data.refund_ref_id,
        status: data.status,
        initiatedOn: data.initiated_on,
        refundedOn: data.refunded_on,
        bankTranId: data.bank_tran_id,
        transId: data.tran_id
      };
    } else {
      return {
        success: false,
        error: data.errorReason || 'Failed to query refund status'
      };
    }
  } catch (error) {
    console.error('SSLCOMMERZ refund status API error:', error);
    return {
      success: false,
      error: 'Failed to connect to payment gateway'
    };
  }
}
