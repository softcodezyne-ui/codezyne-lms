import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Enrollment from '@/models/Enrollment';

// Test IPN endpoint for development
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

    const { transactionId, status = 'VALID' } = await request.json();

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    console.log('=== TEST IPN CALLED ===');
    console.log('Transaction ID:', transactionId);
    console.log('Status:', status);

    // Find the payment record
    const payment = await Payment.findOne({ transactionId });
    
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Find the enrollment
    const enrollment = await Enrollment.findOne({ paymentId: transactionId });
    
    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Simulate IPN data
    const mockIpnData = {
      status: status,
      tran_date: new Date().toISOString(),
      tran_id: transactionId,
      val_id: 'TEST_VAL_ID_' + Date.now(),
      amount: payment.amount.toString(),
      store_amount: payment.amount.toString(),
      card_type: 'Visa',
      card_no: '****1234',
      bank_tran_id: 'TEST_BANK_TXN_' + Date.now(),
      currency: 'BDT',
      card_issuer: 'Test Bank',
      card_brand: 'Visa',
      card_issuer_country: 'Bangladesh',
      card_issuer_country_code: 'BD',
      currency_type: 'BDT',
      currency_amount: payment.amount.toString(),
      currency_rate: '1.00',
      base_fair: '0.00',
      value_a: payment.student.toString(),
      value_b: payment.course.toString(),
      value_c: transactionId,
      value_d: 'course_enrollment',
      verify_sign: 'TEST_SIGN',
      verify_key: 'TEST_KEY',
      risk_level: '0',
      risk_title: 'No Risk',
      store_id: 'testbox'
    };

    // Update enrollment and payment based on payment status
    switch (status) {
      case 'VALID':
        // Update enrollment
        enrollment.paymentStatus = 'paid';
        enrollment.status = 'active';
        enrollment.notes = `Payment successful. Bank Txn ID: ${mockIpnData.bank_tran_id}`;
        
        // Update payment
        payment.status = 'success';
        payment.valId = mockIpnData.val_id;
        payment.bankTranId = mockIpnData.bank_tran_id;
        payment.cardType = mockIpnData.card_type;
        payment.cardIssuer = mockIpnData.card_issuer;
        payment.tranDate = mockIpnData.tran_date;
        payment.gatewayResponse = mockIpnData;
        
        console.log('Payment successful for enrollment:', enrollment._id);
        break;
        
      case 'FAILED':
        // Update enrollment
        enrollment.paymentStatus = 'failed';
        enrollment.notes = `Payment failed. Reason: Test failure`;
        
        // Update payment
        payment.status = 'failed';
        payment.gatewayResponse = mockIpnData;
        
        console.log('Payment failed for enrollment:', enrollment._id);
        break;
        
      default:
        return NextResponse.json({ error: 'Unknown payment status' }, { status: 400 });
    }

    // Save both enrollment and payment
    await Promise.all([
      enrollment.save(),
      payment.save()
    ]);

    return NextResponse.json({
      success: true,
      message: `Payment status updated to ${status}`,
      payment: {
        id: payment._id,
        transactionId: payment.transactionId,
        status: payment.status,
        completedAt: payment.completedAt
      },
      enrollment: {
        id: enrollment._id,
        status: enrollment.status,
        paymentStatus: enrollment.paymentStatus
      }
    });

  } catch (error) {
    console.error('Test IPN processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

