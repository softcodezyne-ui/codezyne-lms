import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Enrollment from '@/models/Enrollment';

// Manual payment status update for development/testing
export async function POST(request: NextRequest) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, error: 'This endpoint is only available in development mode' },
        { status: 403 }
      );
    }

    await connectDB();

    const { transactionId, status } = await request.json();

    if (!transactionId || !status) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID and status are required' },
        { status: 400 }
      );
    }

    // Find the payment
    const payment = await Payment.findOne({ transactionId });
    
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Update payment status
    payment.status = status;
    
    if (status === 'success') {
      payment.valId = 'MANUAL_VAL_ID_' + Date.now();
      payment.bankTranId = 'MANUAL_BANK_TXN_' + Date.now();
      payment.cardType = 'Visa';
      payment.cardIssuer = 'Manual Update';
      payment.tranDate = new Date().toISOString();
      payment.gatewayResponse = {
        isManualUpdate: true,
        status: 'VALID',
        tran_id: transactionId,
        amount: payment.amount.toString(),
        currency: 'BDT'
      };
    }

    await payment.save();

    // Update enrollment if payment is successful
    if (status === 'success') {
      const enrollment = await Enrollment.findOne({ paymentId: transactionId });
      if (enrollment) {
        enrollment.paymentStatus = 'paid';
        enrollment.status = 'active';
        await enrollment.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment status updated to ${status}`,
      payment: {
        id: payment._id,
        transactionId: payment.transactionId,
        status: payment.status,
        completedAt: payment.completedAt
      }
    });

  } catch (error) {
    console.error('Manual payment update error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

