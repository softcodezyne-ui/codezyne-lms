import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Course from '@/models/Course';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import Payment from '@/models/Payment';
import { paymentLogger } from '@/lib/paymentLogger';

// SSLCOMMERZ Configuration
const SSLCOMMERZ_CONFIG = {
  storeId: process.env.SSLCOMMERZ_STORE_ID || 'testbox',
  storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || 'qwerty',
  sandboxUrl: process.env.SSLCOMMERZ_SANDBOX_URL || 'https://sandbox.sslcommerz.com',
  liveUrl: process.env.SSLCOMMERZ_LIVE_URL || 'https://securepay.sslcommerz.com',
  environment: 'sandbox',
  successUrl: process.env.SSLCOMMERZ_SUCCESS_URL || 'http://localhost:3000/payment/success',
  failUrl: process.env.SSLCOMMERZ_FAIL_URL || 'http://localhost:3000/payment/fail',
  cancelUrl: process.env.SSLCOMMERZ_CANCEL_URL || 'http://localhost:3000/payment/cancel',
  ipnUrl: process.env.SSLCOMMERZ_IPN_URL || 'http://localhost:3000/payment/ipn'
};


console.log(SSLCOMMERZ_CONFIG);
interface PaymentInitiateRequest {
  courseId: string;
  studentId?: string;
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

    const body: PaymentInitiateRequest = await request.json();
    const { courseId, studentId } = body;
    const userId = studentId || session.user.id;

