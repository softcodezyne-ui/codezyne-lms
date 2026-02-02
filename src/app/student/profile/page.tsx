'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import StudentDashboardLayout from '@/components/StudentDashboardLayout';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LuUser as User, LuMail as Mail, LuCalendar as Calendar, LuBookOpen as BookOpen, LuAward as Award, LuClock as Clock, LuTarget as Target, LuPencil as Edit, LuSave as Save, LuX as X, LuFileText as LuFileText, LuCircle as HelpCircle } from 'react-icons/lu';;

interface StudentProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  enrollmentDate?: string;
  parentPhone?: string;
  createdAt: string;
  lastLogin?: string;
}

export default function StudentProfile() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    parentPhone: ''
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    fetchProfile();
  }, [session, status, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/users/${session?.user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setFormData({
          firstName: data.user.firstName || '',
          lastName: data.user.lastName || '',
          email: data.user.email || '',
          parentPhone: data.user.parentPhone || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      email: profile?.email || '',
      parentPhone: profile?.parentPhone || ''
    });
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/users/${session?.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <StudentDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </StudentDashboardLayout>
    );
  }

  if (!profile) {
    return (
      <StudentDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Profile not found</p>
        </div>
      </StudentDashboardLayout>
    );
  }

  return (
    <StudentDashboardLayout>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title="My Profile 👤"
          description="Manage your personal information and account settings"
        />

        {/* Profile LuInformation */}
        <PageSection 
          title="Personal LuInformation"
          description="Update your personal details and contact information"
          className="mb-2 sm:mb-4"
          actions={
            !editing ? (
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                First Name
              </label>
              {editing ? (
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Enter first name"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.firstName}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Last Name
              </label>
              {editing ? (
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.lastName}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Email Address
              </label>
              {editing ? (
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.email}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Parent/Guardian Phone
              </label>
              {editing ? (
                <Input
                  value={formData.parentPhone}
                  onChange={(e) => handleInputChange('parentPhone', e.target.value)}
                  placeholder="Enter parent/guardian phone number"
                />
              ) : (
                <p className="text-gray-900 p-3 bg-gray-50 rounded-lg">{profile.parentPhone || 'Not provided'}</p>
              )}
            </div>
          </div>
        </PageSection>

        {/* Account LuInformation & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Account Status */}
          <PageSection 
            title="Account Status"
            className="mb-2 sm:mb-4"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Status</span>
                <Badge className={profile.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {profile.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Role</span>
                <span className="text-sm font-medium text-gray-900 capitalize">{profile.role}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Member Since</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(profile.enrollmentDate || profile.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Last Login</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(profile.lastLogin)}
                </span>
              </div>
            </div>
          </PageSection>

          {/* Learning Stats */}
          <PageSection 
            title="Learning Statistics"
            className="mb-2 sm:mb-4"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-gray-600">Courses Enrolled</span>
                <span className="text-sm font-medium text-blue-900">0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-600">Courses Completed</span>
                <span className="text-sm font-medium text-green-900">0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Study Time</span>
                <span className="text-sm font-medium text-purple-900">0h 0m</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <span className="text-sm text-gray-600">Average Progress</span>
                <span className="text-sm font-medium text-orange-900">0%</span>
              </div>
            </div>
          </PageSection>
        </div>

        {/* Quick Actions */}
        <PageSection 
          title="Quick Actions"
          description="Common tasks and shortcuts"
          className="mt-2"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/student/courses')}
            >
              <BookOpen className="h-6 w-6" />
              <span className="text-sm">Browse Courses</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/student/dashboard')}
            >
              <Clock className="h-6 w-6" />
              <span className="text-sm">View Progress</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/student/assignments')}
            >
              <LuFileText className="h-6 w-6" />
              <span className="text-sm">Assignments</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center gap-2"
              onClick={() => router.push('/student/support')}
            >
              <HelpCircle className="h-6 w-6" />
              <span className="text-sm">Get Help</span>
            </Button>
          </div>
        </PageSection>
      </main>
    </StudentDashboardLayout>
  );
}
