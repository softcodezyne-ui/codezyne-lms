import { NextRequest, NextResponse } from 'next/server';
import { paymentLogger } from '@/lib/paymentLogger';
import connectDB from '@/lib/mongodb';
import Payment from '@/models/Payment';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId: tranId } = await params;
    
    console.log('Transaction ID from path:', tranId);

    // Connect to database
    await connectDB();

    // Validate transaction ID
    if (!tranId) {
      console.error('No transaction ID provided');
      const errorUrl = new URL('/payment/success', request.url);
      errorUrl.searchParams.set('error', 'no_transaction_id');
      return NextResponse.redirect(errorUrl.toString(), 302);
    }

    // // Find the enrollment by transaction ID to get student and course info
    // let enrollment = null;
    // let studentId = 'UNKNOWN';
    // let courseId = 'UNKNOWN';
    // let paymentAmount = 0;

    // enrollment = await Enrollment.findOne({ paymentId: tranId })
    //   .populate('student', 'firstName lastName email')
    //   .populate('course', 'title price finalPrice');
    
    // if (enrollment) {
    //   studentId = enrollment.student._id.toString();
    //   courseId = enrollment.course._id.toString();
    //   paymentAmount = enrollment.paymentAmount || 0;
    // } else {
    //   console.error('Enrollment not found for transaction ID:', tranId);
    //   const errorUrl = new URL('/payment/success', request.url);
    //   errorUrl.searchParams.set('error', 'enrollment_not_found');
    //   return NextResponse.redirect(errorUrl.toString(), 302);
    // }

    // // Log the redirect
    // await paymentLogger.logPaymentValidation({
    //   transactionId: tranId,
    //   userId: studentId,
    //   courseId: courseId,
    //   amount: paymentAmount,
    //   currency: 'BDT',
    //   status: 'SUCCESS',
    //   ip: paymentLogger.getClientIP(request),
    //   userAgent: paymentLogger.getUserAgent(request),
    //   details: {
    //     redirectType: 'success',
    //     transactionId: tranId
    //   }
    // });

    // // Update payment status and enrollment for successful transaction
    // try {
    //   // Find existing payment record
    //   const existingPayment = await Payment.findOne({ transactionId: tranId });
      
    //   if (existingPayment) {
    //     // Update payment with success status
    //     existingPayment.status = 'success';
    //     existingPayment.completedAt = new Date();
    //     await existingPayment.save();

    //     // Update enrollment payment status to paid
    //     enrollment.paymentStatus = 'paid';
    //     enrollment.status = 'active';
    //     await enrollment.save();

    //     console.log('Payment updated successfully:', {
    //       paymentId: existingPayment._id,
    //       transactionId: tranId,
    //       studentId: studentId,
    //       courseId: courseId,
    //       amount: paymentAmount
    //     });
    //   } else {
    //     console.warn('Payment record not found for transaction:', tranId);
    //   }
    // } catch (dbError) {
    //   console.error('Error updating payment data:', dbError);
    //   // Continue with redirect even if database update fails
    // }

    // Build client URL with transaction ID as path parameter
    const clientUrl = new URL(`/payment/success/${tranId}`, request.url);

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
