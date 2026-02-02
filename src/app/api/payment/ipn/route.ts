import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';

// SSLCOMMERZ Configuration
const SSLCOMMERZ_CONFIG = {
  storeId: process.env.SSLCOMMERZ_STORE_ID || 'testbox',
  storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || 'qwerty',
  sandboxUrl: process.env.SSLCOMMERZ_SANDBOX_URL || 'https://sandbox.sslcommerz.com',
  liveUrl: process.env.SSLCOMMERZ_LIVE_URL || 'https://securepay.sslcommerz.com',
  environment: process.env.SSLCOMMERZ_ENVIRONMENT || 'sandbox'
};

interface IPNData {
  status: string;
  tran_date: string;
  tran_id: string;
  val_id: string;
  amount: string;
  store_amount: string;
  card_type: string;
  card_no: string;
  bank_tran_id: string;
  currency: string;
  card_issuer: string;
  card_brand: string;
  card_issuer_country: string;
  card_issuer_country_code: string;
  currency_type: string;
  currency_amount: string;
  currency_rate: string;
  base_fair: string;
  value_a: string; // Student ID
  value_b: string; // Course ID
  value_c: string; // Transaction ID
  value_d: string; // Payment type
  verify_sign: string;
  verify_key: string;
  risk_level: string;
  risk_title: string;
  store_id: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== IPN CALLED ===');
    await connectDB();

    // Get the IPN data from the request body
    const formData = await request.formData();
    const ipnData: Partial<IPNData> = {};
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      ipnData[key as keyof IPNData] = value as string;
    }

    console.log('IPN Data received:', ipnData);
    console.log('Transaction ID:', ipnData.tran_id);
    console.log('Status:', ipnData.status);

    // Validate required fields
    if (!ipnData.tran_id || !ipnData.status || !ipnData.amount) {
      console.error('Missing required IPN fields');
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the payment record first
    const payment = await Payment.findOne({ transactionId: ipnData.tran_id });
    if (!payment) {
      console.error('Payment record not found for transaction:', ipnData.tran_id);
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Find the enrollment by transaction ID
    const enrollment = await Enrollment.findOne({ 
      paymentId: ipnData.tran_id 
    }).populate('studentInfo courseInfo');

    if (!enrollment) {
      console.error('Enrollment not found for transaction:', ipnData.tran_id);
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    // Validate the payment with SSLCOMMERZ (skip validation in development)
    let isValidPayment = true;
    
    if (process.env.NODE_ENV === 'production' && ipnData.val_id) {
      isValidPayment = await validatePaymentWithSSLCOMMERZ(ipnData.val_id);
      if (!isValidPayment) {
        console.error('Payment validation failed for transaction:', ipnData.tran_id);
        return NextResponse.json({ error: 'Payment validation failed' }, { status: 400 });
      }
    } else {
      console.log('Skipping SSLCOMMERZ validation in development mode');
    }

    // Payment record already found above

    console.log("payment status", payment);
    // Update enrollment and payment based on payment status
    switch (ipnData.status) {
      case 'VALID':
    console.log("payment", payment);

        // Update enrollment
        enrollment.paymentStatus = 'paid';
        enrollment.status = 'active';
        enrollment.notes = `Payment successful. Bank Txn ID: ${ipnData.bank_tran_id}`;
        
        // Update payment
        payment.status = 'success';
        payment.valId = ipnData.val_id;
        payment.bankTranId = ipnData.bank_tran_id;
        payment.cardType = ipnData.card_type;
        payment.cardIssuer = ipnData.card_issuer;
        payment.tranDate = ipnData.tran_date;
        payment.gatewayResponse = ipnData;
        
        console.log('Payment successful for enrollment:', enrollment);
        console.log('Payment successful for payment:', payment);
        break;
        
      case 'FAILED':
        // Update enrollment
        enrollment.paymentStatus = 'failed';
        enrollment.notes = `Payment failed. Reason: ${ipnData.risk_title || 'Unknown'}`;
        
        // Update payment
        payment.status = 'failed';
        payment.gatewayResponse = ipnData;
        
        console.log('Payment failed for enrollment:', enrollment._id);
        break;
        
      case 'CANCELLED':
        // Update enrollment
        enrollment.paymentStatus = 'failed';
        enrollment.notes = 'Payment cancelled by user';
        
        // Update payment
        payment.status = 'cancelled';
        payment.gatewayResponse = ipnData;
        
        console.log('Payment cancelled for enrollment:', enrollment._id);
        break;
        
      case 'EXPIRED':
        // Update enrollment
        enrollment.paymentStatus = 'failed';
        enrollment.notes = 'Payment expired';
        
        // Update payment
        payment.status = 'failed';
        payment.gatewayResponse = ipnData;
        
        console.log('Payment expired for enrollment:', enrollment._id);
        break;
        
      case 'UNATTEMPTED':
        // Update enrollment
        enrollment.paymentStatus = 'failed';
        enrollment.notes = 'Payment unattempted';
        
        // Update payment
        payment.status = 'failed';
        payment.gatewayResponse = ipnData;
        
        console.log('Payment unattempted for enrollment:', enrollment._id);
        break;
        
      default:
        console.log('Unknown payment status:', ipnData.status);
        return NextResponse.json({ error: 'Unknown payment status' }, { status: 400 });
    }


    // Save both enrollment and payment
    await Promise.all([
      enrollment.save(),
      payment.save()
    ]);

    // Return success response to SSLCOMMERZ
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('IPN processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Function to validate payment with SSLCOMMERZ
async function validatePaymentWithSSLCOMMERZ(valId: string): Promise<boolean> {
  try {
    const sslcommerzUrl = SSLCOMMERZ_CONFIG.environment === 'live' 
      ? SSLCOMMERZ_CONFIG.liveUrl 
      : SSLCOMMERZ_CONFIG.sandboxUrl;

    const validationUrl = `${sslcommerzUrl}/validator/api/validationserverAPI.php?val_id=${valId}&store_id=${SSLCOMMERZ_CONFIG.storeId}&store_passwd=${SSLCOMMERZ_CONFIG.storePassword}&format=json`;

    const response = await fetch(validationUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();
    
    return result.status === 'VALID' || result.status === 'VALIDATED';
  } catch (error) {
    console.error('Payment validation error:', error);
    return false;
  }
}
