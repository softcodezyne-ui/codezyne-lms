"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface Review {
  _id: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  rating: number;
  reviewType?: 'text' | 'video';
  title?: string;
  comment?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  displayOrder?: number;
  createdAt: string;
  isApproved?: boolean;
  isPublic?: boolean;
  isDisplayed?: boolean;
}

export default function Testimonials() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [videoReviews, setVideoReviews] = useState<any[]>([]);
  const [textReviews, setTextReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsLoaded(true);
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      // Fetch displayed, approved, and public reviews
      const response = await fetch('/api/course-reviews?limit=20', {
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const reviewsData = data.data?.reviews || data.reviews || [];

        // Filter for displayed, approved, and public reviews
        const displayedReviews = reviewsData.filter((review: Review) => 
          (review.isDisplayed !== false) && review.isApproved && review.isPublic
        );

        // Sort by displayOrder (lower numbers first), then by createdAt (newest first) as fallback
        const sortedReviews = displayedReviews.sort((a: Review, b: Review) => {
          const orderA = a.displayOrder || 999999;
          const orderB = b.displayOrder || 999999;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Separate video and text reviews
        const video = sortedReviews
          .filter((review: Review) => review.reviewType === 'video' && review.videoUrl)
          .slice(0, 4)
          .map((review: Review, index: number) => ({
            id: review._id,
            thumbnail: review.videoThumbnail || review.student.avatar || "https://live.themewild.com/edubo/assets/img/testimonial/01.jpg",
            videoUrl: review.videoUrl,
            name: `${review.student.firstName} ${review.student.lastName}`,
            nameBengali: `${review.student.firstName} ${review.student.lastName}`, // You can add Bengali name field to student model if needed
      role: "Student",
      roleBengali: "শিক্ষার্থী",
            duration: "2:35", // You might want to calculate this from video metadata
            avatar: review.student.avatar || "https://live.themewild.com/edubo/assets/img/testimonial/01.jpg",
          }));

        const text = sortedReviews
          .filter((review: Review) => review.reviewType !== 'video' || !review.videoUrl)
          .slice(0, 4)
          .map((review: Review, index: number) => ({
            id: review._id,
            name: `${review.student.firstName} ${review.student.lastName}`,
            nameBengali: `${review.student.firstName} ${review.student.lastName}`, // You can add Bengali name field to student model if needed
      role: "Student",
      roleBengali: "শিক্ষার্থী",
            avatar: review.student.avatar || "https://live.themewild.com/edubo/assets/img/testimonial/01.jpg",
            quote: review.comment || review.title || "",
            quoteBengali: review.comment || review.title || "",
            rating: review.rating,
          }));

        setVideoReviews(video);
        setTextReviews(text);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Fallback to empty arrays on error
      setVideoReviews([]);
      setTextReviews([]);
    } finally {
      setLoading(false);
    }
  };


  return (
    <section className="ts-bg relative overflow-hidden py-20 px-4 md:px-6 lg:px-8">

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center md:mb-16">
          {/* Testimonials Badge */}
          <div
            className={`mb-4 inline-flex items-center gap-3 rounded-full bg-[#A855F7] px-5 py-2.5 ${
              isLoaded ? "animate-fade-in-up" : "animate-on-load"
            }`}
            style={{
              animationDelay: "0.1s",
              fontFamily: "var(--font-bengali), sans-serif",
            }}
          >
            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="text-[#A855F7]"
              >
                <path
                  d="M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z"
                  fill="currentColor"
                />
                <path
                  d="M9 21H15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="text-xs font-semibold text-white">টেস্টিমোনিয়াল</span>
          </div>

          {/* Main Title */}
          <h2
            className={`text-3xl font-bold leading-tight md:text-4xl lg:text-5xl ${
              isLoaded ? "animate-fade-in-up" : "animate-on-load"
            }`}
            style={{
              animationDelay: "0.3s",
              fontFamily: "var(--font-bengali), sans-serif",
            }}
          >
            <span className="text-[#1E3A8A]">আমাদের ক্লায়েন্টরা</span>{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(to right, #14B8A6, #EC4899, #A855F7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              আমাদের সম্পর্কে কী বলে
            </span>
          </h2>
        </div>

        {/* First Row - Video Reviews */}
        {loading ? (
          <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200"></div>
            ))}
          </div>
        ) : videoReviews.length > 0 ? (
        <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {videoReviews.map((video, index) => (
            <div
              key={video.id}
              className={`group relative overflow-hidden rounded-xl ${
                isLoaded ? "animate-fade-in-up" : "animate-on-load"
              }`}
              style={{
                animationDelay: `${0.1 * index}s`,
              }}
            >
              <div
                className="relative rounded-xl p-[2px]"
                style={{
                  background: "linear-gradient(to right, #A855F7, #EC4899)",
                }}
              >
                  <div className="relative flex flex-col overflow-hidden rounded-xl bg-white shadow-lg transition-all hover:shadow-xl h-full">
                  {/* Video Thumbnail or Player */}
                    <div className="relative aspect-video w-full overflow-hidden bg-gray-900 flex-shrink-0">
                    {playingVideo === video.id ? (
                        <video
                          src={video.videoUrl}
                          controls
                          autoPlay
                          className="h-full w-full object-contain"
                          onEnded={() => setPlayingVideo(null)}
                        >
                          Your browser does not support the video tag.
                        </video>
                    ) : (
                      <>
                        <Image
                          src={video.thumbnail}
                          alt={`Video review by ${video.nameBengali}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                        {/* Play Button Overlay */}
                        <button
                          onClick={() => setPlayingVideo(video.id)}
                          className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/30 transition-all hover:bg-black/40"
                        >
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-all hover:scale-110">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              className="ml-1 text-[#A855F7]"
                            >
                              <path
                                d="M8 5V19L19 12L8 5Z"
                                fill="currentColor"
                              />
                            </svg>
                          </div>
                        </button>
                        {/* Duration Badge */}
                          {video.duration && (
                        <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">
                          {video.duration}
                        </div>
                          )}
                      </>
                    )}
                  </div>

                  {/* Video Info */}
                  <div className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Student Avatar */}
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border-2 border-white shadow-md">
                          <Image
                            src={video.avatar}
                            alt={video.nameBengali}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                    <h4
                            className="mb-1 text-base font-bold text-[#1E3A8A] truncate"
                      style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                    >
                      {video.nameBengali}
                    </h4>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: "#FF6B35",
                        fontFamily: "var(--font-bengali), sans-serif",
                      }}
                    >
                      {video.roleBengali}
                    </p>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        ) : null}

        {/* Second Row - Text-Based Reviews */}
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-xl bg-gray-200"></div>
            ))}
          </div>
        ) : textReviews.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {textReviews.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={`${
                isLoaded ? "animate-fade-in-up" : "animate-on-load"
              }`}
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              <div
                className="relative rounded-xl p-[2px]"
                style={{
                  background: "linear-gradient(to right, #A855F7, #EC4899)",
                }}
              >
                  <div className="relative flex flex-col h-full min-h-[320px] overflow-hidden rounded-xl bg-white p-6 shadow-lg transition-all hover:shadow-xl">
                  {/* Quote Icon - Top Right */}
                  <div className="absolute right-4 top-4 opacity-20">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M3 21C3 17.4 3 15.1 3 14C3 9.58172 6.58172 6 11 6C12.8565 6 14.637 6.7375 15.9497 8.05025C17.2625 9.36301 18 11.1435 18 13C18 17.4183 14.4183 21 10 21H3Z"
                        fill="#FF6B35"
                        opacity="0.3"
                      />
                      <path
                        d="M21 21C21 17.4 21 15.1 21 14C21 9.58172 17.4183 6 13 6C11.1435 6 9.36301 6.7375 8.05025 8.05025C6.7375 9.36301 6 11.1435 6 13C6 17.4183 9.58172 21 14 21H21Z"
                        fill="#FF6B35"
                        opacity="0.3"
                      />
                    </svg>
                  </div>

                  {/* Star Rating */}
                  <div className="mb-4 flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                          className={star <= testimonial.rating ? "text-yellow-400" : "text-gray-300"}
                      >
                        <path
                          d="M10 1L12.5 7.5L19 8.5L14 13L15.5 19.5L10 16L4.5 19.5L6 13L1 8.5L7.5 7.5L10 1Z"
                          fill="currentColor"
                        />
                      </svg>
                    ))}
                  </div>

                  {/* Quote Text */}
                    <div className="flex-1 flex flex-col justify-between">
                      {testimonial.quote && (
                  <p
                          className="mb-6 text-sm leading-relaxed text-gray-700 line-clamp-4 flex-1"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {testimonial.quoteBengali}
                  </p>
                      )}

                  {/* Client Profile */}
                  <div
                        className="flex items-center gap-3 rounded-lg p-3 mt-auto"
                    style={{
                      background: "linear-gradient(to right, #FFE5D9, #FFD6CC)",
                    }}
                  >
                    {/* Profile Picture */}
                    <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white shadow-md">
                      <Image
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>

                    {/* Name and Role */}
                    <div className="flex-1">
                      <h4
                        className="text-sm font-bold text-[#1E3A8A]"
                        style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                      >
                        {testimonial.nameBengali}
                      </h4>
                      <p
                        className="text-xs font-medium"
                        style={{
                          color: "#FF6B35",
                          fontFamily: "var(--font-bengali), sans-serif",
                        }}
                      >
                        {testimonial.roleBengali}
                      </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        ) : null}
      </div>
    </section>
  );
}

