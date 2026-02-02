import { NextRequest, NextResponse } from 'next/server';
import { paymentLogger } from '@/lib/paymentLogger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract SSLCOMMERZ parameters
    const valId = searchParams.get('val_id');
    const tranId = searchParams.get('tran_id');
    const sessionKey = searchParams.get('sessionkey');
    const status = searchParams.get('status');
    const amount = searchParams.get('amount');
    const currency = searchParams.get('currency');

    // Log the payment cancellation
    await paymentLogger.logPaymentFailed({
      transactionId: tranId || 'UNKNOWN',
      userId: 'UNKNOWN',
      courseId: 'UNKNOWN',
      amount: parseFloat(amount || '0') || 0,
      currency: currency || 'BDT',
      error: 'Payment cancelled by user',
      ip: paymentLogger.getClientIP(request),
      userAgent: paymentLogger.getUserAgent(request),
      details: {
        redirectType: 'cancel',
        sslcommerzParams: {
          valId,
          tranId,
          sessionKey,
          status,
          amount,
          currency
        }
      }
    });

    // Build client URL with all parameters
    const clientUrl = new URL('/payment/cancel', request.url);
    
    // Add all SSLCOMMERZ parameters to client URL
    if (valId) clientUrl.searchParams.set('val_id', valId);
    if (tranId) clientUrl.searchParams.set('tran_id', tranId);
    if (sessionKey) clientUrl.searchParams.set('sessionkey', sessionKey);
    if (status) clientUrl.searchParams.set('status', status);
    if (amount) clientUrl.searchParams.set('amount', amount);
    if (currency) clientUrl.searchParams.set('currency', currency);

    // Redirect to client cancel page
    return NextResponse.redirect(clientUrl.toString(), 302);

  } catch (error) {
    console.error('Payment cancel redirect error:', error);
    
    // Log error
    await paymentLogger.logPaymentFailed({
      transactionId: 'UNKNOWN',
      userId: 'UNKNOWN',
      courseId: 'UNKNOWN',
      amount: 0,
      currency: 'BDT',
      error: error instanceof Error ? error.message : 'Payment cancel redirect error',
      ip: paymentLogger.getClientIP(request),
      userAgent: paymentLogger.getUserAgent(request),
      details: { error: error }
    });

    // Redirect to client cancel page with error parameter
    const errorUrl = new URL('/payment/cancel', request.url);
    errorUrl.searchParams.set('error', 'redirect_error');
    return NextResponse.redirect(errorUrl.toString(), 302);
  }
}
