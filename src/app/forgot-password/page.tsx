'use client';

import { useState } from 'react';
import { LuMail as Mail, LuArrowLeft as ArrowLeft, LuCheck as CheckCircle, LuGraduationCap as GraduationCap } from 'react-icons/lu';;
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate password reset process
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 2000);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
        background: "linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
      }}>
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)' }}></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)' }}></div>
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Success Card */}
          <Card className="backdrop-blur-sm bg-white/90 border-gray-200/50 shadow-2xl" style={{
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(236, 72, 153, 0.05)",
          }}>
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                  <CheckCircle className="w-8 h-8" style={{ color: '#10B981' }} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
                <p className="text-gray-600 mb-6">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Didn't receive the email? Check your spam folder or{' '}
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="font-medium transition-colors"
                    style={{ color: '#7B2CBF' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#A855F7'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#7B2CBF'}
                  >
                    try again
                  </button>
                </p>
                <Link href="/login">
                  <Button className="w-full h-11 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl" style={{
                    background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                    boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #DB2777 0%, #9333EA 100%)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(236, 72, 153, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(236, 72, 153, 0.3)";
                  }}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      background: "linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
    }}>
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)' }}></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(123, 44, 191, 0.08)' }}></div>
      </div>

      {/* Mathematical Symbols Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-12 h-12 flex items-center justify-center">
          <div className="w-8 h-0.5" style={{ backgroundColor: '#EC4899' }}></div>
          <div className="absolute w-0.5 h-8" style={{ backgroundColor: '#EC4899' }}></div>
        </div>
        <div className="absolute top-40 right-32 w-12 h-12 flex items-center justify-center">
          <div className="w-8 h-0.5" style={{ backgroundColor: '#A855F7' }}></div>
          <div className="absolute w-1 h-1 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-1" style={{ backgroundColor: '#A855F7' }}></div>
          <div className="absolute w-1 h-1 rounded-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-1" style={{ backgroundColor: '#A855F7' }}></div>
        </div>
        <div className="absolute bottom-32 left-40 w-12 h-12 flex items-center justify-center">
          <div className="w-8 h-8 border rounded-full relative" style={{ borderColor: '#7B2CBF' }}>
            <div className="absolute top-1/2 left-1/2 w-0.5 h-4 transform -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: '#7B2CBF' }}></div>
            <div className="absolute top-1/2 left-1/2 w-4 h-0.5 transform -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: '#7B2CBF' }}></div>
          </div>
        </div>
        <div className="absolute bottom-20 right-20 w-12 h-12 flex items-center justify-center">
          <div className="w-8 h-4 border rounded-full relative" style={{ borderColor: '#FF6B35' }}>
            <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 rounded-tl-full" style={{ borderColor: '#FF6B35' }}></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 rounded-br-full" style={{ borderColor: '#FF6B35' }}></div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4" style={{
            background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
            boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
          }}>
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span style={{ color: '#7B2CBF' }}>Code</span>
            <span style={{ color: '#FF6B35' }}>Zyne</span>
          </h1>
          <p className="text-gray-600">Reset your password</p>
        </div>

        {/* Forgot Password Card */}
        <Card className="backdrop-blur-sm bg-white/90 border-gray-200/50 shadow-2xl" style={{
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(236, 72, 153, 0.05)",
        }}>
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Forgot Password?</CardTitle>
            <CardDescription className="text-center text-gray-600">
              No worries! Enter your email and we'll send you reset instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="pl-10 h-11 border-gray-200 focus:border-[#7B2CBF] focus:ring-[#7B2CBF]/20"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Reset Button */}
              <Button
                type="submit"
                className="w-full h-11 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                style={{
                  background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                  boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = "linear-gradient(135deg, #DB2777 0%, #9333EA 100%)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(236, 72, 153, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(236, 72, 153, 0.3)";
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Sending reset link...</span>
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>

            {/* Back to Login */}
            <div className="text-center mt-6">
              <Link
                href="/login"
                className="inline-flex items-center text-sm font-medium transition-colors"
                style={{ color: '#7B2CBF' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#A855F7'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#7B2CBF'}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="mt-8 text-center">
          <div className="rounded-lg p-4" style={{
            backgroundColor: 'rgba(123, 44, 191, 0.1)',
            border: '1px solid rgba(123, 44, 191, 0.2)',
          }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: '#7B2CBF' }}>Need Help?</h3>
            <p className="text-xs" style={{ color: '#7B2CBF' }}>
              If you're having trouble accessing your account, contact our support team at{' '}
              <a 
                href="mailto:support@eduhub.com" 
                className="font-medium hover:underline"
                style={{ color: '#A855F7' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#9333EA'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#A855F7'}
              >
                support@eduhub.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
