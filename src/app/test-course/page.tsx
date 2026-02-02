'use client';

import { useState } from 'react';
import CourseModal from '@/components/CourseModal';

export default function TestCoursePage() {
  const [showForm, setShowForm] = useState(false);

  const handleAddCourse = () => {
    console.log('=== TEST: Add course button clicked! ===');
    setShowForm(true);
  };

  const handleFormClose = () => {
    console.log('=== TEST: Form closed ===');
    setShowForm(false);
  };

  const handleFormSuccess = () => {
    console.log('=== TEST: Form success ===');
    setShowForm(false);
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Test Course Form</h1>
      <button
        onClick={handleAddCourse}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Test Add Course
      </button>
      
      <div className="mt-4">
        <p>Show Form State: {showForm ? 'true' : 'false'}</p>
      </div>

      <CourseModal
        open={showForm}
        course={null}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
