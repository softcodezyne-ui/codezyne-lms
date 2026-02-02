'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  LuSearch as Search, 
  LuFacebook as Facebook, 
  LuYoutube as Youtube, 
  LuInstagram as Instagram, 
  LuLinkedin as Linkedin, 
  LuShoppingBag as ShoppingBag, 
  LuChevronDown as ChevronDown, 
  LuX as X
} from 'react-icons/lu';
import { Course } from '@/types/course';
import HeaderAuth from '@/components/HeaderAuth';
import MobileNavigation from '@/components/MobileNavigation';
import CourseCard from '@/components/CourseCard';
import { useCourses } from '@/hooks/useCourses';
import { useCourseReviews } from '@/hooks/useCourseReviews';

interface Review {
  _id: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  course: string;
  rating: number;
  title?: string;
  comment?: string;
  isApproved: boolean;
  isPublic: boolean;
  helpfulVotes: number;
  createdAt: string;
  updatedAt: string;
}

interface CourseWithStats extends Omit<Course, 'instructor'> {
  rating?: number;
  reviewCount?: number;
  enrollmentCount?: number;
  duration?: number;
  lessonCount?: number;
  instructor?: {
    name: string;
    role: string;
  };
  recentReviews?: Review[];
}

export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [filteredCourses, setFilteredCourses] = useState<CourseWithStats[]>([]);
  // Removed isSearching state since we're doing client-side filtering

  // Use the courses hook to fetch dynamic data
  const { 
    courses, 
    loading, 
    error, 
    pagination, 
    fetchCourses 
  } = useCourses();

  // Get course IDs for fetching reviews
  const courseIds = courses.map(course => course._id);
  
  // Fetch reviews for all courses
  const { 
    reviewsData, 
    loading: reviewsLoading, 
    error: reviewsError 
  } = useCourseReviews(courseIds);

  // Fetch published courses on mount using public API
  useEffect(() => {
    fetchCourses({
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }, []); // Empty dependency array to run only once

  // Get unique categories from the actual courses with memoization
  const categories = useMemo(() => 
    Array.from(new Set(
      courses
        .map(course => course.category)
        .filter((cat): cat is string => Boolean(cat))
        .map(cat => cat.toUpperCase())
    )).sort(), [courses]
  );

  // Convert courses to CourseWithStats format with memoization
  const coursesWithStats: CourseWithStats[] = useMemo(() => 
    courses.map(course => {
      const reviewStats = reviewsData[course._id];
      return {
        ...course,
        rating: reviewStats?.averageRating || 0,
        reviewCount: reviewStats?.totalReviews || 0,
        recentReviews: reviewStats?.recentReviews || [],
        enrollmentCount: Math.floor(Math.random() * 200), // Mock enrollment count
        duration: Math.floor(Math.random() * 600) + 60, // Mock duration in minutes
        lessonCount: Math.floor(Math.random() * 20) + 1, // Mock lesson count
        instructor: {
          name: course.createdBy?.name || 'talhaahmed',
          role: 'Physics Instructor'
        }
      };
    }), [courses, reviewsData]
  );

  // Client-side filtering and sorting - no API calls
  useEffect(() => {
    let filtered = coursesWithStats;

    // Filter by search term (client-side)
    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by categories (client-side)
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(course =>
        selectedCategories.some(cat => 
          course.category?.toUpperCase().includes(cat.replace(' LEVEL', ''))
        )
      );
    }

    // Sort courses (client-side)
    switch (sortBy) {
      case 'newest':
        filtered = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        filtered = filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'price-low':
        filtered = filtered.sort((a, b) => a.finalPrice - b.finalPrice);
        break;
      case 'price-high':
        filtered = filtered.sort((a, b) => b.finalPrice - a.finalPrice);
        break;
      case 'rating':
        filtered = filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    setFilteredCourses(filtered);
  }, [coursesWithStats, searchTerm, selectedCategories, sortBy]);

  const handleCategoryToggle = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(newCategories);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSortBy('newest');
  };

  // Note: Search filtering is now handled client-side in the main useEffect below

  // Note: Category filtering is now handled client-side in the main useEffect below


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Courses</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchCourses()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 sm:px-6 py-4 sm:py-6 lg:py-8 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Section with Social Icons */}
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-white rounded-full"></div>
                <div className="absolute w-4 h-4 sm:w-6 sm:h-6 border border-blue-300 rounded-full"></div>
              </div>
              <span className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900">
                <span className="text-base sm:text-xl lg:text-2xl">PHYSICS</span>
                <span className="text-xs sm:text-sm lg:text-lg ml-1">WITH TALHA</span>
              </span>
            </div>
            
            {/* Social Media Icons */}
            <div className="flex items-center space-x-2">
              <Facebook className="w-4 h-4 text-gray-600 hover:text-blue-400 cursor-pointer transition-all duration-300 ease-in-out hover:scale-110" />
              <Youtube className="w-4 h-4 text-gray-600 hover:text-red-400 cursor-pointer transition-all duration-300 ease-in-out hover:scale-110" />
              <Instagram className="w-4 h-4 text-gray-600 hover:text-pink-400 cursor-pointer transition-all duration-300 ease-in-out hover:scale-110" />
              <Linkedin className="w-4 h-4 text-gray-600 hover:text-blue-400 cursor-pointer transition-all duration-300 ease-in-out hover:scale-110" />
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Navigation Links */}
            <div className="flex items-center space-x-4 xl:space-x-6">
              <Link href="/" className="text-sm xl:text-base text-gray-600 hover:text-blue-400 font-medium transition-all duration-300 ease-in-out hover:scale-105">HOME</Link>
              <div className="flex items-center space-x-1 text-sm xl:text-base text-gray-600 hover:text-blue-400 font-medium cursor-pointer transition-all duration-300 ease-in-out hover:scale-105">
                <span>RESOURCES</span>
                <ChevronDown className="w-3 h-3 xl:w-4 xl:h-4 transition-transform duration-300 ease-in-out group-hover:rotate-180" />
              </div>
              <Link href="/register" className="text-sm xl:text-base text-gray-600 hover:text-blue-400 font-medium transition-all duration-300 ease-in-out hover:scale-105">ENROLL</Link>
              <Link href="/courses" className="text-sm xl:text-base text-blue-600 hover:text-blue-700 font-medium transition-all duration-300 ease-in-out hover:scale-105">COURSES</Link>
              <ShoppingBag className="w-4 h-4 xl:w-5 xl:h-5 text-gray-600 hover:text-blue-400 cursor-pointer transition-all duration-300 ease-in-out hover:scale-110" />
            </div>
            <HeaderAuth />
          </div>

          {/* Mobile Navigation */}
          <MobileNavigation />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Courses</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-8">
              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Category Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Category</h3>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <label key={category} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => handleCategoryToggle(category)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{category}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear All Filters */}
              <Button
                onClick={clearAllFilters}
                variant="outline"
                className="w-full flex items-center justify-center space-x-2 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <X className="w-4 h-4" />
                <span>Clear All Filters</span>
              </Button>
            </div>
          </div>

          {/* Right Main Section - Course Listings */}
          <div className="lg:col-span-3">
            {/* Sort/Filter Dropdown - Client-side sorting */}
            <div className="flex justify-end mb-6">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest">Release Date (newest first)</option>
                <option value="oldest">Release Date (oldest first)</option>
                <option value="price-low">Price (low to high)</option>
                <option value="price-high">Price (high to low)</option>
                <option value="rating">Rating (high to low)</option>
              </select>
            </div>

            {/* Course Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course, index) => (
                <CourseCard 
                  key={course._id} 
                  course={course} 
                  index={index}
                />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm || selectedCategories.length > 0 
                      ? 'Try adjusting your search or filter criteria'
                      : 'No courses are available at the moment'
                    }
                  </p>
                  {(searchTerm || selectedCategories.length > 0) && (
                    <Button onClick={clearAllFilters} variant="outline">
                      Clear All Filters
                    </Button>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        {/* Top Section - Links and Social Media */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* RESOURCES Column */}
            <div>
              <h3 className="text-gray-900 font-bold text-sm uppercase tracking-wide mb-4">
                RESOURCES
              </h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    O Level (GCSE/IGCSE)
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    AS Level
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    A2 Level
                  </a>
                </li>
              </ul>
            </div>

            {/* Classes & Contact Column */}
            <div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    Register for Classes
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    Courses
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Policies & FAQs Column */}
            <div>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    Refund Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors duration-200">
                    FAQ's
                  </a>
                </li>
              </ul>
            </div>

            {/* Social Media Icons */}
            <div className="flex items-start justify-end md:justify-start">
              <div className="flex space-x-4">
                <a href="#" className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors duration-200">
                  <span className="text-white text-sm font-bold">f</span>
                </a>
                <a href="#" className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors duration-200">
                  <span className="text-white text-sm">▶</span>
                </a>
                <a href="#" className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors duration-200">
                  <span className="text-white text-sm">📷</span>
                </a>
                <a href="#" className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors duration-200">
                  <span className="text-white text-sm font-bold">in</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Copyright */}
        <div className="border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                2024 PHYSICS WITH TALHA | POWERED BY DIGITARO
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
