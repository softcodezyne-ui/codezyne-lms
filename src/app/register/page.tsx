'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LuEye as Eye, LuEyeOff as EyeOff, LuPhone as Phone, LuLock as Lock, LuUser as User, LuGraduationCap as GraduationCap, LuArrowRight as ArrowRight, LuCheck as CheckCircle, LuUpload as Upload, LuX as X, LuLoader as Loader2 } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { registerUser, clearError } from '@/lib/slices/authSlice';
import Image from 'next/image';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [avatar, setAvatar] = useState<string>('');
  const [avatarPublicId, setAvatarPublicId] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated, user } = useAppSelector((state: any) => state.auth);

  useEffect(() => {
    // Clear error when component mounts
    dispatch(clearError());
  }, [dispatch]);

  // Handle successful registration redirect
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
          window.location.href = '/student/dashboard';
          break;
        default:
          window.location.href = '/dashboard';
      }
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous validation errors
    setValidationErrors({});
    
    const errors: Record<string, string> = {};

    // Validate first name
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    // Validate last name
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    // Validate phone number
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(cleanPhone)) {
        errors.phone = 'Please enter a valid phone number (e.g., 01712345678)';
      }
    }

    // Validate password
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Validate terms
    if (!agreeToTerms) {
      errors.terms = 'You must agree to the terms and conditions';
    }

    // If there are validation errors, set them and return
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // All validations passed, proceed with registration
    dispatch(registerUser({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
      avatar: avatar || undefined,
      role: 'student' // Only allow student registration
    }));
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setValidationErrors({...validationErrors, avatar: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'});
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setValidationErrors({...validationErrors, avatar: 'File too large. Maximum size is 5MB.'});
      return;
    }

    setUploadingAvatar(true);
    setUploadProgress(0);
    setValidationErrors({...validationErrors, avatar: ''});

    try {
      // Upload to Cloudinary using public endpoint
      const formData = new FormData();
      formData.append('avatar', file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      const response = await new Promise<Response>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers({
                'Content-Type': 'application/json'
              })
            }));
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', '/api/upload/avatar/public');
        xhr.send(formData);
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      if (result.success && result.imageUrl) {
        setAvatar(result.imageUrl);
        setAvatarPublicId(result.publicId || '');
        setValidationErrors({...validationErrors, avatar: ''});
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setValidationErrors({...validationErrors, avatar: errorMessage});
      setAvatar('');
      setAvatarPublicId('');
    } finally {
      setUploadingAvatar(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar('');
    setAvatarPublicId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setValidationErrors({...validationErrors, avatar: ''});
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

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
          <p className="text-gray-600">Join thousands of learners worldwide</p>
        </div>

        {/* Register Card */}
        <Card className="backdrop-blur-sm bg-white/90 border-gray-200/50 shadow-2xl" style={{
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(236, 72, 153, 0.05)",
        }}>
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center text-gray-600">
              Start your learning journey today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Avatar Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 text-center block">
                  Profile Picture (Optional)
                </label>
                <div className="flex flex-col items-center space-y-3">
                  {/* Avatar Display */}
                  <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                    {avatar ? (
                      <Image
                        src={avatar}
                        alt="Avatar preview"
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Loading Overlay */}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                        <div className="text-white text-xs font-medium">
                          {uploadProgress}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {uploadingAvatar && (
                    <div className="w-full max-w-48">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarClick}
                      disabled={uploadingAvatar}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {uploadingAvatar ? `Uploading... ${uploadProgress}%` : 'Upload'}
                      </span>
                    </Button>

                    {avatar && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveAvatar}
                        disabled={uploadingAvatar}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-4 h-4" />
                        <span>Remove</span>
                      </Button>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleAvatarUpload(file);
                      }
                    }}
                    className="hidden"
                    disabled={uploadingAvatar}
                  />

                  {/* File Info */}
                  <div className="text-xs text-gray-500 text-center">
                    <p>Max size: 5MB</p>
                    <p>Formats: JPEG, PNG, GIF, WebP</p>
                  </div>
                </div>
                {validationErrors.avatar && (
                  <p className="text-xs text-red-600 text-center">{validationErrors.avatar}</p>
                )}
              </div>

              {/* First Name Field */}
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    className="pl-10 h-11 border-gray-200 focus:border-[#7B2CBF] focus:ring-[#7B2CBF]/20"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    required
                  />
                </div>
              </div>

              {/* Last Name Field */}
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    className={`pl-10 h-11 border-gray-200 focus:border-[#7B2CBF] focus:ring-[#7B2CBF]/20 ${
                      validationErrors.lastName ? 'border-red-300 focus:border-red-500' : ''
                    }`}
                    value={formData.lastName}
                    onChange={(e) => {
                      setFormData({...formData, lastName: e.target.value});
                      if (validationErrors.lastName) {
                        setValidationErrors({...validationErrors, lastName: ''});
                      }
                    }}
                    required
                  />
                </div>
                {validationErrors.lastName && (
                  <p className="text-xs text-red-600">{validationErrors.lastName}</p>
                )}
              </div>

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
                    className={`pl-10 h-11 border-gray-200 focus:border-[#7B2CBF] focus:ring-[#7B2CBF]/20 ${
                      validationErrors.phone ? 'border-red-300 focus:border-red-500' : ''
                    }`}
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({...formData, phone: e.target.value});
                      if (validationErrors.phone) {
                        setValidationErrors({...validationErrors, phone: ''});
                      }
                    }}
                    required
                  />
                </div>
                {validationErrors.phone ? (
                  <p className="text-xs text-red-600">{validationErrors.phone}</p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Enter your phone number (e.g., 01712345678)
                  </p>
                )}
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
                    placeholder="Create a password"
                    className={`pl-10 pr-10 h-11 border-gray-200 focus:border-[#7B2CBF] focus:ring-[#7B2CBF]/20 ${
                      validationErrors.password ? 'border-red-300 focus:border-red-500' : ''
                    }`}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({...formData, password: e.target.value});
                      if (validationErrors.password) {
                        setValidationErrors({...validationErrors, password: ''});
                      }
                      // Clear confirm password error if passwords now match
                      if (validationErrors.confirmPassword && e.target.value === formData.confirmPassword) {
                        setValidationErrors({...validationErrors, confirmPassword: ''});
                      }
                    }}
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
                {validationErrors.password && (
                  <p className="text-xs text-red-600">{validationErrors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className={`pl-10 pr-10 h-11 border-gray-200 focus:border-[#7B2CBF] focus:ring-[#7B2CBF]/20 ${
                      validationErrors.confirmPassword ? 'border-red-300 focus:border-red-500' : ''
                    }`}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({...formData, confirmPassword: e.target.value});
                      if (validationErrors.confirmPassword) {
                        setValidationErrors({...validationErrors, confirmPassword: ''});
                      }
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-xs text-red-600">{validationErrors.confirmPassword}</p>
                )}
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

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeToTerms}
                  onCheckedChange={(checked: any) => {
                    setAgreeToTerms(checked as boolean);
                    if (validationErrors.terms) {
                      setValidationErrors({...validationErrors, terms: ''});
                    }
                  }}
                  className={`mt-1 ${validationErrors.terms ? 'border-red-500' : ''}`}
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I agree to the{' '}
                  <Link 
                    href="/terms" 
                    className="font-medium transition-colors"
                    style={{ color: '#7B2CBF' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#A855F7'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#7B2CBF'}
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link 
                    href="/privacy" 
                    className="font-medium transition-colors"
                    style={{ color: '#7B2CBF' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#A855F7'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#7B2CBF'}
                  >
                    Privacy Policy
                  </Link>
                </label>
              </div>
              {validationErrors.terms && (
                <p className="text-xs text-red-600">{validationErrors.terms}</p>
              )}

              {/* Register Button */}
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
                disabled={isLoading || !agreeToTerms || !formData.firstName || !formData.lastName || !formData.phone || !formData.password || !formData.confirmPassword || formData.password !== formData.confirmPassword}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating account...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
            </form>


            {/* Sign In Link */}
            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium transition-colors"
                  style={{ color: '#7B2CBF' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#A855F7'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#7B2CBF'}
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features List */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              <span>Free Forever</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              <span>No Credit Card</span>
            </div>
            <div className="flex items-center space-x-1">
              <CheckCircle className="w-4 h-4" style={{ color: '#10B981' }} />
              <span>Instant Access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
