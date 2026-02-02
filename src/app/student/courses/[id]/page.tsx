'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import StudentDashboardLayout from '@/components/StudentDashboardLayout';
import { LuPlay as PlayCircle, LuCheck as CheckCircle, LuTrophy as Trophy, LuStar as Star, LuTarget as Target, LuAward as Award, LuArrowLeft as ArrowLeft, LuArrowRight as ArrowRight, LuHistory as History, LuClock as Clock, LuTrendingUp as TrendingUp, LuChevronDown as ChevronDown } from 'react-icons/lu';;
import PageSection from '@/components/PageSection';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleHeader } from '@/components/ui/collapsible';
import confetti from 'canvas-confetti';
import * as PlyrModule from 'plyr';
import 'plyr/dist/plyr.css';

// Plyr is exported as default but TypeScript types don't reflect this properly
const Plyr = (PlyrModule as any).default || PlyrModule;

export default function StudentCourseLearningPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chapters, setChapters] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [quizMeta, setQuizMeta] = useState<{ required: boolean; questionsCount: number; fetchUrl: string; submitUrl: string } | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<any[] | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{ scorePercentage: number; correctAnswers: number; totalQuestions: number } | null>(null);
  const [quizStartedAt, setQuizStartedAt] = useState<Date | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [submissionHistory, setSubmissionHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(false);
  const [chapterProgress, setChapterProgress] = useState<Record<string, any>>({});
  const [courseProgress, setCourseProgress] = useState<any>(null);
  const [quizAlreadySubmitted, setQuizAlreadySubmitted] = useState(false);
  const [showSubmissionHistory, setShowSubmissionHistory] = useState(false);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [hideVideo, setHideVideo] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const plyrInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user) {
      router.push('/login');
      return;
    }
    if (courseId) {
      fetchCourseAndContent();
    }
  }, [courseId, session, status]);

  const fetchCourseAndContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const [courseRes, chaptersRes, lessonsRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch(`/api/chapters?course=${courseId}&isPublished=true&limit=100`),
        fetch(`/api/lessons?course=${courseId}&isPublished=true&limit=1000`),
      ]);
      
      if (courseRes.ok) {
        const cd = await courseRes.json();
        console.log('Course API response:', cd);
        // Handle different response structures
        const courseData = cd.data || cd.course || cd;
        console.log('Course data extracted:', courseData);
        if (courseData && (courseData._id || courseData.id)) {
          setCourse(courseData);
        } else {
          console.error('Invalid course data structure:', courseData);
        }
      } else {
        const errorData = await courseRes.json().catch(() => ({}));
        console.error('Failed to fetch course:', courseRes.status, errorData);
        setError(errorData.error || 'Failed to load course');
      }
      
      if (chaptersRes.ok) {
        const d = await chaptersRes.json();
        setChapters(d.data?.chapters || d.chapters || []);
      }
      if (lessonsRes.ok) {
        const d = await lessonsRes.json();
        const ls = d.data?.lessons || d.lessons || [];
        setLessons(ls);
        if (ls.length > 0) setSelectedLessonId(ls[0]._id);
      }
    } catch (e) {
      console.error('Error fetching course content:', e);
      setError('Failed to load course content');
    } finally {
      setLoading(false);
    }
  };

  const selectedLesson = useMemo(() => lessons.find((l: any) => l._id === selectedLessonId), [lessons, selectedLessonId]);

  // Initialize Plyr player when selectedLesson changes
  useEffect(() => {
    if (!selectedLesson?.youtubeVideoId || !playerRef.current || hideVideo) {
      // Clean up existing player if video is hidden or no video available
      if (plyrInstanceRef.current) {
        plyrInstanceRef.current.destroy();
        plyrInstanceRef.current = null;
      }
      return;
    }

    // Clean up existing player before creating a new one
    if (plyrInstanceRef.current) {
      plyrInstanceRef.current.destroy();
      plyrInstanceRef.current = null;
    }

    // Create new Plyr instance for YouTube video
    try {
      const player = new Plyr(playerRef.current, {
        controls: [
          'play-large',
          'play',
          'progress',
          'current-time',
          'mute',
          'volume',
          'settings',
          'fullscreen',
        ],
        settings: ['speed', 'quality'],
        speed: {
          selected: 1,
          options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        },
        youtube: {
          noCookie: false,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          modestbranding: 1,
        },
        ratio: '16:9',
        autopause: true,
        clickToPlay: true,
        hideControls: true,
        resetOnEnd: false,
        keyboard: { focused: true, global: false },
      });

      plyrInstanceRef.current = player;

      // Cleanup function
      return () => {
        if (plyrInstanceRef.current) {
          plyrInstanceRef.current.destroy();
          plyrInstanceRef.current = null;
        }
      };
    } catch (error) {
      console.error('Failed to initialize Plyr player:', error);
    }
  }, [selectedLesson?.youtubeVideoId, hideVideo]);

  // Load submission history and check completion when lesson changes
  useEffect(() => {
    if (selectedLesson) {
      // Reset quiz state when lesson changes
      setQuizAlreadySubmitted(false);
      setQuizResult(null);
      setHideVideo(false);
      setShowCongratsModal(false);
      setHasQuiz(false);
      setCurrentQuestionIndex(0);
      // Automatically show history when lesson is selected
      setShowSubmissionHistory(true);
      fetchSubmissionHistory(selectedLesson._id);
      checkLessonCompletion(selectedLesson._id);
      checkQuizSubmissionStatus(selectedLesson._id);
      checkQuizAvailability(selectedLesson._id);
    }
  }, [selectedLesson]);

  // Load course progress dashboard when course loads
  useEffect(() => {
    if (courseId && !loading) {
      fetchCourseProgress();
    }
  }, [courseId, loading]);

  // Cleanup Plyr instance on component unmount
  useEffect(() => {
    return () => {
      if (plyrInstanceRef.current) {
        plyrInstanceRef.current.destroy();
        plyrInstanceRef.current = null;
      }
    };
  }, []);

  // Check if quiz exists for the lesson
  const checkQuizAvailability = async (lessonId: string) => {
    try {
      const quizRes = await fetch(`/api/lessons/${lessonId}/quiz`);
      const quizData = await quizRes.json();
      if (quizRes.ok && quizData?.success) {
        const hasQuestions = quizData.data && quizData.data.length > 0;
        setHasQuiz(hasQuestions);
      } else {
        setHasQuiz(false);
      }
    } catch (e) {
      console.error('Failed to check quiz availability', e);
      setHasQuiz(false);
    }
  };

  // Check completion status from database using new API
  const checkLessonCompletion = async (lessonId: string) => {
    try {
      setCheckingCompletion(true);
      
      const res = await fetch(`/api/progress/lesson-status?course=${courseId}&lesson=${lessonId}`);
      const data = await res.json();
      
      if (res.ok && data?.success) {
        const lessonData = data.data;
        const isCompleted = lessonData.isCompleted === true;
        setLessonCompleted(isCompleted);
      } else {
        setLessonCompleted(false);
      }
    } catch (e) {
      console.error('Failed to check lesson completion:', e);
      setLessonCompleted(false);
    } finally {
      setCheckingCompletion(false);
    }
  };

  // Fetch comprehensive course progress
  const fetchCourseProgress = async () => {
    try {
      const res = await fetch(`/api/progress/dashboard?course=${courseId}`);
      const data = await res.json();
      
      if (res.ok && data?.success) {
        const dashboardData = data.data;
        setCourseProgress(dashboardData.course);
        
        // Set chapter progress
        const chapterProgressMap: Record<string, any> = {};
        dashboardData.chapters.forEach((chapter: any) => {
          chapterProgressMap[chapter.id] = chapter;
        });
        setChapterProgress(chapterProgressMap);
      }
    } catch (e) {
      console.error('Failed to fetch course progress:', e);
    }
  };

  // Check chapter completion status
  const checkChapterCompletion = async (chapterId: string) => {
    try {
      const res = await fetch(`/api/progress/chapter-status?course=${courseId}&chapter=${chapterId}`);
      const data = await res.json();
      
      if (res.ok && data?.success) {
        const chapterData = data.data;
        setChapterProgress(prev => ({
          ...prev,
          [chapterId]: chapterData
        }));
        return chapterData;
      }
    } catch (e) {
      console.error('Failed to check chapter completion:', e);
    }
    return null;
  };

  const lessonsByChapter = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const lesson of lessons) {
      const key = lesson.chapter?.toString ? lesson.chapter.toString() : lesson.chapter;
      if (!map[key]) map[key] = [];
      map[key].push(lesson);
    }
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.order || 0) - (b.order || 0)));
    return map;
  }, [lessons]);

  // All lessons in course order (chapter order, then lesson order) for prev/next navigation
  const allLessonsOrdered = useMemo(() => {
    return [...lessons].sort((a: any, b: any) => {
      const chapterA = chapters.find((ch: any) => ch._id === a.chapter || ch._id === a.chapter?._id);
      const chapterB = chapters.find((ch: any) => ch._id === b.chapter || ch._id === b.chapter?._id);
      if (chapterA && chapterB) {
        const chapterOrderDiff = (chapterA.order || 0) - (chapterB.order || 0);
        if (chapterOrderDiff !== 0) return chapterOrderDiff;
      }
      return (a.order || 0) - (b.order || 0);
    });
  }, [lessons, chapters]);

  const currentLessonIndex = useMemo(() => {
    if (!selectedLessonId) return -1;
    return allLessonsOrdered.findIndex((l: any) => l._id === selectedLessonId);
  }, [allLessonsOrdered, selectedLessonId]);

  const hasPreviousLesson = currentLessonIndex > 0;
  const hasNextLesson = currentLessonIndex >= 0 && currentLessonIndex < allLessonsOrdered.length - 1;

  const handlePreviousLesson = () => {
    if (!hasPreviousLesson) return;
    const prevLesson = allLessonsOrdered[currentLessonIndex - 1];
    setSelectedLessonId(prevLesson._id);
    setShowCongratsModal(false);
    setHideVideo(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextLesson = () => {
    if (!hasNextLesson) return;
    const nextLesson = allLessonsOrdered[currentLessonIndex + 1];
    setSelectedLessonId(nextLesson._id);
    setShowCongratsModal(false);
    setHideVideo(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkCompleted = async () => {
    if (!session?.user || !selectedLesson) return;
    try {
      setMarkingComplete(true);
      setQuizMeta(null);
      setQuizQuestions(null);
      setQuizResult(null);
      setPracticeMode(false);
      
      // Use the new progress completion API
      const res = await fetch('/api/progress/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          course: courseId, 
          lesson: selectedLesson._id, 
          isCompleted: true, 
          progressPercentage: 100,
          timeSpent: 0, // You can calculate actual time spent
          type: 'lesson'
        }),
      });
      const data = await res.json();
      
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to mark complete');
      
      setLessonCompleted(true);
      setShowCongratsModal(true);
      
      // Refresh course progress to get updated chapter and course progress
      await fetchCourseProgress();
      
      // Check if quiz has already been submitted
      await checkQuizSubmissionStatus(selectedLesson._id);
      
      // Check quiz availability
      await checkQuizAvailability(selectedLesson._id);
      
      // Only show quiz if it hasn't been submitted yet
      if (!quizAlreadySubmitted) {
        // Check if there's a quiz for this lesson
        const quizRes = await fetch(`/api/lessons/${selectedLesson._id}/quiz`);
        const quizData = await quizRes.json();
        if (quizRes.ok && quizData?.success && quizData.data?.length > 0) {
          setQuizMeta({
            required: true,
            questionsCount: quizData.data.length,
            fetchUrl: `/api/lessons/${selectedLesson._id}/quiz`,
            submitUrl: `/api/lessons/${selectedLesson._id}/quiz/submit`
          });
          setQuizQuestions(quizData.data);
          setQuizAnswers({});
          setQuizStartedAt(new Date());
          // When quiz appears after marking complete, it should be a real submission (not practice)
          setPracticeMode(false);
        }
      }
    } catch (e) {
      console.error('Failed to mark lesson as completed:', e);
    } finally {
      setMarkingComplete(false);
    }
  };

  const handlePracticeQuiz = async () => {
    if (!selectedLesson || quizAlreadySubmitted) return;
    try {
      setHideVideo(true);
      setPracticeMode(true);
      setQuizMeta(null);
      setQuizQuestions(null);
      setQuizResult(null);
      setCurrentQuestionIndex(0);
      
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      const fetchUrl = `/api/lessons/${selectedLesson._id}/quiz`;
      const submitUrl = `/api/lessons/${selectedLesson._id}/quiz/submit`;
      const qRes = await fetch(fetchUrl);
      const qData = await qRes.json();
      if (qRes.ok && qData?.success) {
        const questions = qData.data || [];
        if (questions.length === 0) {
          setQuizMeta({ required: false, questionsCount: 0, fetchUrl, submitUrl });
          setQuizQuestions([]);
        } else {
          setQuizQuestions(questions);
          setQuizAnswers({});
          setQuizStartedAt(new Date());
          setQuizMeta({ required: true, questionsCount: questions.length, fetchUrl, submitUrl });
        }
      } else {
        setQuizMeta({ required: false, questionsCount: 0, fetchUrl, submitUrl });
        setQuizQuestions([]);
      }
    } catch (e) {
      console.error('Failed to start practice quiz', e);
      setQuizMeta({ required: false, questionsCount: 0, fetchUrl: '', submitUrl: '' });
      setQuizQuestions([]);
    }
  };

  const handleStartPracticeQuizFromModal = async () => {
    setShowCongratsModal(false);
    setHideVideo(true);
    await handlePracticeQuiz();
  };

  const handleContinueLearning = () => {
    if (!selectedLesson) return;
    
    // Find the next lesson by sorting all lessons by chapter order and lesson order
    const allLessons = [...lessons].sort((a: any, b: any) => {
      // Sort by chapter order first, then by lesson order
      const chapterA = chapters.find((ch: any) => ch._id === a.chapter || ch._id === a.chapter?._id);
      const chapterB = chapters.find((ch: any) => ch._id === b.chapter || ch._id === b.chapter?._id);
      if (chapterA && chapterB) {
        const chapterOrderDiff = (chapterA.order || 0) - (chapterB.order || 0);
        if (chapterOrderDiff !== 0) return chapterOrderDiff;
      }
      return (a.order || 0) - (b.order || 0);
    });

    const currentIndex = allLessons.findIndex((l: any) => l._id === selectedLesson._id);
    
    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      // There's a next lesson
      const nextLesson = allLessons[currentIndex + 1];
      setSelectedLessonId(nextLesson._id);
      setShowCongratsModal(false);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // No next lesson, just close the modal
      setShowCongratsModal(false);
    }
  };

  const handleSelectAnswer = (questionId: string, index: number) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: index }));
  };

  const handleNextQuestion = () => {
    if (quizQuestions && currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmitQuiz = async () => {
    if (!quizMeta || !quizQuestions || quizAlreadySubmitted) return;
    try {
      setQuizSubmitting(true);
      const answers = quizQuestions.map((q: any) => ({ questionId: q._id, selectedIndex: quizAnswers[q._id] ?? -1 }));
      const res = await fetch(quizMeta.submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          startedAt: quizStartedAt?.toISOString() || new Date().toISOString(), 
          answers,
          isPracticeMode: practiceMode 
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setQuizResult({ scorePercentage: data.data.scorePercentage, correctAnswers: data.data.correctAnswers, totalQuestions: data.data.totalQuestions });
        
        // If not practice mode, mark quiz as submitted
        if (!practiceMode) {
          setQuizAlreadySubmitted(true);
          // Clear quiz questions and meta to prevent re-submission
          setQuizQuestions(null);
          setQuizMeta(null);
        }
        
        // Trigger confetti for 100% score
        if (data.data.scorePercentage === 100) {
          triggerConfetti();
        }
        
        // Refresh submission history after successful submission
        if (selectedLesson) {
          fetchSubmissionHistory(selectedLesson._id);
          checkQuizSubmissionStatus(selectedLesson._id);
        }
      }
    } catch (e) {
      console.error('Failed to submit quiz', e);
    } finally {
      setQuizSubmitting(false);
    }
  };

  const fetchSubmissionHistory = async (lessonId: string) => {
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/lessons/${lessonId}/quiz/history`);
      const data = await res.json();
      if (res.ok && data?.success) {
        setSubmissionHistory(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch submission history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Check if quiz has already been submitted (non-practice mode)
  const checkQuizSubmissionStatus = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/quiz/history`);
      const data = await res.json();
      if (res.ok && data?.success) {
        const history = data.data || [];
        // Check if there's any non-practice submission (isPracticeMode === false or undefined/null for old records)
        const hasRealSubmission = history.some((submission: any) => 
          submission.isPracticeMode === false || 
          (submission.isPracticeMode !== true && submission.isPracticeMode !== false) // Handle undefined/null
        );
        setQuizAlreadySubmitted(hasRealSubmission);
        
        // If there's a real submission, show the latest result
        if (hasRealSubmission) {
          const latestSubmission = history.find((sub: any) => 
            sub.isPracticeMode === false || 
            (sub.isPracticeMode !== true && sub.isPracticeMode !== false)
          ) || history[0];
          if (latestSubmission) {
            setQuizResult({
              scorePercentage: latestSubmission.scorePercentage,
              correctAnswers: latestSubmission.correctAnswers,
              totalQuestions: latestSubmission.totalQuestions
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to check quiz submission status', e);
      // On error, don't change the state
    }
  };

  const triggerConfetti = () => {
    // Create a burst of confetti from the center
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff']
    });

    // Add a second burst after a short delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.4 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff']
      });
    }, 250);
  };

  if (loading) {
    return (
      <StudentDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </StudentDashboardLayout>
    );
  }

  if (error) {
    return (
      <StudentDashboardLayout>
        <div className="p-4">
          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-700">{error}</div>
        </div>
      </StudentDashboardLayout>
    );
  }

  return (
    <StudentDashboardLayout>
      <main className="relative z-10 p-2 sm:p-3 md:p-4">
        {/* Back Navigation */}
        <div className="mb-3 sm:mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/student/courses')}
            className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Back to My Courses</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
        
        {/* Mobile-first responsive grid */}
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Left: Video + Complete + Quiz */}
          <div className="lg:col-span-2 flex flex-col space-y-2 sm:space-y-3 md:space-y-4 min-h-0 order-1">
            {/* Course Title Header - Above Video */}
            {loading ? (
              <div className="relative bg-white rounded-lg sm:rounded-xl shadow-md sm:shadow-lg overflow-hidden border border-gray-200 mb-3 sm:mb-4 p-3 sm:p-4 md:p-6">
                <div className="text-gray-600 text-xs sm:text-sm flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                  <span className="truncate">Loading course information...</span>
                </div>
              </div>
            ) : course && course.title ? (
              <div className="relative bg-white rounded-lg sm:rounded-xl shadow-md sm:shadow-lg overflow-hidden border border-gray-200 mb-3 sm:mb-4">
                <div className="relative p-3 sm:p-4 md:p-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="p-2 sm:p-2.5 bg-blue-100 rounded-lg shadow-sm flex-shrink-0">
                      <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-gray-500 text-xs sm:text-sm font-semibold uppercase tracking-wide block truncate">Course</span>
                      {course.category && (
                        <span className="text-gray-600 text-xs font-medium mt-0.5 block truncate">{course.category}</span>
                      )}
                    </div>
                  </div>
                  <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 line-clamp-2 sm:line-clamp-3 leading-tight break-words">
                    {course.title}
                  </h1>
                 
                </div>
              </div>
            ) : error ? (
              <div className="relative bg-white rounded-lg sm:rounded-xl shadow-md sm:shadow-lg overflow-hidden border border-red-300 mb-3 sm:mb-4 p-3 sm:p-4 md:p-6">
                <div className="text-red-600 text-xs sm:text-sm break-words">{error}</div>
              </div>
            ) : null}
            
            <PageSection title={selectedLesson ? selectedLesson.title : 'Select a lesson'}>
              {!hideVideo && (
                <div className="w-full aspect-video bg-black rounded-lg sm:rounded-xl overflow-hidden shadow-md sm:shadow-lg border border-gray-200">
                  {selectedLesson?.youtubeVideoId ? (
                    <div 
                      ref={playerRef}
                      className="w-full h-full"
                      data-plyr-provider="youtube"
                      data-plyr-embed-id={selectedLesson.youtubeVideoId}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-sm sm:text-base">No video</div>
                  )}
                </div>
              )}
              {/* Previous / Next lesson navigation - watch lesson by lesson */}
              {selectedLesson && (
                <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handlePreviousLesson}
                    disabled={!hasPreviousLesson}
                    className="flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-300 hover:border-blue-400 text-gray-700 hover:text-blue-600 px-4 py-2.5"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Previous lesson</span>
                    <span className="sm:hidden">Previous</span>
                  </Button>
                  <span className="text-xs sm:text-sm text-gray-500 shrink-0">
                    {currentLessonIndex >= 0 ? `${currentLessonIndex + 1} / ${allLessonsOrdered.length}` : '—'}
                  </span>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleNextLesson}
                    disabled={!hasNextLesson}
                    className="flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-300 hover:border-blue-400 text-gray-700 hover:text-blue-600 px-4 py-2.5"
                  >
                    <span className="hidden sm:inline">Next lesson</span>
                    <span className="sm:hidden">Next</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </Button>
                </div>
              )}
              <div className="mt-3 sm:mt-4 w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
                {hasQuiz && (
                  <Button
                    onClick={handlePracticeQuiz}
                    disabled={!selectedLesson || !hasQuiz || quizAlreadySubmitted}
                    size="default"
                    className="w-full sm:w-auto sm:flex-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm sm:text-base py-2.5 sm:py-3 px-4 sm:px-6"
                    title={quizAlreadySubmitted ? "Quiz already submitted. Practice mode is disabled." : !hasQuiz ? "No quiz available for this lesson" : ""}
                  >
                    <PlayCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{quizAlreadySubmitted ? 'Quiz Submitted' : 'Practice Quiz'}</span>
                  </Button>
                )}
                <Button 
                  onClick={handleMarkCompleted} 
                  disabled={!selectedLesson || markingComplete || lessonCompleted || checkingCompletion} 
                  variant="outline" 
                  className={`w-full sm:w-auto sm:flex-1 flex items-center justify-center gap-2 text-sm sm:text-base py-2.5 sm:py-3 px-4 sm:px-6 ${
                    lessonCompleted 
                      ? 'border-green-300 bg-green-50 text-green-700 cursor-default' 
                      : 'border-blue-300 hover:border-blue-400 text-gray-700 cursor-pointer'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {lessonCompleted ? 'Completed' : markingComplete ? 'Marking...' : checkingCompletion ? 'Checking...' : 'Mark as Completed'}
                  </span>
                </Button>
              </div>
              {selectedLesson?.description && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Lesson description</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selectedLesson.description}</p>
                </div>
              )}
            </PageSection>

            {quizMeta && (
              <PageSection title={`Lesson Quiz (${quizMeta.questionsCount} questions)`} className="border-blue-200">
                {quizAlreadySubmitted && !practiceMode && (
                  <div className="mb-2 sm:mb-3 text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1 inline-block break-words">
                    ⚠️ Quiz already submitted. You cannot submit again.
                  </div>
                )}
                {practiceMode && (
                  <div className="mb-2 sm:mb-3 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 inline-block">Practice Mode</div>
                )}
                {quizMeta.questionsCount === 0 ? (
                  <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                    <div className="text-yellow-800 font-medium text-sm sm:text-base">No quiz available for this lesson</div>
                    <div className="text-xs sm:text-sm text-yellow-700 mt-1">This lesson doesn't have any quiz questions yet.</div>
                  </div>
                ) : quizResult ? (
                  <div className="p-4 sm:p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg sm:rounded-xl shadow-sm">
                    <div className="flex items-center justify-center mb-3 sm:mb-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                      </div>
                    </div>
                    <div className="text-center mb-3 sm:mb-4">
                      <h3 className="text-lg sm:text-xl font-bold text-green-900 mb-2">
                        {quizAlreadySubmitted ? 'Quiz Submitted!' : 'Quiz Completed!'}
                      </h3>
                      <div className="text-2xl sm:text-3xl font-bold text-green-800 mb-2">{quizResult.scorePercentage}%</div>
                      {quizResult.scorePercentage === 100 && (
                        <div className="text-base sm:text-lg font-bold text-yellow-600 mb-2 animate-bounce">
                          🎉 Perfect Score! 🎉
                        </div>
                      )}
                      <div className="text-xs sm:text-sm text-green-700">
                        {quizResult.correctAnswers} out of {quizResult.totalQuestions} questions correct
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3 mb-3 sm:mb-4">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-2.5 sm:h-3 rounded-full transition-all duration-500"
                        style={{ width: `${quizResult.scorePercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs sm:text-sm text-green-700">
                      <div className="flex items-center gap-1">
                        <Target className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>Accuracy: {quizResult.scorePercentage}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span>{quizResult.scorePercentage >= 80 ? 'Excellent!' : quizResult.scorePercentage >= 60 ? 'Good!' : 'Keep practicing!'}</span>
                      </div>
                    </div>
                    {quizAlreadySubmitted && (
                      <div className="mt-4 text-center text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg py-2 px-3">
                        Note: This quiz has been submitted and cannot be retaken. You can use Practice mode for additional practice.
                      </div>
                    )}
                  </div>
                ) : quizQuestions && quizQuestions.length > 0 ? (
                  <div className="space-y-4 sm:space-y-5">
                    {/* Quiz header with progress and answered counter */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                      <div className="text-xs sm:text-sm text-gray-600">
                        Question {currentQuestionIndex + 1} of {quizQuestions.length} • Answered {Object.keys(quizAnswers).length}/{quizQuestions.length}
                      </div>
                      {Object.keys(quizAnswers).length < quizQuestions.length && (
                        <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 whitespace-nowrap">
                          Please answer all questions
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
                      ></div>
                    </div>

                    {/* Current Question */}
                    {quizQuestions[currentQuestionIndex] && (() => {
                      const q = quizQuestions[currentQuestionIndex];
                      const selected = quizAnswers[q._id];
                      return (
                        <div className="border rounded-lg p-3 sm:p-4 border-blue-300 hover:border-blue-400 transition-colors">
                          <div className="font-medium mb-2 sm:mb-3 text-sm sm:text-base break-words">{currentQuestionIndex + 1}. {q.question}</div>
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((opt: string, i: number) => {
                              const isActive = selected === i;
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => handleSelectAnswer(q._id, i)}
                                  className={`text-left px-3 py-2.5 sm:py-2 rounded border transition-colors w-full cursor-pointer ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                                    <span className={`inline-block w-4 h-4 sm:w-5 sm:h-5 rounded-full border flex-shrink-0 ${isActive ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}`}></span>
                                    <span className="break-words flex-1">{opt}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2">
                      <Button
                        onClick={handlePreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        variant="outline"
                        className="flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2.5 sm:py-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>
                      
                      {currentQuestionIndex === quizQuestions.length - 1 ? (
                        <Button
                          onClick={handleSubmitQuiz}
                          disabled={quizSubmitting || quizAlreadySubmitted || Object.keys(quizAnswers).length < quizQuestions.length}
                          className="flex-1 sm:flex-initial min-w-[140px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2.5 sm:py-2"
                          title={quizAlreadySubmitted ? "Quiz already submitted" : Object.keys(quizAnswers).length < quizQuestions.length ? "Please answer all questions" : ""}
                        >
                          {quizSubmitting ? 'Submitting...' : quizAlreadySubmitted ? 'Already Submitted' : 'Submit Quiz'}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleNextQuestion}
                          className="flex-1 sm:flex-initial min-w-[140px] text-sm sm:text-base py-2.5 sm:py-2"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <span className="sm:hidden">Next</span>
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                ) : null}
              </PageSection>
            )}

            {/* Submission History - Always show when lesson is selected */}
            {selectedLesson && (
              <PageSection 
                title={`Quiz History${submissionHistory.length > 0 ? ` (${submissionHistory.length} ${submissionHistory.length === 1 ? 'attempt' : 'attempts'})` : ''}`}
                actions={
                  submissionHistory.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSubmissionHistory(!showSubmissionHistory)}
                      className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                    >
                      <History className="w-3 h-3 sm:w-4 sm:h-4" />
                      {showSubmissionHistory ? 'Hide History' : 'Show History'}
                    </Button>
                  )
                }
                className="border-purple-200"
              >
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                ) : showSubmissionHistory && submissionHistory.length > 0 ? (
                  <div className="space-y-2 sm:space-y-3">
                    {submissionHistory.map((submission: any, index: number) => (
                    <div key={submission._id || index} className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2">
                          <History className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium text-purple-800">
                            Attempt #{submissionHistory.length - index}
                            {submission.isPracticeMode && (
                              <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">Practice</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                          <span className="text-xs text-gray-600 whitespace-nowrap">
                            {new Date(submission.submittedAt).toLocaleDateString()} at {new Date(submission.submittedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="text-xl sm:text-2xl font-bold text-purple-800">
                            {submission.scorePercentage}%
                          </div>
                          <div className="text-xs sm:text-sm text-purple-700">
                            {submission.correctAnswers}/{submission.totalQuestions} correct
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {submission.scorePercentage >= 80 ? (
                            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                          ) : submission.scorePercentage >= 60 ? (
                            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0" />
                          )}
                          <span className="text-xs font-medium text-gray-700">
                            {submission.scorePercentage >= 80 ? 'Excellent' : submission.scorePercentage >= 60 ? 'Good' : 'Keep practicing'}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            submission.scorePercentage >= 80 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                            submission.scorePercentage >= 60 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                            'bg-gradient-to-r from-blue-400 to-blue-600'
                          }`}
                          style={{ width: `${submission.scorePercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  </div>
                ) : showSubmissionHistory && submissionHistory.length === 0 ? (
                  <div className="p-4 sm:p-6 text-center bg-gray-50 border border-gray-200 rounded-lg">
                    <History className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm sm:text-base text-gray-600">No quiz submissions yet for this lesson</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Complete the quiz to see your submission history here</p>
                  </div>
                ) : null}
              </PageSection>
            )}
          </div>

          {/* Right: Chapters and Lessons */}
          <div className="flex flex-col space-y-2 sm:space-y-3 md:space-y-4 min-h-0 order-2 lg:order-last">
            {/* Course Progress Overview */}
            {courseProgress && (
              <PageSection title="Course Progress" className="border-green-200">
                <div className="space-y-2 sm:space-y-3">
                  <div className="p-2.5 sm:p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm sm:text-base font-medium text-green-800">Overall Progress</span>
                      <span className="text-base sm:text-lg font-bold text-green-600">{courseProgress.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${courseProgress.progressPercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between gap-1 sm:gap-0 text-xs text-green-700">
                      <span>{courseProgress.completedLessons}/{courseProgress.totalLessons} lessons</span>
                      <span>{courseProgress.totalTimeSpent}min total</span>
                    </div>
                  </div>
                </div>
              </PageSection>
            )}

            <PageSection title="Chapters">
              <div className="space-y-2 sm:space-y-3">
                {chapters.length === 0 ? (
                  <div className="text-xs sm:text-sm text-gray-500">No chapters available.</div>
                ) : (
                  chapters.map((ch) => {
                    const chapterProg = chapterProgress[ch._id];
                    const isChapterCompleted = chapterProg?.isCompleted || false;
                    const chapterProgressPercentage = chapterProg?.progressPercentage || 0;
                    
                    const isOpen = openChapterId === ch._id;
                    const chapterLessons = lessonsByChapter[ch._id] || [];
                    
                    return (
                      <Collapsible
                        key={ch._id}
                        open={isOpen}
                        onOpenChange={(open) => {
                          if (open) {
                            // When opening a chapter, close all others by setting only this one as open
                            setOpenChapterId(ch._id);
                          } else {
                            // When closing, set to null
                            setOpenChapterId(null);
                          }
                        }}
                      >
                        <div className={`border rounded-lg overflow-hidden ${
                          isChapterCompleted 
                            ? 'border-green-300 bg-green-50' 
                            : 'border-blue-300 bg-white'
                        }`}>
                          <CollapsibleHeader className={`p-2.5 sm:p-3 cursor-pointer ${
                            isChapterCompleted 
                              ? 'hover:bg-green-100' 
                              : 'hover:bg-blue-50'
                          }`}>
                            <div className="flex items-start sm:items-center justify-between gap-2 w-full">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="text-sm sm:text-base font-semibold break-words flex-1 min-w-0 text-left">{ch.title}</div>
                                {isChapterCompleted && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 sm:py-1 rounded-full whitespace-nowrap flex-shrink-0">
                                    
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {chapterProg && (
                              <div className="mt-2 w-full">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-600">Progress</span>
                                  <span className="text-xs font-medium text-gray-700">{chapterProgressPercentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full transition-all duration-500 ${
                                      isChapterCompleted 
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                    }`}
                                    style={{ width: `${chapterProgressPercentage}%` }}
                                  ></div>
                                </div>
                                <div className="flex flex-col sm:flex-row justify-between gap-0.5 sm:gap-0 text-xs text-gray-500 mt-1">
                                  <span>{chapterProg.completedLessons}/{chapterProg.totalLessons} lessons</span>
                                  <span>{chapterProg.totalTimeSpent}min</span>
                                </div>
                              </div>
                            )}
                          </CollapsibleHeader>
                          
                          {chapterLessons.length > 0 && (
                            <CollapsibleContent className="px-2.5 sm:px-3 pb-2.5 sm:pb-3">
                              <div className="space-y-1.5 sm:space-y-2 pt-2 border-t border-gray-200">
                                {chapterLessons.map((l) => {
                                  const lessonProg = chapterProg?.lessons?.find((lp: any) => lp.id === l._id);
                                  const isLessonCompleted = lessonProg?.isCompleted || false;
                                  
                                  return (
                                    <button
                                      key={l._id}
                                      className={`w-full text-left px-2.5 sm:px-3 py-1.5 sm:py-2 rounded border transition-colors cursor-pointer ${
                                        selectedLessonId === l._id 
                                          ? 'border-blue-400 bg-blue-50' 
                                          : isLessonCompleted
                                          ? 'border-green-300 bg-green-50'
                                          : 'border-gray-200 hover:bg-gray-50'
                                      }`}
                                      onClick={() => setSelectedLessonId(l._id)}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                                          {isLessonCompleted && (
                                            <span className="text-green-600 flex-shrink-0">✓</span>
                                          )}
                                          <span className="text-xs sm:text-sm font-medium truncate">{l.order}. {l.title}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                                          {l.duration && (
                                            <span className="text-xs text-gray-500 whitespace-nowrap">{Math.round((l.duration || 0) / 60)}m</span>
                                          )}
                                          {isLessonCompleted && (
                                            <span className="text-xs text-green-600 whitespace-nowrap">Done</span>
                                          )}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          )}
                        </div>
                      </Collapsible>
                    );
                  })
                )}
              </div>
            </PageSection>
          </div>
        </div>

        {/* Congratulatory Modal */}
        <Dialog open={showCongratsModal} onOpenChange={setShowCongratsModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex flex-col items-center text-center space-y-4 py-4">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  Congratulations! 🎉
                </DialogTitle>
                <DialogDescription className="text-base text-gray-600">
                  You've successfully completed this lesson! Great job!
                </DialogDescription>
              </div>
            </DialogHeader>
            
            {/* Quiz availability message */}
            {!hasQuiz && (
              <div className="px-4 pb-2">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
                  <Target className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-800">No Quiz Available</p>
                    <p className="text-xs text-yellow-700 mt-1">This lesson doesn't have a quiz. You can continue to the next lesson.</p>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
              {hasQuiz && (
                <Button
                  onClick={handleStartPracticeQuizFromModal}
                  disabled={quizAlreadySubmitted}
                  className="w-full sm:w-auto relative overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 hover:from-blue-600 hover:via-purple-600 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 px-6 py-3 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg group"
                  title={quizAlreadySubmitted ? "Quiz already submitted. Practice mode is disabled." : ""}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                  <PlayCircle className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">{quizAlreadySubmitted ? 'Quiz Submitted' : 'Start Practice Quiz'}</span>
                </Button>
              )}
              <Button
                onClick={handleContinueLearning}
                className="w-full sm:w-auto relative overflow-hidden bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 hover:from-green-600 hover:via-emerald-600 hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 px-6 py-3 rounded-xl cursor-pointer group"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
                <span className="relative z-10">Continue Learning</span>
                <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform duration-200" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </StudentDashboardLayout>
  );
}


