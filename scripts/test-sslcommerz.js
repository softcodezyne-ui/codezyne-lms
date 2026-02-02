/**
 * SSLCOMMERZ Integration Test Script
 * 
 * This script tests the SSLCOMMERZ payment integration endpoints
 * Run with: node scripts/test-sslcommerz.js
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Test data
const testData = {
  courseId: 'test-course-id',
  studentId: 'test-student-id'
};

async function testPaymentInitiation() {
  console.log('🧪 Testing Payment Initiation...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/payment/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Payment initiation successful');
      console.log('📋 Response:', {
        sessionKey: result.data.sessionKey,
        gatewayUrl: result.data.gatewayUrl,
        transactionId: result.data.transactionId
      });
      return result.data;
    } else {
      console.log('❌ Payment initiation failed:', result.error);
      return null;
    }
  } catch (error) {
    console.log('❌ Payment initiation error:', error.message);
    return null;
  }
}

async function testPaymentValidation(valId, tranId, sessionKey) {
  console.log('🧪 Testing Payment Validation...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/payment/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valId,
        tranId,
        sessionKey
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Payment validation successful');
      console.log('📋 Response:', {
        status: result.data.status,
        transactionId: result.data.transactionId,
        amount: result.data.amount,
        currency: result.data.currency
      });
    } else {
      console.log('❌ Payment validation failed:', result.error);
    }
  } catch (error) {
    console.log('❌ Payment validation error:', error.message);
  }
}

async function testIPNHandler() {
  console.log('🧪 Testing IPN Handler...');
  
  // Simulate IPN data from SSLCOMMERZ
  const ipnData = new URLSearchParams({
    status: 'VALID',
    tran_id: 'test-transaction-id',
    val_id: 'test-validation-id',
    amount: '100.00',
    currency: 'BDT',
    bank_tran_id: 'test-bank-tran-id',
    card_type: 'VISA',
    card_no: '411111****1111',
    card_issuer: 'Test Bank',
    card_brand: 'VISA',
    store_id: 'testbox',
    verify_sign: 'test-verify-sign',
    verify_key: 'test-verify-key',
    value_a: testData.studentId,
    value_b: testData.courseId,
    value_c: 'test-transaction-id',
    value_d: 'course_enrollment'
  });

  try {
    const response = await fetch(`${BASE_URL}/api/payment/ipn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: ipnData.toString()
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ IPN handler successful');
      console.log('📋 Response:', result);
    } else {
      console.log('❌ IPN handler failed:', result.error);
    }
  } catch (error) {
    console.log('❌ IPN handler error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting SSLCOMMERZ Integration Tests\n');
  console.log('📍 Base URL:', BASE_URL);
  console.log('📅 Test Time:', new Date().toISOString());
  console.log('─'.repeat(50));

  // Test 1: Payment Initiation
  const paymentData = await testPaymentInitiation();
  console.log('─'.repeat(50));

  // Test 2: Payment Validation (if payment initiation was successful)
  if (paymentData) {
    await testPaymentValidation(
      'test-val-id',
      paymentData.transactionId,
      paymentData.sessionKey
    );
    console.log('─'.repeat(50));
  }

  // Test 3: IPN Handler
  await testIPNHandler();
  console.log('─'.repeat(50));

  console.log('🏁 Tests completed!');
  console.log('\n📝 Notes:');
  console.log('- Make sure the server is running on', BASE_URL);
  console.log('- Check environment variables are set correctly');
  console.log('- For live testing, update SSLCOMMERZ credentials');
  console.log('- Monitor server logs for detailed error information');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testPaymentInitiation,
  testPaymentValidation,
  testIPNHandler,
  runTests
};
