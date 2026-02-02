'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LuEye as Eye, LuEyeOff as EyeOff, LuPhone as Phone, LuLock as Lock, LuGraduationCap as GraduationCap, LuArrowRight as ArrowRight, LuCheck as CheckCircle, LuUser as User, LuUsers as Users, LuShield as Shield } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { loginUser, clearError } from '@/lib/slices/authSlice';
// import DebugAuth from '@/components/DebugAuth';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [phone, setPhone] = useState('01700000000');
  const [password, setPassword] = useState('admin123');
  
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, user } = useAppSelector((state: any) => state.auth);
  const router = useRouter();

  useEffect(() => {
    // Clear error when component mounts
    dispatch(clearError());
  }, [dispatch]);

  // Handle successful login redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to appropriate dashboard based on user role
      switch (user.role) {
        case 'admin':
          window.location.href = '/admin/dashboard';
          break;
        case 'instructor':
          window.location.href = '/instructor/dashboard';
          break;
        case 'student':
          window.location.href = '/student/courses';
          break;
        default:
          window.location.href = '/dashboard';
      }
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) return;
    
    dispatch(loginUser({ phone, password }));
  };

  const handleQuickLogin = (role: 'admin' | 'teacher' | 'student') => {
    let credentials = { phone: '', password: '' };
    
    switch (role) {
      case 'admin':
        credentials = { phone: '01700000000', password: 'admin123' };
        break;
      case 'teacher':
        credentials = { phone: '01700000001', password: 'teacher123' };
        break;
      case 'student':
        credentials = { phone: '01700000009', password: 'student123' };
        break;
    }
    
    setPhone(credentials.phone);
    setPassword(credentials.password);
    dispatch(loginUser(credentials));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{
      background: "linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
    }}>
      {/* <DebugAuth /> */}
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
          <p className="text-gray-600">Welcome back to your learning journey</p>
        </div>

        {/* Login Card */}
        <Card className="backdrop-blur-sm bg-white/90 border-gray-200/50 shadow-2xl" style={{
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(236, 72, 153, 0.05)",
        }}>
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Phone Field */}
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    className="pl-10 h-11 border-gray-200 focus:border-[#7B2CBF] focus:ring-[#7B2CBF]/20"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="pl-10 pr-10 h-11 border-gray-200 focus:border-[#7B2CBF] focus:ring-[#7B2CBF]/20"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked: any) => setRememberMe(checked as boolean)}
                  />
                  <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                    Remember me
                  </label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium transition-colors"
                  style={{ color: '#7B2CBF' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#A855F7'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#7B2CBF'}
                >
                  Forgot password?
                </Link>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-11 text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                style={{
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
                }}
                disabled={isLoading || !phone || !password}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Quick Login Section */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Quick Login for Testing</span>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickLogin('admin')}
                  disabled={isLoading}
                  className="h-11 border-gray-200 transition-all duration-200"
                  style={{
                    borderColor: '#e5e7eb',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(236, 72, 153, 0.1)';
                    e.currentTarget.style.borderColor = '#EC4899';
                    e.currentTarget.style.color = '#EC4899';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="flex-1">Login as Admin</span>
                  <span className="text-xs text-gray-500 ml-2">01700000000</span>
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickLogin('teacher')}
                  disabled={isLoading}
                  className="h-11 border-gray-200 transition-all duration-200"
                  style={{
                    borderColor: '#e5e7eb',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(168, 85, 247, 0.1)';
                    e.currentTarget.style.borderColor = '#A855F7';
                    e.currentTarget.style.color = '#A855F7';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  <span className="flex-1">Login as Teacher</span>
                  <span className="text-xs text-gray-500 ml-2">01700000001</span>
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleQuickLogin('student')}
                  disabled={isLoading}
                  className="h-11 border-gray-200 transition-all duration-200"
                  style={{
                    borderColor: '#e5e7eb',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(123, 44, 191, 0.1)';
                    e.currentTarget.style.borderColor = '#7B2CBF';
                    e.currentTarget.style.color = '#7B2CBF';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.color = '';
                  }}
                >
                  <User className="w-4 h-4 mr-2" />
                  <span className="flex-1">Login as Student</span>
                  <span className="text-xs text-gray-500 ml-2">01700000002</span>
                </Button>
              </div>
            </div>

            {/* Divider */}
            {/* <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">Or continue with</span>
              </div>
            </div> */}

            {/* Social Login Buttons */}
            {/* <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11 border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              <Button
                variant="outline"
                className="h-11 border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div> */}

            {/* Sign Up Link */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/register"
                  className="font-medium transition-colors"
                  style={{ color: '#7B2CBF' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#A855F7'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#7B2CBF'}
                >
                  Sign up for free
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

   
      </div>
    </div>
  );
}
