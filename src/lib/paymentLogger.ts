import fs from 'fs';
import path from 'path';

export interface PaymentLogEntry {
  timestamp: string;
  event: 'initiate' | 'success' | 'failed' | 'cancel' | 'validation' | 'ipn' | 'refund_initiate' | 'refund_success' | 'refund_failed' | 'refund_status';
  transactionId?: string;
  userId?: string;
  courseId?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error?: string;
  details?: any;
  ip?: string;
  userAgent?: string;
}

class PaymentLogger {
  private logDir: string;
  private logFile: string;

  constructor() {
    // Create logs directory in project root
    this.logDir = path.join(process.cwd(), 'logs', 'payments');
    this.logFile = path.join(this.logDir, `payment-${new Date().toISOString().split('T')[0]}.log`);
    
    // Ensure log directory exists
    this.ensureLogDirectory();
  }

  private ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private formatLogEntry(entry: PaymentLogEntry): string {
    const logLine = {
      timestamp: entry.timestamp,
      event: entry.event,
      transactionId: entry.transactionId || 'N/A',
      userId: entry.userId || 'N/A',
      courseId: entry.courseId || 'N/A',
      amount: entry.amount || 0,
      currency: entry.currency || 'BDT',
      status: entry.status || 'N/A',
      error: entry.error || 'N/A',
      ip: entry.ip || 'N/A',
      userAgent: entry.userAgent || 'N/A',
      details: entry.details ? JSON.stringify(entry.details) : 'N/A'
    };

    return JSON.stringify(logLine) + '\n';
  }

  async log(entry: PaymentLogEntry): Promise<void> {
    try {
      const logLine = this.formatLogEntry(entry);
      
      // Append to daily log file
      fs.appendFileSync(this.logFile, logLine);
      
      // Also log to console for development
      console.log(`[PAYMENT LOG] ${entry.event.toUpperCase()}:`, {
        transactionId: entry.transactionId,
        userId: entry.userId,
        courseId: entry.courseId,
        amount: entry.amount,
        status: entry.status,
        error: entry.error
      });
    } catch (error) {
      console.error('Failed to write payment log:', error);
    }
  }

  async logPaymentInitiate(data: {
    transactionId: string;
    userId: string;
    courseId: string;
    amount: number;
    currency: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'initiate',
      transactionId: data.transactionId,
      userId: data.userId,
      courseId: data.courseId,
      amount: data.amount,
      currency: data.currency,
      ip: data.ip,
      userAgent: data.userAgent,
      details: data.details
    });
  }

  async logPaymentSuccess(data: {
    transactionId: string;
    userId?: string;
    courseId?: string;
    amount?: number;
    currency?: string;
    status: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'success',
      transactionId: data.transactionId,
      userId: data.userId,
      courseId: data.courseId,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      ip: data.ip,
      userAgent: data.userAgent,
      details: data.details
    });
  }

  async logPaymentFailed(data: {
    transactionId?: string;
    userId?: string;
    courseId?: string;
    amount?: number;
    currency?: string;
    error: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'failed',
      transactionId: data.transactionId,
      userId: data.userId,
      courseId: data.courseId,
      amount: data.amount,
      currency: data.currency,
      error: data.error,
      ip: data.ip,
      userAgent: data.userAgent,
      details: data.details
    });
  }

  async logPaymentCancel(data: {
    transactionId?: string;
    userId?: string;
    courseId?: string;
    amount?: number;
    currency?: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'cancel',
      transactionId: data.transactionId,
      userId: data.userId,
      courseId: data.courseId,
      amount: data.amount,
      currency: data.currency,
      ip: data.ip,
      userAgent: data.userAgent,
      details: data.details
    });
  }

  async logPaymentValidation(data: {
    transactionId: string;
    userId?: string;
    courseId?: string;
    amount?: number;
    currency?: string;
    status: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'validation',
      transactionId: data.transactionId,
      userId: data.userId,
      courseId: data.courseId,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      ip: data.ip,
      userAgent: data.userAgent,
      details: data.details
    });
  }

  async logIPN(data: {
    transactionId?: string;
    userId?: string;
    courseId?: string;
    amount?: number;
    currency?: string;
    status: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'ipn',
      transactionId: data.transactionId,
      userId: data.userId,
      courseId: data.courseId,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      ip: data.ip,
      userAgent: data.userAgent,
      details: data.details
    });
  }

  // Utility method to get client IP from request
  getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    if (cfConnectingIP) {
      return cfConnectingIP;
    }
    
    return 'unknown';
  }

  // Utility method to get user agent from request
  getUserAgent(request: Request): string {
    return request.headers.get('user-agent') || 'unknown';
  }

  // Refund logging methods
  async logPaymentRefund(data: {
    paymentId: string;
    transactionId: string;
    refundTransactionId?: string;
    refundRefId?: string;
    originalAmount: number;
    refundAmount: number;
    refundReason: string;
    adminId: string;
    adminName: string;
    ip?: string;
    userAgent?: string;
    error?: string;
    details?: any;
  }): Promise<void> {
    const event = data.error ? 'refund_failed' : 'refund_initiate';
    
    await this.log({
      timestamp: new Date().toISOString(),
      event,
      transactionId: data.transactionId,
      userId: data.adminId,
      amount: data.refundAmount,
      currency: 'BDT',
      status: data.error ? 'failed' : 'initiated',
      error: data.error,
      ip: data.ip,
      userAgent: data.userAgent,
      details: {
        paymentId: data.paymentId,
        refundTransactionId: data.refundTransactionId,
        refundRefId: data.refundRefId,
        originalAmount: data.originalAmount,
        refundAmount: data.refundAmount,
        refundReason: data.refundReason,
        adminName: data.adminName,
        ...data.details
      }
    });
  }

  async logRefundStatus(data: {
    refundRefId: string;
    status: string;
    adminId: string;
    adminName: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }): Promise<void> {
    await this.log({
      timestamp: new Date().toISOString(),
      event: 'refund_status',
      userId: data.adminId,
      status: data.status,
      ip: data.ip,
      userAgent: data.userAgent,
      details: {
        refundRefId: data.refundRefId,
        adminName: data.adminName,
        ...data.details
      }
    });
  }
}

// Export singleton instance
export const paymentLogger = new PaymentLogger();
export default paymentLogger;
