export interface CourseCategoryInfo {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive: boolean;
}

export interface CourseCreator {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface Course {
  _id: string;
  title: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  categoryInfo?: CourseCategoryInfo | null;
  thumbnailUrl?: string;
  isPaid: boolean;
  status: 'draft' | 'published' | 'archived';
  price?: number;
  salePrice?: number;
  originalPrice?: number;
  finalPrice: number;
  discountPercentage: number;
  duration?: number; // in minutes
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  lessonCount?: number;
  enrollmentCount?: number;
  tags?: string[];
  createdBy?: CourseCreator;
  instructor?: string | CourseCreator;
  instructorInfo?: CourseCreator;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseRequest {
  title: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  isPaid: boolean;
  status?: 'draft' | 'published' | 'archived';
  price?: number;
  salePrice?: number;
  instructor?: string;
}

export interface UpdateCourseRequest {
  title?: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  isPaid?: boolean;
  status?: 'draft' | 'published' | 'archived';
  price?: number;
  salePrice?: number;
  instructor?: string;
}

export interface CourseFilters {
  search?: string;
  category?: string;
  isPaid?: boolean;
  status?: 'draft' | 'published' | 'archived';
  minPrice?: number;
  maxPrice?: number;
}

export interface CourseStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  archivedCourses: number;
  paidCourses: number;
  freeCourses: number;
  totalRevenue: number;
  averagePrice: number;
  categories: { [key: string]: number };
}

export interface CoursePagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CourseListResponse {
  courses: Course[];
  pagination: CoursePagination;
  stats?: CourseStats;
}

export interface CourseSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isPaid?: boolean;
  status?: 'draft' | 'published' | 'archived';
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'title' | 'price' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
