import { Suspense } from 'react';
import Link from 'next/link';
import HeaderWrapper from "@/components/HeaderWrapper";
import FooterWrapper from "@/components/FooterWrapper";
import { Button } from '@/components/ui/button';
import { LuHouse as Home, LuBookOpen as BookOpen } from 'react-icons/lu';
import GoBackButton from './GoBackButton';

export default function CourseNotFound() {
  return (
    <div className="">
      <Suspense fallback={<div className="h-20 bg-white border-b"></div>}>
      <HeaderWrapper />
      </Suspense>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl w-full text-center space-y-6">
          <div className="space-y-4">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50"></div>
                <div className="relative bg-white rounded-full p-6 shadow-lg">
                  <BookOpen className="w-16 h-16 text-red-500" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 
              className="text-4xl md:text-5xl font-bold text-gray-800"
              style={{ fontFamily: "var(--font-bengali), sans-serif" }}
            >
              কোর্স পাওয়া যায়নি
            </h1>
            
            {/* English Title */}
            <h2 className="text-2xl font-semibold text-gray-700">Course Not Found</h2>
            
            {/* Description */}
            <p 
              className="text-gray-600 max-w-md mx-auto leading-relaxed"
              style={{ fontFamily: "var(--font-bengali), sans-serif" }}
            >
              দুঃখিত, আপনি যে কোর্সটি খুঁজছেন তা পাওয়া যায়নি। এটি সরানো, মুছে ফেলা হতে পারে বা বিদ্যমান নাও থাকতে পারে।
            </p>
            <p className="text-gray-500 max-w-md mx-auto">
              Sorry, the course you're looking for could not be found. It might have been moved, deleted, or doesn't exist.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              asChild
              className="transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
                color: 'white',
              }}
            >
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>হোম</span>
                <span className="ml-1">Home</span>
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="outline"
              className="transition-all duration-200 border-2"
            >
              <Link href="/courses">
                <BookOpen className="w-4 h-4 mr-2" />
                <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>কোর্স ব্রাউজ করুন</span>
                <span className="ml-1">Browse Courses</span>
              </Link>
            </Button>
            
            <GoBackButton />
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="h-64 bg-gray-50"></div>}>
      <FooterWrapper />
      </Suspense>
    </div>
  );
}

