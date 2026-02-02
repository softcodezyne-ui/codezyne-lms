# Refund Payment Implementation

This document describes the comprehensive refund payment system implemented for the PetMota LMS.

## Overview

The refund system allows administrators to process refunds for successful payments through SSLCOMMERZ integration, with full tracking, logging, and audit trail capabilities.

## Features Implemented

### ✅ Core Refund Functionality
- **Refund Processing**: Process full or partial refunds for successful payments
- **SSLCOMMERZ Integration**: Direct integration with SSLCOMMERZ refund API
- **Status Tracking**: Real-time refund status monitoring
- **Enrollment Management**: Automatic enrollment cancellation on refund

### ✅ API Endpoints

#### 1. Refund Processing
- **Endpoint**: `POST /api/payment/refund`
- **Purpose**: Initiate refund for a payment
- **Request Body**:
  ```json
  {
    "paymentId": "string",
    "refundAmount": "number (optional)",
    "refundReason": "string",
    "adminNotes": "string (optional)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "refundRefId": "string",
      "refundTransactionId": "string",
      "refundAmount": "number",
      "status": "initiated",
      "message": "string"
    }
  }
  ```

#### 2. Refund Status Query
- **Endpoint**: `GET /api/payment/refund?refundRefId=xxx`
- **Purpose**: Check refund status
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "refundRefId": "string",
      "status": "string",
      "initiatedOn": "string",
      "refundedOn": "string",
      "bankTranId": "string",
      "transId": "string"
    }
  }
  ```

#### 3. Eligible Refunds
- **Endpoint**: `GET /api/payment/eligible-refunds`
- **Purpose**: Get payments eligible for refund
- **Query Parameters**: `page`, `limit`, `search`
- **Response**: List of successful payments that can be refunded

#### 4. Refund History
- **Endpoint**: `GET /api/payment/refund-history`
- **Purpose**: Get refund history and statistics
- **Query Parameters**: `page`, `limit`, `status`
- **Response**: Refunded payments with statistics

### ✅ Database Updates

#### Payment Model Enhancements
- Added refund-specific fields:
  - `refundAmount`: Amount to be refunded
  - `refundRefId`: SSLCOMMERZ refund reference ID
  - `refundStatus`: Current refund status
  - `refundedBy`: Admin who processed the refund
- Added static methods:
  - `getRefunded()`: Get refunded payments
  - `getEligibleForRefund()`: Get payments eligible for refund

#### Enrollment Status Updates
- Automatic enrollment cancellation when refund is processed
- Status change to 'cancelled' with refund details in notes

### ✅ Logging and Audit Trail

#### Enhanced Payment Logger
- Added refund-specific logging methods:
  - `logPaymentRefund()`: Log refund initiation
  - `logRefundStatus()`: Log refund status checks
- Comprehensive audit trail for all refund operations
- IP address and user agent tracking

#### Log Events
- `refund_initiate`: Refund initiation
- `refund_success`: Successful refund
- `refund_failed`: Failed refund
- `refund_status`: Status check

### ✅ Admin Dashboard Components

#### RefundManagement Component
- **Location**: `src/components/RefundManagement.tsx`
- **Features**:
  - View eligible payments for refund
  - Process refunds with reason and amount
  - Track refund status
  - View refund history and statistics
  - Search and filter functionality

#### Custom Hooks
- **useRefunds**: Core refund operations
- **useEligibleRefunds**: Manage eligible payments
- **useRefundHistory**: Manage refund history

### ✅ SSLCOMMERZ Integration

#### Refund API Integration
- **Initiate Refund**: Direct API call to SSLCOMMERZ
- **Status Query**: Check refund status with SSLCOMMERZ
- **Error Handling**: Comprehensive error handling and logging
- **Environment Support**: Both sandbox and live environments

#### API Endpoints Used
- **Sandbox**: `https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php`
- **Live**: `https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php`

## Usage

### For Administrators

1. **Access Refund Management**:
   - Navigate to admin dashboard
   - Access refund management section

2. **Process Refund**:
   - View eligible payments
   - Click "Process Refund" for desired payment
   - Enter refund reason and amount
   - Submit refund request

3. **Track Refund Status**:
   - View refund history
   - Check status of initiated refunds
   - Monitor refund statistics

### API Usage

```typescript
// Process a refund
const refundResponse = await fetch('/api/payment/refund', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentId: 'payment_id',
    refundAmount: 100.00,
    refundReason: 'Customer request',
    adminNotes: 'Internal notes'
  })
});

// Check refund status
const statusResponse = await fetch('/api/payment/refund?refundRefId=refund_ref_id');
```

## Security Features

- **Admin Authentication**: Only admin users can process refunds
- **Amount Validation**: Refund amount cannot exceed original payment
- **Status Validation**: Only successful payments can be refunded
- **Audit Trail**: Complete logging of all refund operations
- **IP Tracking**: Track admin IP addresses for refund operations

## Error Handling

- **Validation Errors**: Comprehensive input validation
- **SSLCOMMERZ Errors**: Proper error handling for payment gateway issues
- **Database Errors**: Transaction rollback on failures
- **Network Errors**: Retry mechanisms and proper error messages

## Monitoring and Analytics

- **Refund Statistics**: Total refunds, amounts, and trends
- **Status Tracking**: Real-time refund status monitoring
- **Performance Metrics**: Refund processing times
- **Audit Reports**: Complete refund audit trail

## Files Created/Modified

### New Files:
- `src/app/api/payment/refund/route.ts` - Main refund API
- `src/app/api/payment/refund-history/route.ts` - Refund history API
- `src/app/api/payment/eligible-refunds/route.ts` - Eligible refunds API
- `src/components/RefundManagement.tsx` - Admin dashboard component
- `src/hooks/useRefunds.ts` - Refund management hooks

### Modified Files:
- `src/models/Payment.ts` - Enhanced with refund fields and methods
- `src/lib/paymentLogger.ts` - Added refund logging functionality

## Environment Variables

Ensure these SSLCOMMERZ environment variables are set:
```env
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_ENVIRONMENT=sandbox # or 'live'
```

## Testing

### Sandbox Testing
- Use SSLCOMMERZ sandbox environment
- Test with sandbox credentials
- Verify refund processing and status tracking

### Production Deployment
- Update environment variables for live SSLCOMMERZ
- Set `SSLCOMMERZ_ENVIRONMENT=live`
- Test with real payment methods
- Monitor refund processing

## Support and Maintenance

- **Logs**: Check payment logs in `logs/payments/` directory
- **Monitoring**: Monitor refund status and processing times
- **Troubleshooting**: Use audit trail for debugging refund issues
- **Updates**: Keep SSLCOMMERZ integration updated with API changes

## Next Steps

1. **Integration**: Add refund management to admin navigation
2. **Notifications**: Implement email notifications for refund status
3. **Reporting**: Create detailed refund reports and analytics
4. **Automation**: Add automated refund processing for specific conditions
5. **Mobile**: Ensure mobile responsiveness for refund management

## Security Considerations

- **Access Control**: Ensure only authorized admins can process refunds
- **Amount Limits**: Implement refund amount limits if needed
- **Time Limits**: Consider refund time limits (e.g., 30 days)
- **Approval Workflow**: Consider multi-level approval for large refunds
- **Documentation**: Maintain proper documentation for all refunds

This implementation provides a complete, production-ready refund system with SSLCOMMERZ integration, comprehensive logging, and admin dashboard functionality.
