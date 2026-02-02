import Image from "next/image";
import Link from "next/link";
import { LuShoppingCart as ShoppingCart } from 'react-icons/lu';

interface CourseCardProps {
  course: {
    id: number;
    image: string;
    level: string;
    levelColor: string;
    category: string;
    categoryColor: string;
    rating: string;
    title: string;
    lectures: number;
    hours: number;
    instructor: {
      name: string;
      avatar: string;
    };
    price: number;
    originalPrice: number | null;
  };
  index?: number;
  isLoaded?: boolean;
  animationDelay?: string;
  className?: string;
}

export default function CourseCard({
  course,
  index = 0,
  isLoaded = true,
  animationDelay,
  className = "",
}: CourseCardProps) {
  const delay = animationDelay || `${0.1 * index}s`;

  return (
    <Link
      href={(course as any).courseId ? `/course/${(course as any).courseId}` : "/course-details"}
      className={`${
        isLoaded ? "animate-fade-in-up" : "animate-on-load"
      } group block overflow-hidden rounded-3xl bg-white shadow-lg transition-all hover:shadow-xl ${className}`}
      style={{ animationDelay: delay }}
    >
      {/* Course Image */}
      <div className="relative h-52 overflow-hidden p-4 md:h-60 lg:h-64">
        <div className="relative h-full w-full overflow-hidden rounded-2xl">
          <Image
            src={course.image}
            alt={course.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        </div>
      </div>

      {/* Course Content */}
      <div className="p-5">
        {/* Rating with 5 Stars and Review Amount - Attractive Design */}
        <div className="mb-4 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 px-4 py-2.5 shadow-sm border border-yellow-100/50">
          {/* 5 Stars with gradient */}
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                className="text-yellow-400 drop-shadow-sm transition-transform duration-200 hover:scale-110"
                style={{
                  filter: 'drop-shadow(0 1px 2px rgba(251, 191, 36, 0.3))',
                }}
              >
                <path
                  d="M10 1L12.5 7.5L19 8.5L14 13L15.5 19.5L10 16L4.5 19.5L6 13L1 8.5L7.5 7.5L10 1Z"
                  fill="currentColor"
                />
              </svg>
            ))}
          </div>
          {/* Review Amount with icon */}
          <div className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-amber-600"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                fill="currentColor"
              />
            </svg>
            <span className="text-sm font-bold text-gray-800">
              {course.rating}
            </span>
            <span className="text-xs font-medium text-gray-600">
              reviews
            </span>
          </div>
        </div>

        {/* Course Title */}
        <h3 className="mb-4 line-clamp-2 text-lg font-bold leading-tight text-gray-800">
          {course.title}
        </h3>

        {/* Price and Buy Now Button Row */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 gap-4">
          {/* Price - Left */}
          <div className="flex items-center gap-2">
            {course.originalPrice && (
              <span className="text-sm font-medium text-gray-400 line-through">
                ${course.originalPrice}
              </span>
            )}
            <span className="text-lg font-bold text-red-600">
              ${course.price}
            </span>
          </div>
          
          {/* Buy Now Button - Right */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Handle buy now action - you can add your purchase logic here
              const courseId = (course as any).courseId || course.id;
              window.location.href = `/course/${courseId}?action=buy`;
            }}
            className="group/btn relative h-11 px-6 text-white font-bold transition-all duration-300 shadow-xl rounded-xl flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)",
              boxShadow: "0 8px 20px rgba(16, 185, 129, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #059669 0%, #047857 50%, #065F46 100%)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)";
            }}
          >
            {/* Animated shine effect */}
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"></span>
            
            {/* Button content */}
            <span className="relative z-10 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 transition-transform duration-300 group-hover/btn:rotate-12" />
              <span className="text-sm tracking-wide">এখন কিনুন</span>
            </span>
            
          </button>
        </div>
      </div>
    </Link>
  );
}