    // Validate required fields
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Check if course exists and is paid
    const course = await Course.findById(courseId);
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    if (!course.isPaid) {
      return NextResponse.json(
        { success: false, error: 'Course is free, no payment required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({ 
      student: userId, 
      course: courseId 
    });
    
    if (existingEnrollment) {
      if (existingEnrollment.paymentStatus === 'paid') {
        return NextResponse.json(
          { success: false, error: 'Already enrolled in this course' },
          { status: 409 }
        );
      }
    }

    // Generate unique transaction ID
    const tranId = `ENROLL_${courseId}_${userId}_${Date.now()}`;
    
    // Prepare payment data for SSLCOMMERZ
    const paymentData = {
      store_id: SSLCOMMERZ_CONFIG.storeId,
      store_passwd: SSLCOMMERZ_CONFIG.storePassword,
      total_amount: course.finalPrice || course.price,
      currency: 'BDT',
      tran_id: tranId,
      success_url: `${SSLCOMMERZ_CONFIG.successUrl}/${tranId}`,
      fail_url: `${SSLCOMMERZ_CONFIG.failUrl}?tran_id=${tranId}`,
      cancel_url: `${SSLCOMMERZ_CONFIG.cancelUrl}?tran_id=${tranId}`,
      ipn_url: `${SSLCOMMERZ_CONFIG.ipnUrl}?tran_id=${tranId}`,
      
      // Customer Information
      cus_name: `${user.firstName} ${user.lastName}`,
      cus_email: user.email,
      cus_add1: user.address || 'Dhaka',
      cus_add2: '',
      cus_city: user.city || 'Dhaka',
      cus_state: user.state || 'Dhaka',
      cus_postcode: user.postalCode || '1000',
      cus_country: 'Bangladesh',
      cus_phone: user.phone || '01700000000',
      cus_fax: '',
      
      // Product Information
      product_name: course.title,
      product_category: course.category || 'education',
      product_profile: 'general',
      
      // Shipping Information (Required by SSLCOMMERZ)
      shipping_method: 'NO', // No physical shipping for online courses
      
      // Additional parameters
      value_a: userId, // Student ID
      value_b: courseId, // Course ID
      value_c: tranId, // Transaction ID
      value_d: 'course_enrollment' // Payment type
    };

    // Create or update enrollment with pending payment initially
    // This enrollment will be activated when payment succeeds
    let enrollment;
    if (existingEnrollment) {
      existingEnrollment.paymentStatus = 'pending';
      existingEnrollment.paymentAmount = course.finalPrice || course.price;
      existingEnrollment.paymentId = tranId;
      existingEnrollment.status = 'suspended'; // Keep suspended until payment succeeds
      await existingEnrollment.save();
      enrollment = existingEnrollment;
    } else {
      enrollment = new Enrollment({
        student: userId,
        course: courseId,
        paymentStatus: 'pending',
        paymentAmount: course.finalPrice || course.price,
        paymentId: tranId,
        status: 'suspended', // Keep suspended until payment succeeds
        enrolledAt: new Date()
      });
      await enrollment.save();
    }

    // Make request to SSLCOMMERZ
    const sslcommerzUrl = SSLCOMMERZ_CONFIG.environment === 'live' 
      ? SSLCOMMERZ_CONFIG.liveUrl 
      : SSLCOMMERZ_CONFIG.sandboxUrl;

    let response;
    try {
      response = await fetch(`${sslcommerzUrl}/gwprocess/v4/api.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(paymentData).toString()
      });
    } catch (fetchError) {
      console.error('Failed to connect to SSLCOMMERZ:', fetchError);
      
      // For development, provide a mock response
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: SSLCOMMERZ connection failed, providing mock response');
        
        // Store payment data for connection failure mock response
        try {
          const mockSessionKey = 'MOCK_SESSION_' + Date.now();
          const paymentData = {
            transactionId: tranId,
            student: userId,
            course: courseId,
            enrollment: enrollment._id,
            amount: course.finalPrice || course.price,
            currency: 'BDT',
            status: 'success',
            paymentGateway: 'sslcommerz',
            sessionKey: mockSessionKey,
            gatewayResponse: { 
              isMockResponse: true,
              connectionError: true,
              error: 'SSLCOMMERZ connection failed'
            },
            ipAddress: paymentLogger.getClientIP(request),
            userAgent: paymentLogger.getUserAgent(request),
            initiatedAt: new Date()
          };

          const payment = new Payment(paymentData);
          await payment.save();

          // Create/activate enrollment for mock response
          if (!enrollment) {
            enrollment = new Enrollment({
              student: userId,
              course: courseId,
              paymentStatus: 'paid',
              paymentAmount: course.finalPrice || course.price,
              paymentId: tranId,
              status: 'active',
              enrolledAt: new Date(),
              progress: 0
            });
            await enrollment.save();
          } else {
          enrollment.paymentStatus = 'paid';
          enrollment.status = 'active';
            enrollment.enrolledAt = enrollment.enrolledAt || new Date();
          await enrollment.save();
          }

          console.log('Connection failure mock payment record created:', {
            paymentId: payment._id,
            transactionId: tranId,
            studentId: userId,
            courseId: courseId,
            amount: course.finalPrice || course.price,
            sessionKey: mockSessionKey
          });
        } catch (paymentError) {
          console.error('Error creating connection failure mock payment record:', paymentError);
        }
        
        return NextResponse.json({
          success: true,
          data: {
            sessionKey: 'MOCK_SESSION_' + Date.now(),
            gatewayUrl: 'https://sandbox.sslcommerz.com/gwprocess/v4/gw.php',
            redirectUrl: 'https://sandbox.sslcommerz.com/gwprocess/v4/gw.php',
            transactionId: tranId
          }
        });
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unable to connect to payment gateway' 
        },
        { status: 500 }
      );
    }

    let result;
    try {
      result = await response.json();
      // console.log('SSLCOMMERZ Response:', result);
    } catch (parseError) {
      console.error('Failed to parse SSLCOMMERZ response:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid response from payment gateway' 
        },
        { status: 400 }
      );
    }

    // Validate response structure
    if (!result || typeof result !== 'object') {
      console.error('Invalid SSLCOMMERZ response structure:', result);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid response format from payment gateway' 
        },
        { status: 400 }
      );
    }


    console.log("result", result);
 
    if (result.status === 'SUCCESS') {
      // Create/activate enrollment when payment initiation succeeds
      if (!enrollment) {
        // Create new enrollment if it doesn't exist
        enrollment = new Enrollment({
          student: userId,
          course: courseId,
          paymentStatus: 'paid',
          paymentAmount: course.finalPrice || course.price,
          paymentId: tranId,
          status: 'active',
          enrolledAt: new Date(),
          progress: 0
        });
        await enrollment.save();
        console.log('Enrollment created successfully on payment initiation success:', {
          enrollmentId: enrollment._id,
          studentId: userId,
          courseId: courseId,
          transactionId: tranId
        });
      } else {
        // Update existing enrollment to active and paid
      enrollment.paymentStatus = 'paid';
      enrollment.status = 'active';
        enrollment.enrolledAt = enrollment.enrolledAt || new Date();
      await enrollment.save();
        console.log('Enrollment activated on payment initiation success:', {
          enrollmentId: enrollment._id,
          studentId: userId,
          courseId: courseId,
          transactionId: tranId
        });
      }
      // Validate and clean up URLs from SSLCOMMERZ response
      const gatewayUrl = result.GatewayPageURL && result.GatewayPageURL !== 'null' ? result.GatewayPageURL : null;
      const redirectUrl = result.redirectGatewayURL && result.redirectGatewayURL !== 'null' ? result.redirectGatewayURL : null;
      const sessionKey = result.sessionkey && result.sessionkey !== 'null' ? result.sessionkey : null;

      // Validate URL format
      const isValidUrl = (url: string) => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      // If no valid gateway URL, return error
      if (!gatewayUrl || !isValidUrl(gatewayUrl)) {
        console.error('No valid gateway URL from SSLCOMMERZ:', result);
        
        // Log payment initiation failure
        await paymentLogger.logPaymentFailed({
          transactionId: tranId,
          userId: userId,
          courseId: courseId,
          amount: course.finalPrice || course.price,
          currency: 'BDT',
          error: 'Invalid payment gateway response - no valid URL provided',
          ip: paymentLogger.getClientIP(request),
          userAgent: paymentLogger.getUserAgent(request),
          details: { sslcommerzResponse: result }
        });
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid payment gateway response - no valid URL provided' 
          },
          { status: 400 }
        );
      }

      // Store payment data only when SSLCOMMERZ response is successful
      try {
        const paymentData = {
          transactionId: tranId,
          student: userId,
          course: courseId,
          enrollment: enrollment._id,
          amount: course.finalPrice || course.price,
          currency: 'BDT',
          status: 'success',
          paymentGateway: 'sslcommerz',
          sessionKey: sessionKey,
          gatewayResponse: result,
          ipAddress: paymentLogger.getClientIP(request),
          userAgent: paymentLogger.getUserAgent(request),
          initiatedAt: new Date()
        };

        const payment = new Payment(paymentData);
      const savedPayment = await payment.save();
      console.log("savedPayment", savedPayment);

        console.log('Payment record created successfully:', {
          paymentId: payment._id,
          transactionId: tranId,
          studentId: userId,
          courseId: courseId,
          amount: course.finalPrice || course.price,
          sessionKey: sessionKey
        });

        // Ensure enrollment is active and paid since SSLCOMMERZ response is successful
        if (enrollment) {
        enrollment.paymentStatus = 'paid';
        enrollment.status = 'active';
          enrollment.enrolledAt = enrollment.enrolledAt || new Date();
          await enrollment.save();
          console.log('Enrollment confirmed as active and paid:', {
            enrollmentId: enrollment._id,
            studentId: userId,
            courseId: courseId,
            transactionId: tranId
          });
        } else {
          // Create enrollment if it doesn't exist
          enrollment = new Enrollment({
            student: userId,
            course: courseId,
            paymentStatus: 'paid',
            paymentAmount: course.finalPrice || course.price,
            paymentId: tranId,
            status: 'active',
            enrolledAt: new Date(),
            progress: 0
          });
        await enrollment.save();
          console.log('Enrollment created after payment record saved:', {
            enrollmentId: enrollment._id,
            studentId: userId,
            courseId: courseId,
            transactionId: tranId
          });
        }
      } catch (paymentError) {
        console.error('Error creating payment record:', paymentError);
        // Continue with payment initiation even if payment record creation fails
      }

      // Log successful payment initiation
      await paymentLogger.logPaymentInitiate({
        transactionId: tranId,
        userId: userId,
        courseId: courseId,
        amount: course.finalPrice || course.price,
        currency: 'BDT',
        ip: paymentLogger.getClientIP(request),
        userAgent: paymentLogger.getUserAgent(request),
        details: { 
          sslcommerzResponse: result,
          gatewayUrl: gatewayUrl,
          sessionKey: sessionKey
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          sessionKey: sessionKey,
          gatewayUrl: gatewayUrl,
          redirectUrl: redirectUrl,
          transactionId: tranId
        }
      });
    } else {
      console.error('SSLCOMMERZ Error:', result);
      
      // Log payment initiation failure
      await paymentLogger.logPaymentFailed({
        transactionId: tranId,
        userId: userId,
        courseId: courseId,
        amount: course.finalPrice || course.price,
        currency: 'BDT',
        error: result.failedreason || 'Payment initiation failed',
        ip: paymentLogger.getClientIP(request),
        userAgent: paymentLogger.getUserAgent(request),
        details: { sslcommerzResponse: result }
      });
      
      // For development/testing, provide a fallback mock response
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Providing mock payment response');
        
        // Store payment data for mock response
        try {
          const mockSessionKey = 'MOCK_SESSION_' + Date.now();
          const paymentData = {
            transactionId: tranId,
            student: userId,
            course: courseId,
            enrollment: enrollment._id,
            amount: course.finalPrice || course.price,
            currency: 'BDT',
            status: 'success',
            paymentGateway: 'sslcommerz',
            sessionKey: mockSessionKey,
            gatewayResponse: { 
              ...result, 
              isMockResponse: true,
              originalError: result.failedreason || 'Payment initiation failed'
            },
            ipAddress: paymentLogger.getClientIP(request),
            userAgent: paymentLogger.getUserAgent(request),
            initiatedAt: new Date()
          };

          const payment = new Payment(paymentData);
         const savedPayment = await payment.save();
          console.log("savedPayment", savedPayment);

          // Create/activate enrollment for mock response
          if (!enrollment) {
            enrollment = new Enrollment({
              student: userId,
              course: courseId,
              paymentStatus: 'paid',
              paymentAmount: course.finalPrice || course.price,
              paymentId: tranId,
              status: 'active',
              enrolledAt: new Date(),
              progress: 0
            });
            await enrollment.save();
          } else {
          enrollment.paymentStatus = 'paid';
          enrollment.status = 'active';
            enrollment.enrolledAt = enrollment.enrolledAt || new Date();
          await enrollment.save();
          }

          console.log('Mock payment record created:', {
            paymentId: payment._id,
            transactionId: tranId,
            studentId: userId,
            courseId: courseId,
            amount: course.finalPrice || course.price,
            sessionKey: mockSessionKey
          });
        } catch (paymentError) {
          console.error('Error creating mock payment record:', paymentError);
        }
        
        // Log mock payment initiation
        await paymentLogger.logPaymentInitiate({
          transactionId: tranId,
          userId: userId,
          courseId: courseId,
          amount: course.finalPrice || course.price,
          currency: 'BDT',
          ip: paymentLogger.getClientIP(request),
          userAgent: paymentLogger.getUserAgent(request),
          details: { 
            isMockResponse: true,
            originalError: result.failedreason || 'Payment initiation failed',
            sslcommerzResponse: result
          }
        });
        
        return NextResponse.json({
          success: true,
          data: {
            sessionKey: 'MOCK_SESSION_' + Date.now(),
            gatewayUrl: 'https://sandbox.sslcommerz.com/gwprocess/v4/gw.php',
            redirectUrl: 'https://sandbox.sslcommerz.com/gwprocess/v4/gw.php',
            transactionId: tranId
          }
        });
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: result.failedreason || 'Payment initiation failed' 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Payment initiation error:', error);
    
    // Log payment initiation error
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
