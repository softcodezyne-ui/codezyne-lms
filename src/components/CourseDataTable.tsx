'use client';

import { Course } from '@/types/course';
import { Badge } from '@/components/ui/badge';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import { LuPencil as Edit, LuTrash2 as Trash2, LuEye as Eye, LuDollarSign as DollarSign, LuTag as Tag, LuBookOpen as BookOpen, LuUser as User } from 'react-icons/lu';;
import { format } from 'date-fns';

interface CourseDataTableProps {
  courses: Course[];
  loading: boolean;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
  onView?: (course: Course) => void;
  onBuild?: (course: Course) => void;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onPageChange: (page: number) => void;
  variant?: 'table' | 'cards' | 'list';
}

export default function CourseDataTable({
  courses,
  loading,
  onEdit,
  onDelete,
  onView,
  onBuild,
  pagination,
  onPageChange,
  variant = 'table'
}: CourseDataTableProps) {
  const getPriceBadge = (course: Course) => {
    if (!course.isPaid) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Free
        </Badge>
      );
    }

    if (course.salePrice && course.salePrice < course.price!) {
      return (
        <div className="flex items-center gap-1">
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            ${course.salePrice}
          </Badge>
          <span className="text-xs text-gray-500 line-through">
            ${course.price}
          </span>
          <Badge variant="outline" className="text-xs">
            {course.discountPercentage}% off
          </Badge>
        </div>
      );
    }

    return (
      <Badge variant="default" className="text-white" style={{
        background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
      }}>
        ${course.price}
      </Badge>
    );
  };

  const getCategoryBadge = (course: Course) => {
    if (!course.category) return null;
    
    const categoryInfo = course.categoryInfo;
    const color = categoryInfo?.color || '#3B82F6';
    const icon = categoryInfo?.icon;
    
    return (
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full border border-gray-300"
          style={{ backgroundColor: color }}
        ></div>
        <Badge 
          variant="outline" 
          className="text-xs"
          style={{ 
            borderColor: color,
            color: color,
            backgroundColor: `${color}10`
          }}
        >
          {icon && <span className="mr-1">{icon}</span>}
          {course.category}
        </Badge>
      </div>
    );
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const columns: Column<Course>[] = [
    {
      key: 'course',
      label: 'Course',
      width: 'w-2/5',
      render: (course) => (
        <div className="flex items-center space-x-3">
          <div className="relative flex-shrink-0">
            {course.thumbnailUrl ? (
              <div className="w-12 h-12 rounded-lg overflow-hidden shadow-md">
                <img
                  src={course.thumbnailUrl}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-semibold text-sm shadow-md" style={{
                background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
              }}>
                <Tag className="w-6 h-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">
              {course.title}
            </p>
            <p className="text-sm text-gray-500 truncate" title={course.description || 'No description'}>
              {course.description ? 
                (course.description.length > 30 ? `${course.description.substring(0, 30)}...` : course.description) 
                : 'No description'
              }
            </p>
            <div className="flex items-center gap-2 mt-1">
              {getCategoryBadge(course)}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'pricing',
      label: 'Pricing',
      width: 'w-1/4',
      render: (course) => (
        <div className="space-y-1">
          {getPriceBadge(course)}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <DollarSign className="w-3 h-3" />
            <span>
              {course.isPaid ? 'Paid Course' : 'Free Course'}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-1/6',
      render: (course) => (
        <div>
          <Badge 
            variant={
              course.status === 'published' ? 'default' : 
              course.status === 'draft' ? 'secondary' : 
              'outline'
            }
            className={
              course.status === 'published' ? 'bg-green-100 text-green-800' :
              course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }
          >
            {course.status === 'published' ? 'Published' :
             course.status === 'draft' ? 'Draft' :
             course.status === 'archived' ? 'Archived' : 'Unknown'}
          </Badge>
        </div>
      )
    },
    {
      key: 'creator',
      label: 'Creator',
      width: 'w-1/4',
      render: (course) => (
        <div className="space-y-1">
          {course.createdBy ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{
                background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
              }}>
                <User className="w-3 h-3" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {course.createdBy.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {course.createdBy.email}
                </p>
                <Badge 
                  variant="outline" 
                  className="text-xs mt-1"
                  style={{
                    borderColor: course.createdBy.role === 'admin' ? '#10B981' : 
                                 course.createdBy.role === 'instructor' ? '#7B2CBF' : '#6B7280',
                    color: course.createdBy.role === 'admin' ? '#10B981' : 
                           course.createdBy.role === 'instructor' ? '#7B2CBF' : '#6B7280',
                    backgroundColor: course.createdBy.role === 'admin' ? '#10B98110' : 
                                    course.createdBy.role === 'instructor' ? '#7B2CBF10' : '#6B728010'
                  }}
                >
                  {course.createdBy.role}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              Unknown creator
            </div>
          )}
        </div>
      )
    },
    {
      key: 'instructor',
      label: 'Instructor',
      width: 'w-1/4',
      render: (course) => (
        <div className="space-y-1">
          {course.instructor ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{
                background: "linear-gradient(135deg, #7B2CBF 0%, #A855F7 100%)",
              }}>
                <User className="w-3 h-3" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {typeof course.instructor === 'string' 
                    ? 'Instructor' 
                    : `${(course.instructor as any).firstName} ${(course.instructor as any).lastName}`
                  }
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {typeof course.instructor === 'string' 
                    ? 'Instructor' 
                    : course.instructor.email
                  }
                </p>
                <Badge 
                  variant="outline" 
                  className="text-xs mt-1"
                  style={{
                    borderColor: '#8B5CF6',
                    color: '#8B5CF6',
                    backgroundColor: '#8B5CF610'
                  }}
                >
                  instructor
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              No instructor assigned
            </div>
          )}
        </div>
      )
    },
    {
      key: 'created',
      label: 'Created',
      width: 'w-1/6',
      render: (course) => (
        <div className="text-sm text-gray-900">
          {formatDate(course.createdAt)}
        </div>
      )
    }
  ];

  const actions: Action<Course>[] = [
    ...(onView ? [{
      key: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: onView,
      variant: 'secondary' as const
    }] : []),
    ...(onBuild ? [{
      key: 'build',
      label: 'Build Course',
      icon: <BookOpen className="w-4 h-4" />,
      onClick: onBuild,
      variant: 'default' as const
    }] : []),
    {
      key: 'edit',
      label: 'Edit Course',
      icon: <Edit className="w-4 h-4" />,
      onClick: onEdit,
      variant: 'secondary' as const
    },
    {
      key: 'delete',
      label: 'Delete Course',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: onDelete,
      variant: 'destructive' as const
    }
  ];

  const emptyState = {
    title: 'No courses found',
    description: 'Get started by adding a new course to the system.',
    icon: (
      <svg className="w-10 h-10" style={{ color: '#A855F7' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    )
  };

  return (
    <DataTable
      data={courses}
      columns={columns}
      actions={actions}
      loading={loading}
      emptyState={emptyState}
      pagination={{
        ...pagination,
        onPageChange
      }}
      variant={variant}
      getItemId={(course) => course._id}
    />
  );
}
