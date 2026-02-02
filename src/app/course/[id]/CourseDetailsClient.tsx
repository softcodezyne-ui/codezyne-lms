'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CourseDetails from '@/app/components/CourseDetails';
import type { CourseDetailsData, ChapterWithLessons } from '@/lib/course-details';

export default function CourseDetailsClient() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetailsData | null>(null);
  const [chapters, setChapters] = useState<ChapterWithLessons[]>([]);
  const [courseFaqs, setCourseFaqs] = useState<Array<{ _id: string; question: string; answer: string; order: number }>>([]);

  useEffect(() => {
    if (!courseId) return;

    const fetchCourseDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!courseId || typeof courseId !== 'string' || courseId.trim() === '') {
          setError('Invalid course ID');
          setLoading(false);
          return;
        }

        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        if (!objectIdRegex.test(courseId.trim())) {
          setError('Invalid course ID format');
          setLoading(false);
          return;
        }

        const trimmedCourseId = courseId.trim();

        const [courseResponse, chaptersResponse, lessonsResponse, faqsResponse] = await Promise.all([
          fetch(`/api/public/courses/${trimmedCourseId}`, { cache: 'no-store' }),
          fetch(`/api/public/chapters?course=${trimmedCourseId}&isPublished=true`, { cache: 'no-store' }),
          fetch(`/api/public/lessons?course=${trimmedCourseId}&isPublished=true`, { cache: 'no-store' }),
          fetch(`/api/public/faqs?course=${trimmedCourseId}`, { cache: 'no-store' }),
        ]);

        if (!courseResponse.ok) {
          if (courseResponse.status === 404) {
            setError('Course not found');
          } else {
            setError(`Failed to load course: ${courseResponse.statusText}`);
          }
          setLoading(false);
          return;
        }

        const courseData = await courseResponse.json();
        if (!courseData.success || !courseData.data) {
          setError('Course not found');
          setLoading(false);
          return;
        }

        const chaptersData = chaptersResponse.ok ? await chaptersResponse.json() : { success: true, data: { chapters: [] } };
        const lessonsData = lessonsResponse.ok ? await lessonsResponse.json() : { success: true, data: { lessons: [] } };
        const faqsData = faqsResponse.ok ? await faqsResponse.json() : { success: true, data: { faqs: [] } };

        const fetchedChapters = chaptersData.success ? chaptersData.data.chapters || [] : [];
        const fetchedLessons = lessonsData.success ? lessonsData.data.lessons || [] : [];
        const fetchedFaqs = faqsData.success && Array.isArray(faqsData.data?.faqs) ? faqsData.data.faqs : [];

        const placeholders = ['unknown', 'not provided', 'n/a', 'uncategorized', 'loading...', 'unknown instructor'];
        const isPlaceholder = (s: string | undefined) => !s || placeholders.includes(String(s).toLowerCase().trim());

        const rawInstructorName = courseData.data.instructor?.name?.trim();
        const instructorName = rawInstructorName && !isPlaceholder(rawInstructorName) ? rawInstructorName : undefined;
        const rawCreatedByName = courseData.data.createdBy?.name?.trim();
        const createdByName = rawCreatedByName && !isPlaceholder(rawCreatedByName) ? rawCreatedByName : '';

        const rawCategory = courseData.data.category?.trim();
        const category = rawCategory && !isPlaceholder(rawCategory) ? rawCategory : undefined;
        const rawDescription = courseData.data.description?.trim();
        const description = rawDescription && !isPlaceholder(rawDescription) ? rawDescription : undefined;
        const rawShortDescription = courseData.data.shortDescription?.trim();
        const shortDescription = rawShortDescription && !isPlaceholder(rawShortDescription) ? rawShortDescription : undefined;

        const transformedCourse: CourseDetailsData = {
          _id: courseData.data._id?.toString() || courseData.data._id,
          title: courseData.data.title,
          shortDescription,
          description,
          category,
          thumbnailUrl: courseData.data.thumbnailUrl,
          isPaid: courseData.data.isPaid,
          price: courseData.data.price,
          salePrice: courseData.data.salePrice,
          finalPrice: courseData.data.finalPrice || (courseData.data.isPaid ? (courseData.data.salePrice || courseData.data.price || 0) : 0),
          discountPercentage: courseData.data.discountPercentage || 0,
          enrollmentCount: courseData.data.enrollmentCount || 0,
          lessonCount: fetchedLessons.length,
          totalDuration: fetchedLessons.reduce((sum: number, lesson: any) => sum + (lesson.duration || 0), 0),
          instructor: instructorName ? {
            _id: courseData.data.instructor._id?.toString() || '',
            name: instructorName,
            avatar: courseData.data.instructor.avatar,
          } : undefined,
          createdBy: courseData.data.createdBy && createdByName ? {
            _id: courseData.data.createdBy._id?.toString() || '',
            name: createdByName,
            email: courseData.data.createdBy.email,
          } : undefined,
          categoryInfo: courseData.data.categoryInfo || null,
          createdAt: courseData.data.createdAt,
          updatedAt: courseData.data.updatedAt,
        };

        const combinedChapters: ChapterWithLessons[] = fetchedChapters.map((chapter: any) => {
          const chapterLessons = fetchedLessons
            .filter((lesson: any) => {
              const lessonChapterId = lesson.chapter?._id?.toString() || lesson.chapter?.toString() || lesson.chapter;
              const chapterId = chapter._id?.toString() || chapter._id;
              return lessonChapterId === chapterId;
            })
            .map((lesson: any) => ({
              _id: lesson._id.toString(),
              title: lesson.title,
              description: lesson.description,
              order: lesson.order,
              chapter: lesson.chapter?._id?.toString() || lesson.chapter?.toString() || lesson.chapter,
              course: lesson.course?.toString() || lesson.course,
              duration: lesson.duration || 0,
              type: (lesson.type || 'video') as 'video' | 'audio' | 'reading' | 'assignment',
              isPublished: lesson.isPublished,
              videoUrl: lesson.videoUrl,
              content: lesson.content,
              isFree: lesson.isFree || false,
            }));

          return {
            _id: chapter._id.toString(),
            title: chapter.title,
            description: chapter.description,
            order: chapter.order,
            course: chapter.course.toString(),
            isPublished: chapter.isPublished,
            lessons: chapterLessons,
          };
        });

        setCourse(transformedCourse);
        setChapters(combinedChapters);
        setCourseFaqs(fetchedFaqs);
      } catch (err) {
        console.error('Error fetching course details:', err);
        setError('Failed to load course details');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7B2CBF] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl w-full text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
              {error || 'Course Not Found'}
            </h1>
            <p className="text-gray-600">
              {error || 'The course you are looking for could not be found.'}
            </p>
          </div>
          <button
            onClick={() => router.push('/courses')}
            className="px-6 py-3 bg-[#7B2CBF] text-white rounded-lg hover:bg-[#6A1FA8] transition-colors"
          >
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  return <CourseDetails courseId={courseId} initialCourse={course} initialChapters={chapters} initialCourseFaqs={courseFaqs} />;
}
