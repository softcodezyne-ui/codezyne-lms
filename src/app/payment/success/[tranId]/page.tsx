'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { LuCheck as CheckCircle, LuArrowRight as ArrowRight, LuBookOpen as BookOpen, LuDownload as Download, LuShare2 as Share2, LuCopy as Copy, LuCheck as Check, LuSparkles as Sparkles } from 'react-icons/lu';

interface PaymentSuccessData {
  status: string;
  transactionId: string;
  amount: string;
  currency: string;
  initiatedAt: string;
  completedAt: string;
  bankTranId: string;
  cardType: string;
  cardIssuer: string;
  paymentMethod: string;
  paymentGateway: string;
  enrollment: {
    id: string;
    status: string;
    paymentStatus: string;
  };
  course?: {
    _id: string;
    title: string;
    thumbnailUrl?: string;
};
}

// Client-side logging function
const logPaymentSuccess = async (data: {
  transactionId: string;
  status: string;
  amount?: string;
  currency?: string;
  details?: any;
}) => {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    const response = await fetch('/api/payment/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'success',
        transactionId: data.transactionId,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        details: data.details
      })
    });

    if (!response.ok) {
      console.warn('Failed to log payment success:', response.status);
    }
  } catch (error) {
    console.error('Failed to log payment success:', error);
  }
};

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const tranId = params.tranId as string;
  const [paymentData, setPaymentData] = useState<PaymentSuccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isValidated, setIsValidated] = useState<boolean | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndValidatePayment = async () => {
      if (!tranId) {
        setError('No transaction ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // First, fetch payment data from database
        const paymentResponse = await fetch(`/api/payments/${tranId}`);
        const paymentResult = await paymentResponse.json();

        console.log('Payment data from DB:', paymentResult);
        
        if (!paymentResponse.ok || !paymentResult.success) {
          console.error('Payment fetch failed:', {
            status: paymentResponse.status,
            statusText: paymentResponse.statusText,
            error: paymentResult.error,
            data: paymentResult
          });
          setError(paymentResult.error || 'Failed to fetch payment details');
          return;
        }

        // Extract course ID if available
        if (paymentResult.data?.courseId) {
          setCourseId(paymentResult.data.courseId);
        }

        // Then validate the payment with SSLCOMMERZ
        const validationResponse = await fetch('/api/payment/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tranId: tranId,
            valId: paymentResult.data.valId,
            sessionKey: paymentResult.data.sessionKey
          })
        });

        const validationResult = await validationResponse.json();
        console.log('Validation result:', validationResult);

        if (validationResponse.ok && validationResult.success) {
          // Use validated data from SSLCOMMERZ
          setPaymentData({
            status: validationResult.data.status,
            transactionId: validationResult.data.transactionId,
            amount: validationResult.data.amount,
            currency: validationResult.data.currency,
            initiatedAt: paymentResult.data.initiatedAt,
            completedAt: validationResult.data.paymentDate,
            bankTranId: validationResult.data.bankTransactionId,
            cardType: validationResult.data.cardType,
            cardIssuer: validationResult.data.cardIssuer,
            paymentMethod: validationResult.data.cardType || 'Credit Card',
            paymentGateway: 'sslcommerz',
            enrollment: validationResult.data.enrollment || paymentResult.data.enrollment,
            course: paymentResult.data.course
          });
          setIsValidated(true);
          
          // Log successful payment
          await logPaymentSuccess({
            transactionId: validationResult.data.transactionId,
            status: validationResult.data.status,
            amount: validationResult.data.amount,
            currency: validationResult.data.currency,
            details: { 
              enrollment: validationResult.data.enrollment,
              validated: true
            }
          });
        } else {
          // If validation fails, still show the payment data but with a warning
          console.warn('Payment validation failed, showing database data:', {
            validationError: validationResult.error,
            validationStatus: validationResponse.status,
            validationResult: validationResult
          });
          setPaymentData({
            status: paymentResult.data.status,
            transactionId: paymentResult.data.transactionId,
            amount: paymentResult.data.amount,
            currency: paymentResult.data.currency,
            initiatedAt: paymentResult.data.initiatedAt,
            completedAt: paymentResult.data.completedAt,
            bankTranId: paymentResult.data.bankTranId,
            cardType: paymentResult.data.cardType,
            cardIssuer: paymentResult.data.cardIssuer,
            paymentMethod: paymentResult.data.paymentMethod || paymentResult.data.cardType || 'N/A',
            paymentGateway: paymentResult.data.paymentGateway || 'sslcommerz',
            enrollment: paymentResult.data.enrollment,
            course: paymentResult.data.course
          });
          setIsValidated(false);
          
          // Log payment with validation warning
          await logPaymentSuccess({
            transactionId: paymentResult.data.transactionId,
            status: paymentResult.data.status,
            amount: paymentResult.data.amount,
            currency: paymentResult.data.currency,
            details: { 
              enrollment: paymentResult.data.enrollment,
              validated: false,
              validationError: validationResult.error
            }
          });
        }
      } catch (err) {
        console.error('Error fetching/validating payment data:', {
          error: err,
          tranId: tranId,
          stack: err instanceof Error ? err.stack : undefined
        });
        setError(`Failed to load payment details: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAndValidatePayment();
  }, [tranId]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const truncateTransactionId = (id: string) => {
    if (id === 'N/A') return id;
    if (id.length <= 20) return id;
    return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
            </div>
          </div>
          <p className="text-lg text-gray-700 font-medium" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
            পেমেন্ট যাচাই করা হচ্ছে...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-red-600">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
            পেমেন্ট ত্রুটি
          </h1>
          <p className="text-gray-600 mb-8" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>{error}</p>
          <div className="space-y-3">
            <Link href="/student/courses">
              <button className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3.5 font-semibold text-white transition-all hover:shadow-lg">
                <div className="flex items-center justify-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>আমার কোর্সসমূহ</span>
                </div>
              </button>
            </Link>
            <Link href="/">
              <button className="w-full rounded-lg border-2 border-gray-300 bg-white px-6 py-3.5 font-semibold text-gray-700 transition-all hover:bg-gray-50">
                <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>হোমে ফিরে যান</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-green-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-teal-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Confetti Effect */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-green-400 rounded-full animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 py-12">
        <div className="w-full max-w-3xl">
          {/* Success Header Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6 animate-fade-in-up">
            <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-8 text-center relative overflow-hidden">
              {/* Sparkle decorations */}
              <Sparkles className="absolute top-4 left-4 w-6 h-6 text-white/50 animate-pulse" />
              <Sparkles className="absolute top-4 right-4 w-6 h-6 text-white/50 animate-pulse" style={{ animationDelay: '0.5s' }} />
              <Sparkles className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-6 h-6 text-white/50 animate-pulse" style={{ animationDelay: '1s' }} />
              
              <div className="relative z-10">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 animate-scale-in">
                  <CheckCircle className="w-14 h-14 text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                  🎉 পেমেন্ট সফল হয়েছে!
                </h1>
                <p className="text-xl text-white/90" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                  আপনার কোর্স নিবন্ধন নিশ্চিত করা হয়েছে
                </p>
              </div>
            </div>

            {/* Course Info (if available) */}
            {paymentData?.course && (
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-4">
                  {paymentData.course.thumbnailUrl && (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={paymentData.course.thumbnailUrl}
                        alt={paymentData.course.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                      কোর্স
                    </p>
                    <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                      {paymentData.course.title}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                পেমেন্ট বিবরণ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    লেনদেন আইডি
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold text-gray-900">
                      {truncateTransactionId(paymentData?.transactionId || 'N/A')}
                    </p>
                    {paymentData?.transactionId && paymentData.transactionId !== 'N/A' && (
                      <button
                        onClick={() => copyToClipboard(paymentData.transactionId)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Copy full transaction ID"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500 hover:text-gray-700" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    পরিশোধিত অর্থ
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {paymentData?.amount} {paymentData?.currency}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    পেমেন্ট তারিখ
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {paymentData?.completedAt 
                      ? new Date(paymentData.completedAt).toLocaleDateString('bn-BD', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) 
                      : paymentData?.initiatedAt 
                        ? new Date(paymentData.initiatedAt).toLocaleDateString('bn-BD', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) 
                        : 'N/A'
                    }
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                    পেমেন্ট পদ্ধতি
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {paymentData?.paymentMethod || paymentData?.cardType || 'N/A'}
                    {paymentData?.cardIssuer && ` (${paymentData.cardIssuer})`}
                  </p>
                </div>
                {paymentData?.bankTranId && (
                  <div className="md:col-span-2 bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                      ব্যাংক লেনদেন আইডি
                    </p>
                    <p className="font-mono text-sm font-medium text-gray-900">{paymentData.bankTranId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Enrollment Status */}
            <div className="px-6 pb-6">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-green-800 font-bold text-lg" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                      নিবন্ধন সক্রিয়
                    </p>
                    <p className="text-green-700 text-sm" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                      এখন আপনি কোর্সের সমস্ত কনটেন্ট এবং উপকরণে সম্পূর্ণ অ্যাক্সেস পাবেন
                    </p>
                  </div>
                </div>
                  </div>
                  </div>
                </div>

          {/* Next Steps Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-2xl font-bold text-gray-900 mb-6" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
              পরবর্তী ধাপসমূহ
            </h3>
            <div className="space-y-4">
              {[
                {
                  number: '১',
                  title: 'আপনার কোর্স অ্যাক্সেস করুন',
                  description: 'সমস্ত কোর্স উপকরণ এবং কনটেন্টে অবিলম্বে অ্যাক্সেস শুরু করুন',
                  icon: BookOpen,
                  color: 'from-blue-500 to-cyan-500'
                },
                {
                  number: '২',
                  title: 'রিসোর্স ডাউনলোড করুন',
                  description: 'ডাউনলোডযোগ্য উপকরণ এবং রিসোর্সে অ্যাক্সেস পান',
                  icon: Download,
                  color: 'from-purple-500 to-pink-500'
                },
                {
                  number: '৩',
                  title: 'অগ্রগতি ট্র্যাক করুন',
                  description: 'আপনার শেখার অগ্রগতি নিরীক্ষণ করুন এবং অ্যাসাইনমেন্ট সম্পন্ন করুন',
                  icon: CheckCircle,
                  color: 'from-green-500 to-emerald-500'
                }
              ].map((step, index) => (
                <div key={index} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`w-12 h-12 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-gray-400">{step.number}</span>
                      <p className="font-bold text-gray-900" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                        {step.title}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
              </div>
            </div>

            {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {courseId ? (
              <Link href={`/course/${courseId}`} className="flex-1">
                <button className="w-full rounded-xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-700 text-white px-6 py-4 font-bold text-lg transition-all hover:shadow-xl transform hover:scale-105">
                  <div className="flex items-center justify-center gap-3">
                    <BookOpen className="w-6 h-6" />
                    <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>কোর্স শুরু করুন</span>
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </button>
              </Link>
            ) : (
              <Link href="/student/courses" className="flex-1">
                <button className="w-full rounded-xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-700 text-white px-6 py-4 font-bold text-lg transition-all hover:shadow-xl transform hover:scale-105">
                  <div className="flex items-center justify-center gap-3">
                    <BookOpen className="w-6 h-6" />
                    <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>আমার কোর্সসমূহ</span>
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </button>
              </Link>
            )}
              <Link href="/" className="flex-1">
              <button className="w-full rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-6 py-4 font-bold text-lg transition-all hover:shadow-lg">
                <div className="flex items-center justify-center gap-3">
                  <Share2 className="w-5 h-5" />
                  <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>হোমে ফিরে যান</span>
                </div>
              </button>
              </Link>
            </div>

          {/* Support Information */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500" style={{ fontFamily: "var(--font-bengali), sans-serif" }}>
              সাহায্যের প্রয়োজন? আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন বা কোর্স অ্যাক্সেসের বিবরণের জন্য আপনার ইমেইল চেক করুন।
            </p>
          </div>
            </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
