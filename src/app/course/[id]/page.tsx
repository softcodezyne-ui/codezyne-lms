import { Suspense } from 'react';
import HeaderWrapper from '@/components/HeaderWrapper';
import FooterWrapper from '@/components/FooterWrapper';
import CourseDetailsClient from './CourseDetailsClient';

export default function CourseDetailsPage() {
  return (
    <div className="">
      <Suspense fallback={<div className="h-20 bg-white border-b"></div>}>
        <HeaderWrapper />
      </Suspense>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7B2CBF] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading course details...</p>
          </div>
        </div>
      }>
        <CourseDetailsClient />
      </Suspense>
      <Suspense fallback={<div className="h-64 bg-gray-50"></div>}>
        <FooterWrapper />
      </Suspense>
    </div>
  );
}
