import { NextRequest, NextResponse } from 'next/server';
import { paymentLogger } from '@/lib/paymentLogger';

interface PaymentLogRequest {
  event: 'success' | 'failed' | 'cancel' | 'initiate' | 'validation' | 'ipn';
  transactionId: string;
  status?: string;
  amount?: string;
  currency?: string;
  details?: any;
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentLogRequest = await request.json();
    const { event, transactionId, status, amount, currency, details } = body;

    // Get client information
    const ip = paymentLogger.getClientIP(request);
    const userAgent = paymentLogger.getUserAgent(request);

    // Log based on event type
    switch (event) {
      case 'success':
        await paymentLogger.logPaymentSuccess({
          transactionId,
          status: status || 'SUCCESS',
          amount: amount ? parseFloat(amount) : undefined,
          currency: currency || 'BDT',
          ip,
          userAgent,
          details
        });
        break;

      case 'failed':
        await paymentLogger.logPaymentFailed({
          transactionId,
          amount: amount ? parseFloat(amount) : undefined,
          currency: currency || 'BDT',
          error: status || 'Payment failed',
          ip,
          userAgent,
          details
        });
        break;

      case 'cancel':
        await paymentLogger.logPaymentCancel({
          transactionId,
          amount: amount ? parseFloat(amount) : undefined,
          currency: currency || 'BDT',
          ip,
          userAgent,
          details
        });
        break;

      case 'initiate':
        await paymentLogger.logPaymentInitiate({
          transactionId,
          userId: 'CLIENT_SIDE',
          courseId: 'UNKNOWN',
          amount: amount ? parseFloat(amount) : 0,
          currency: currency || 'BDT',
          ip,
          userAgent,
          details
        });
        break;

      case 'validation':
        await paymentLogger.logPaymentValidation({
          transactionId,
          userId: 'CLIENT_SIDE',
          courseId: 'UNKNOWN',
          amount: amount ? parseFloat(amount) : 0,
          currency: currency || 'BDT',
          status: status || 'VALID',
          ip,
          userAgent,
          details
        });
        break;

      case 'ipn':
        await paymentLogger.logIPN({
          transactionId,
          userId: 'CLIENT_SIDE',
          courseId: 'UNKNOWN',
          amount: amount ? parseFloat(amount) : 0,
          currency: currency || 'BDT',
          status: status || 'RECEIVED',
          ip,
          userAgent,
          details
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid event type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Payment log error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to log payment event' },
      { status: 500 }
    );
  }
}
