import { NextRequest, NextResponse } from 'next/server';
import { paymentLogger } from '@/lib/paymentLogger';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    console.log('searchParams', searchParams);
    // Extract only transaction ID parameter
    const tranId = searchParams.get('tran_id');

    // Connect to database
    await connectDB();

    // Validate transaction ID
    if (!tranId) {
      console.error('No transaction ID provided');
      const errorUrl = new URL('/payment/success', request.url);
      errorUrl.searchParams.set('error', 'no_transaction_id');
      return NextResponse.redirect(errorUrl.toString(), 302);
    }

    // Find the enrollment by transaction ID to get student and course info
    let enrollment = null;
    let studentId = 'UNKNOWN';
    let courseId = 'UNKNOWN';
    let paymentAmount = 0;

    enrollment = await Enrollment.findOne({ paymentId: tranId })
      .populate('student', 'firstName lastName email')
      .populate('course', 'title price finalPrice');
    
    if (enrollment) {
      studentId = enrollment.student._id.toString();
      courseId = enrollment.course._id.toString();
      paymentAmount = enrollment.paymentAmount || 0;
    } else {
      console.error('Enrollment not found for transaction ID:', tranId);
      const errorUrl = new URL('/payment/success', request.url);
      errorUrl.searchParams.set('error', 'enrollment_not_found');
      return NextResponse.redirect(errorUrl.toString(), 302);
    }

    // Log the redirect
    await paymentLogger.logPaymentValidation({
      transactionId: tranId,
      userId: studentId,
      courseId: courseId,
      amount: paymentAmount,
      currency: 'BDT',
      status: 'SUCCESS',
      ip: paymentLogger.getClientIP(request),
      userAgent: paymentLogger.getUserAgent(request),
      details: {
        redirectType: 'success',
        transactionId: tranId
      }
    });

    // Update payment status and enrollment for successful transaction
    try {
      // Find existing payment record
      const existingPayment = await Payment.findOne({ transactionId: tranId });
      
      if (existingPayment) {
        // Only update if not already successful
        if (existingPayment.status !== 'success') {
          // Update payment with success status
          existingPayment.status = 'success';
          
          // Add mock SSLCOMMERZ data for development
          if (process.env.NODE_ENV === 'development') {
            existingPayment.valId = 'DEV_VAL_ID_' + Date.now();
            existingPayment.bankTranId = 'DEV_BANK_TXN_' + Date.now();
            existingPayment.cardType = 'Visa';
            existingPayment.cardIssuer = 'Development Bank';
            existingPayment.tranDate = new Date().toISOString();
            existingPayment.gatewayResponse = {
              isDevelopmentMode: true,
              status: 'VALID',
              tran_id: tranId,
              amount: paymentAmount.toString(),
              currency: 'BDT'
            };
          }
          
          await existingPayment.save();
          console.log('Payment status updated to success');
        } else {
          console.log('Payment already marked as successful');
        }

        // Update enrollment payment status to paid
        if (enrollment.paymentStatus !== 'paid') {
          enrollment.paymentStatus = 'paid';
          enrollment.status = 'active';
          await enrollment.save();
          console.log('Enrollment status updated to active');
        } else {
          console.log('Enrollment already marked as paid');
        }

        console.log('Payment updated successfully:', {
          paymentId: existingPayment._id,
          transactionId: tranId,
          studentId: studentId,
          courseId: courseId,
          amount: paymentAmount,
          status: existingPayment.status,
          completedAt: existingPayment.completedAt
        });
      } else {
        console.warn('Payment record not found for transaction:', tranId);
      }
    } catch (dbError) {
      console.error('Error updating payment data:', dbError);
      // Continue with redirect even if database update fails
    }

    // Build client URL with only transaction ID
    const clientUrl = new URL('/payment/success', request.url);
    clientUrl.searchParams.set('tran_id', tranId);

    // Redirect to client success page
    return NextResponse.redirect(clientUrl.toString(), 302);

  } catch (error) {
    console.error('Payment success redirect error:', error);
    
    // Log error
    await paymentLogger.logPaymentFailed({
      transactionId: 'UNKNOWN',
      userId: 'UNKNOWN',
      courseId: 'UNKNOWN',
      amount: 0,
      currency: 'BDT',
      error: error instanceof Error ? error.message : 'Payment success redirect error',
      ip: paymentLogger.getClientIP(request),
      userAgent: paymentLogger.getUserAgent(request),
      details: { error: error }
    });

    // Redirect to client success page with error parameter
    const errorUrl = new URL('/payment/success', request.url);
    errorUrl.searchParams.set('error', 'redirect_error');
    return NextResponse.redirect(errorUrl.toString(), 302);
  }
}
