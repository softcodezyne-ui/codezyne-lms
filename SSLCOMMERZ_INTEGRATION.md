# SSLCOMMERZ Payment Integration

This document describes the SSLCOMMERZ payment integration implementation for the PetMota LMS course enrollment system.

## Overview

The integration allows students to pay for paid courses using SSLCOMMERZ payment gateway. The system supports both sandbox (testing) and live (production) environments.

## Features

- ✅ Payment initiation for course enrollment
- ✅ SSLCOMMERZ hosted payment page integration
- ✅ Instant Payment Notification (IPN) handling
- ✅ Payment validation and verification
- ✅ Success, failure, and cancel page handling
- ✅ Automatic enrollment upon successful payment
- ✅ Support for both free and paid courses

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# SSLCOMMERZ Configuration
# For Sandbox/Test Environment
SSLCOMMERZ_STORE_ID=testbox
SSLCOMMERZ_STORE_PASSWORD=qwerty
SSLCOMMERZ_SANDBOX_URL=https://sandbox.sslcommerz.com
SSLCOMMERZ_LIVE_URL=https://securepay.sslcommerz.com

# For Production Environment (replace with your actual credentials)
# SSLCOMMERZ_STORE_ID=your_live_store_id
# SSLCOMMERZ_STORE_PASSWORD=your_live_store_password

# Payment URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
SSLCOMMERZ_SUCCESS_URL=http://localhost:3000/payment/success
SSLCOMMERZ_FAIL_URL=http://localhost:3000/payment/fail
SSLCOMMERZ_CANCEL_URL=http://localhost:3000/payment/cancel
SSLCOMMERZ_IPN_URL=http://localhost:3000/api/payment/ipn

# Environment (sandbox or live)
SSLCOMMERZ_ENVIRONMENT=sandbox
```

## API Endpoints

### 1. Payment Initiation
- **Endpoint**: `POST /api/payment/initiate`
- **Purpose**: Initiates payment for course enrollment
- **Request Body**:
  ```json
  {
    "courseId": "string",
    "studentId": "string" // optional, defaults to authenticated user
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "sessionKey": "string",
      "gatewayUrl": "string",
      "redirectUrl": "string",
      "transactionId": "string"
    }
  }
  ```

### 2. IPN Handler
- **Endpoint**: `POST /api/payment/ipn`
- **Purpose**: Handles Instant Payment Notifications from SSLCOMMERZ
- **Note**: This endpoint is called by SSLCOMMERZ servers, not by the frontend

### 3. Payment Validation
- **Endpoint**: `POST /api/payment/validate`
- **Purpose**: Validates payment status using val_id, tran_id, or session_key
- **Request Body**:
  ```json
  {
    "valId": "string", // optional
    "tranId": "string", // optional
    "sessionKey": "string" // optional
  }
  ```

## Payment Flow

1. **Student clicks "Pay & Enroll"** on a paid course
2. **Payment initiation** - System creates enrollment with pending status
3. **Redirect to SSLCOMMERZ** - Student is redirected to payment gateway
4. **Payment processing** - Student completes payment on SSLCOMMERZ
5. **IPN notification** - SSLCOMMERZ sends payment status to IPN endpoint
6. **Enrollment update** - System updates enrollment status based on payment
7. **Redirect back** - Student is redirected to success/fail/cancel page
8. **Payment validation** - Success page validates payment with SSLCOMMERZ

## Payment Pages

### Success Page (`/payment/success`)
- Displays payment confirmation
- Shows transaction details
- Provides access to enrolled course
- Validates payment with SSLCOMMERZ

### Failure Page (`/payment/fail`)
- Displays payment failure information
- Shows common failure reasons
- Provides retry payment option
- Offers support contact information

### Cancel Page (`/payment/cancel`)
- Displays payment cancellation
- Shows no charges were made
- Provides retry payment option
- Offers alternative actions

## Testing

### Sandbox Environment
Use the following test credentials for sandbox testing:

**Test Credit Cards:**
- VISA: 4111111111111111 (Exp: 12/25, CVV: 111)
- Mastercard: 5111111111111111 (Exp: 12/25, CVV: 111)
- American Express: 371111111111111 (Exp: 12/25, CVV: 111)

**Mobile OTP:** 111111 or 123456

### Test URLs
- Sandbox: https://sandbox.sslcommerz.com
- Live: https://securepay.sslcommerz.com

## Security Considerations

1. **IPN Validation**: All IPN notifications are validated with SSLCOMMERZ
2. **Amount Verification**: Payment amounts are verified against course prices
3. **Transaction ID Uniqueness**: Each transaction has a unique ID
4. **HTTPS Required**: All payment URLs must use HTTPS in production
5. **Environment Variables**: Store credentials securely in environment variables

## Error Handling

The system handles various error scenarios:

- **Payment initiation failures**
- **Invalid course or user data**
- **Network connectivity issues**
- **Payment validation failures**
- **IPN processing errors**

## Database Updates

The integration updates the `Enrollment` model with:

- `paymentStatus`: 'pending' | 'paid' | 'refunded' | 'failed'
- `paymentAmount`: Course price
- `paymentMethod`: Payment method used
- `paymentId`: Unique transaction ID

## Monitoring and Logging

- All payment operations are logged
- IPN notifications are logged for debugging
- Payment validation results are logged
- Error messages are captured and logged

## Production Deployment

Before going live:

1. **Update environment variables** with live SSLCOMMERZ credentials
2. **Set SSLCOMMERZ_ENVIRONMENT=live**
3. **Update payment URLs** to use production domain
4. **Test thoroughly** with real payment methods
5. **Monitor IPN endpoint** for proper functionality
6. **Set up SSL certificates** for HTTPS

## Support

For SSLCOMMERZ integration support:

1. **SSLCOMMERZ Documentation**: https://developer.sslcommerz.com/
2. **Sandbox Registration**: https://developer.sslcommerz.com/registration/
3. **Live Registration**: https://signup.sslcommerz.com/register

## Files Created/Modified

### New Files:
- `src/app/api/payment/initiate/route.ts` - Payment initiation API
- `src/app/api/payment/ipn/route.ts` - IPN handler
- `src/app/api/payment/validate/route.ts` - Payment validation API
- `src/app/payment/success/page.tsx` - Payment success page
- `src/app/payment/fail/page.tsx` - Payment failure page
- `src/app/payment/cancel/page.tsx` - Payment cancel page
- `src/hooks/usePayment.ts` - Payment utility hook

### Modified Files:
- `src/app/course/[id]/page.tsx` - Updated enrollment flow
- `src/models/Enrollment.ts` - Already had payment fields

## Next Steps

1. Set up environment variables
2. Test with sandbox environment
3. Configure production credentials
4. Deploy to production
5. Monitor payment processing
6. Set up payment analytics and reporting
