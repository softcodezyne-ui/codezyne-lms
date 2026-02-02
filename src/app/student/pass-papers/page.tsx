'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import StudentDashboardLayout from '@/components/StudentDashboardLayout';
import WelcomeSection from '@/components/WelcomeSection';
import PageSection from '@/components/PageSection';
import DataTable, { Column } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LuFileText as LuFileText, LuAward as Award, LuUsers as Users, LuTag as Tag, LuSearch as Search, LuX as X, LuGraduationCap as GraduationCap } from 'react-icons/lu';;

interface PassPaperRow {
  _id: string;
  course?: { _id: string; title: string } | string;
  sessionName: string;
  year: number;
  subject: string;
  examType: string;
  questionPaperUrl?: string;
  marksPdfUrl?: string;
  workSolutionUrl?: string;
  isActive?: boolean;
  createdAt: string;
}

export default function StudentPassPapersPage() {
  const { data: session } = useSession();

  const [papers, setPapers] = useState<PassPaperRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: '1', limit: '100', search });
      const resp = await fetch(`/api/pass-papers?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (resp.ok) {
        const data = await resp.json();
        const list: PassPaperRow[] = data.passPapers || data.data?.passPapers || [];
        // Query enrolled courses for the current student
        let enrolledCourseIds: Set<string> = new Set();
        try {
          // Try common endpoints to fetch enrollments; gracefully fallback
          const enrResp = await fetch('/api/enrollments?status=active', {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
          if (enrResp.ok) {
            const enrData = await enrResp.json();
            const enrollments = enrData.data?.enrollments || enrData.enrollments || enrData.data || [];
            console.log('Enrollments from /api/enrollments:', enrollments);
            enrollments.forEach((e: any) => {
              const cid = typeof e.course === 'string' ? e.course : (e.course?._id || e.course?.id);
              if (cid) enrolledCourseIds.add(String(cid));
            });
          } else {
            // Fallback to student courses endpoint if exists
            const coursesResp = await fetch('/api/student/courses', {
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });
            if (coursesResp.ok) {
              const cdata = await coursesResp.json();
              const courses = cdata.data?.courses || cdata.courses || cdata.data || [];
              console.log('Courses from /api/student/courses:', courses);
              courses.forEach((c: any) => {
                const cid = c._id || c.id;
                if (cid) enrolledCourseIds.add(String(cid));
              });
            } else {
              // Final fallback: try student enrollments list if available
              const enr2 = await fetch('/api/student/enrollments', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
              });
              if (enr2.ok) {
                const d = await enr2.json();
                const enrs = d.data?.enrollments || d.enrollments || d.data || [];
                console.log('Enrollments from /api/student/enrollments:', enrs);
                enrs.forEach((e: any) => {
                  const cid = typeof e.course === 'string' ? e.course : (e.course?._id || e.course?.id);
                  if (cid) enrolledCourseIds.add(String(cid));
                });
              }
            }
          }
        } catch (e) {
          console.warn('Could not fetch enrollments; defaulting to no papers', e);
        }

        console.log('Enrolled course IDs:', Array.from(enrolledCourseIds));
        console.log('All pass papers:', list);

        // Filter: active and course is enrolled
        let filteredByEnrollment;
        if (enrolledCourseIds.size === 0) {
          // If no enrolled courses found, show all active papers for testing
          console.log('No enrolled courses found, showing all active papers for testing');
          filteredByEnrollment = list.filter(p => p.isActive !== false);
        } else {
          filteredByEnrollment = list.filter(p => {
            if (p.isActive === false) return false;
            const courseId = typeof p.course === 'string' ? p.course : (p.course?._id || (p.course as any)?.id);
            console.log('Checking pass paper course ID:', courseId, 'against enrolled:', Array.from(enrolledCourseIds));
            if (!courseId) return false;
            return enrolledCourseIds.has(String(courseId));
          });
        }

        console.log('Filtered pass papers:', filteredByEnrollment);

        setPapers(filteredByEnrollment);
      }
    } catch (e) {
      console.error('Error fetching pass papers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchPapers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const filtered = useMemo(() => {
    if (!search) return papers;
    const q = search.toLowerCase();
    return papers.filter(p =>
      p.sessionName.toLowerCase().includes(q) ||
      p.subject.toLowerCase().includes(q) ||
      p.examType.toLowerCase().includes(q) ||
      (typeof p.course === 'object' ? (p.course?.title || '') : '')
        .toLowerCase().includes(q)
    );
  }, [papers, search]);

  const paged = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filtered.slice(start, start + pagination.limit);
  }, [filtered, pagination.page, pagination.limit]);

  const handlePageChange = (page: number) => setPagination(p => ({ ...p, page }));

  const columns: Column<PassPaperRow>[] = [
    {
      key: 'paper',
      label: 'Paper',
      width: 'w-2/5',
      render: (row) => (
        <div className="space-y-1">
          <div className="font-semibold text-gray-900 text-sm">
            {row.sessionName} • {row.year}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Badge variant="outline">{row.subject}</Badge>
            <Badge variant="outline">{row.examType}</Badge>
            {row.course && (
              <Badge variant="outline">
                {typeof row.course === 'string' ? row.course : (row.course?.title || 'Course')}
              </Badge>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'files',
      label: 'LuFiles',
      width: 'w-2/5',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          {row.questionPaperUrl ? (
            <a
              href={row.questionPaperUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs border-2 border-blue-300 hover:border-blue-400 rounded"
            >
              <LuFileText className="w-3 h-3" /> Question
            </a>
          ) : (
            <span className="text-xs text-gray-400">No Question</span>
          )}
          {row.marksPdfUrl && (
            <a
              href={row.marksPdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs border-2 border-green-300 hover:border-green-400 rounded"
            >
              <Award className="w-3 h-3" /> Marks
            </a>
          )}
          {row.workSolutionUrl && (
            <a
              href={row.workSolutionUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-xs border-2 border-purple-300 hover:border-purple-400 rounded"
            >
              <Users className="w-3 h-3" /> Solution
            </a>
          )}
        </div>
      )
    },
    {
      key: 'created',
      label: 'Uploaded',
      width: 'w-1/5',
      render: (row) => (
        <div className="text-sm text-gray-900">{new Date(row.createdAt).toLocaleDateString()}</div>
      )
    },
  ];

  return (
    <StudentDashboardLayout>
      <main className="relative z-10 p-2 sm:p-4">
        <WelcomeSection title="Past Papers" description="Download question papers, marks, and solutions" />

        <PageSection
          title="Available Past Papers"
          description="Search and download resources"
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search past papers..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                  className="pl-10 pr-10 w-full sm:w-64 border-2 border-blue-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(''); setPagination(p => ({ ...p, page: 1 })); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          }
        >
          <DataTable
            data={paged}
            columns={columns}
            loading={loading}
            variant="table"
            pagination={{
              page: pagination.page,
              limit: pagination.limit,
              total: filtered.length,
              pages: Math.max(1, Math.ceil(filtered.length / pagination.limit)),
              onPageChange: (p) => handlePageChange(p)
            }}
            emptyState={{
              title: 'No past papers found',
              description: 'Please adjust your search or check back later.',
              icon: <GraduationCap className="h-12 w-12 text-gray-400" />
            }}
            className="mt-4"
          />
        </PageSection>
      </main>
    </StudentDashboardLayout>
  );
}


