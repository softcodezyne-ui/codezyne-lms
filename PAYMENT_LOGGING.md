# Payment Logging System

This document describes the comprehensive payment logging system implemented for the PetMota LMS application.

## Overview

The payment logging system captures all payment-related events and stores them in structured log files for monitoring, debugging, and analytics purposes.

## Features

- ✅ **Comprehensive Event Logging**: Captures all payment events (initiate, success, failed, cancel, validation, IPN)
- ✅ **File-based Storage**: Logs are stored in daily rotating files
- ✅ **Structured Data**: JSON format for easy parsing and analysis
- ✅ **Client Information**: Captures IP addresses and user agents
- ✅ **Error Tracking**: Detailed error logging with context
- ✅ **Development Support**: Mock responses and fallback logging

## Log Structure

### Log Directory
```
logs/
└── payments/
    ├── payment-2024-01-15.log
    ├── payment-2024-01-16.log
    └── payment-2024-01-17.log
```

### Log Entry Format
Each log entry is a JSON object with the following structure:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "event": "success",
  "transactionId": "ENROLL_123_456_1705312245123",
  "userId": "user123",
  "courseId": "course456",
  "amount": 99.99,
  "currency": "BDT",
  "status": "VALID",
  "error": "N/A",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "details": {
    "validationResult": {...},
    "enrollmentUpdated": true,
    "enrollmentId": "enrollment789"
  }
}
```

## Events Logged

### 1. Payment Initiation (`initiate`)
- **When**: User clicks "Pay & Enroll" button
- **Data**: Transaction ID, user ID, course ID, amount, SSLCOMMERZ response
- **Location**: `/api/payment/initiate`

### 2. Payment Success (`success`)
- **When**: User completes payment successfully
- **Data**: Transaction details, validation results, enrollment status
- **Location**: `/payment/success` page

### 3. Payment Failed (`failed`)
- **When**: Payment fails or user is redirected to fail page
- **Data**: Error details, transaction ID, failure reason
- **Location**: `/payment/fail` page

### 4. Payment Cancelled (`cancel`)
- **When**: User cancels payment or is redirected to cancel page
- **Data**: Transaction ID, cancellation reason
- **Location**: `/payment/cancel` page

### 5. Payment Validation (`validation`)
- **When**: Payment is validated with SSLCOMMERZ
- **Data**: Validation results, enrollment updates
- **Location**: `/api/payment/validate`

### 6. IPN (Instant Payment Notification) (`ipn`)
- **When**: SSLCOMMERZ sends IPN callback
- **Data**: IPN data, payment status updates
- **Location**: `/api/payment/ipn`

## Usage

### Viewing Logs

#### Using the Log Viewer Script
```bash
# View all payment logs
node scripts/view-payment-logs.js
```

#### Manual Log Access
```bash
# View today's logs
cat logs/payments/payment-$(date +%Y-%m-%d).log

# View specific event types
grep '"event":"success"' logs/payments/payment-$(date +%Y-%m-%d).log

# View logs with errors
grep '"error":"[^N]' logs/payments/payment-$(date +%Y-%m-%d).log
```

### Log Analysis

#### Count Events by Type
```bash
grep -o '"event":"[^"]*"' logs/payments/payment-*.log | sort | uniq -c
```

#### Find Failed Payments
```bash
grep '"event":"failed"' logs/payments/payment-*.log | jq '.error'
```

#### Track Specific Transaction
```bash
grep "ENROLL_123_456_1705312245123" logs/payments/payment-*.log
```

## Configuration

### Environment Variables
No additional environment variables are required. The logging system uses the existing SSLCOMMERZ configuration.

### Log Rotation
- Logs are automatically rotated daily
- Old logs are preserved for historical analysis
- No automatic cleanup (implement as needed)

## Error Handling

### Graceful Degradation
- If logging fails, the application continues to function
- Errors are logged to console for debugging
- No user-facing impact from logging failures

### Fallback Logging
- Development mode includes mock responses
- Generic success messages when validation fails
- Comprehensive error context in all log entries

## Monitoring

### Key Metrics to Monitor
1. **Success Rate**: `success` events vs total events
2. **Failure Rate**: `failed` events vs total events
3. **Cancellation Rate**: `cancel` events vs total events
4. **Average Transaction Amount**: From `amount` field
5. **Error Patterns**: Common error messages

### Alerting Recommendations
- High failure rate (>10%)
- Repeated validation errors
- SSLCOMMERZ API errors
- Database connection issues

## Security Considerations

### Sensitive Data
- No credit card numbers are logged
- No passwords or API keys in logs
- Transaction IDs are safe to log
- IP addresses are captured for security

### Log Access
- Logs are stored in project directory
- Ensure proper file permissions
- Consider log encryption for production
- Implement log rotation and cleanup

## Troubleshooting

### Common Issues

#### No Logs Being Created
- Check if `logs/payments/` directory exists
- Verify file permissions
- Check console for logging errors

#### Missing Event Data
- Ensure all payment pages are using the logging functions
- Check API endpoints for logging calls
- Verify client-side logging is working

#### Log File Size Issues
- Implement log rotation
- Consider log compression
- Set up automated cleanup

### Debug Mode
Enable detailed logging by checking console output:
```bash
# Run with debug logging
DEBUG=payment* npm run dev
```

## Future Enhancements

### Planned Features
- [ ] Log aggregation and analytics dashboard
- [ ] Real-time log monitoring
- [ ] Automated alerting system
- [ ] Log export functionality
- [ ] Performance metrics tracking

### Integration Options
- [ ] ELK Stack (Elasticsearch, Logstash, Kibana)
- [ ] Cloud logging services (AWS CloudWatch, Google Cloud Logging)
- [ ] Database storage for structured queries
- [ ] Webhook notifications for critical events

## Support

For issues with the payment logging system:
1. Check the console for error messages
2. Verify log file permissions
3. Review the log viewer script output
4. Check SSLCOMMERZ integration status

---

**Note**: This logging system is designed for development and production monitoring. Ensure proper security measures are in place when deploying to production environments.
