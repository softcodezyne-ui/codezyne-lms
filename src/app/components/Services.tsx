"use client";

import { useEffect, useState } from "react";
import { LuMonitor, LuClock, LuAward, LuUser, LuBriefcase, LuLock } from "react-icons/lu";
import type { ServicesContent } from "@/constants/servicesContent";
import { defaultServicesContent } from "@/constants/servicesContent";

interface ServicesProps {
  initialContent?: ServicesContent;
}

// Icon components based on iconType using react-icons
const IconRenderer = ({ iconType }: { iconType: 'online-courses' | 'live-classes' | 'certification' | 'expert-support' | 'career-guidance' | 'lifetime-access' }) => {
  const iconProps = {
    size: 48,
    className: "text-white",
  };

  switch (iconType) {
    case 'online-courses':
      return <LuMonitor {...iconProps} />;
    case 'live-classes':
      return <LuClock {...iconProps} />;
    case 'certification':
      return <LuAward {...iconProps} />;
    case 'expert-support':
      return <LuUser {...iconProps} />;
    case 'career-guidance':
      return <LuBriefcase {...iconProps} />;
    case 'lifetime-access':
      return <LuLock {...iconProps} />;
    default:
      return null;
  }
};

export default function Services({ initialContent }: ServicesProps = {}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [servicesContent, setServicesContent] = useState<ServicesContent>(initialContent || defaultServicesContent);

  useEffect(() => {
    // Only fetch if initialContent was not provided (fallback for client-side updates)
    if (!initialContent) {
      const fetchServicesContent = async () => {
        try {
          const response = await fetch('/api/website-content', {
            cache: 'force-cache',
            next: { tags: ['website-content'] },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.data?.services) {
              setServicesContent(data.data.services);
            }
          }
        } catch (error) {
          console.error('Error fetching services content:', error);
        }
      };
      fetchServicesContent();
    }
    setIsLoaded(true);
  }, [initialContent]);

  return (
    <section className="relative bg-white py-20 px-4 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center md:mb-16">
          {/* Services Badge */}
          <div
            className={`mb-4 inline-flex items-center gap-3 rounded-full px-5 py-2.5 ${
              isLoaded ? "animate-fade-in-up" : "animate-on-load"
            }`}
            style={{
              animationDelay: "0.1s",
              fontFamily: "var(--font-bengali), sans-serif",
              backgroundColor: servicesContent.label.backgroundColor,
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
            <span className="text-xs font-semibold text-white">{servicesContent.label.text}</span>
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
            <span style={{ color: servicesContent.titleColors.part1 }}>{servicesContent.title.part1}</span>{" "}
            {servicesContent.titleColors.part2 === 'gradient' ? (
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: `linear-gradient(to right, ${servicesContent.gradientColors?.from || '#A855F7'}, ${servicesContent.gradientColors?.to || '#10B981'})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {servicesContent.title.part2}
              </span>
            ) : (
              <span style={{ color: servicesContent.titleColors.part2 }}>{servicesContent.title.part2}</span>
            )}
          </h2>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {servicesContent.services.map((service, index) => (
            <div
              key={service.id}
              className={`group relative overflow-hidden rounded-xl border-2 border-gray-100 bg-white p-6 transition-all duration-500 hover:shadow-xl ${
                isLoaded ? "animate-fade-in-up" : "animate-on-load"
              }`}
              style={{
                animationDelay: `${0.1 * index}s`,
              }}
            >
              {/* Left Border Gradient Accent */}
              <div
                className="absolute left-0 top-0 h-full w-1 transition-all duration-500 group-hover:w-2"
              />

              {/* Top Gradient Bar on Hover */}
              <div
                className="absolute left-0 top-0 h-1 w-0 transition-all duration-500 group-hover:w-full"
              />

              {/* Background Pattern on Hover */}
              <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-[0.03]">
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23A855F7' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  }}
                />
              </div>

              {/* Icon Container - Top Left */}
              <div className="relative mb-4 flex items-start">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-lg transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                  {/* Icon Background with Gradient */}
                  <div
                    className="absolute inset-0 rounded-lg transition-all duration-500 group-hover:shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, #A855F7 0%, #EC4899 100%)",
                      boxShadow: "0 4px 12px rgba(168, 85, 247, 0.2)",
                    }}
                  />
                  {/* Icon */}
                  <div className="relative z-10 flex items-center justify-center p-3">
                    <IconRenderer iconType={service.iconType} />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="relative">
                {/* Title */}
                <h3
                  className="mb-3 text-xl font-bold text-[#1E3A8A] transition-colors duration-300 group-hover:text-[#A855F7]"
                  style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                >
                  {service.titleBengali}
                </h3>

                {/* Description */}
                <p
                  className="mb-4 text-sm leading-relaxed text-gray-600"
                  style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                >
                  {service.description}
                </p>

                {/* Arrow Link */}
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold text-gray-500 transition-all duration-300 group-hover:text-[#A855F7]"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    বিস্তারিত দেখুন
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-all duration-300 group-hover:bg-[#A855F7] group-hover:scale-110">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-gray-600 transition-colors duration-300 group-hover:text-white"
                    >
                      <path
                        d="M5 12H19M19 12L12 5M19 12L12 19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Bottom Right Corner Decoration */}
              <div className="absolute bottom-0 right-0 h-20 w-20 overflow-hidden">
                <div
                  className="h-full w-full rounded-tl-full opacity-0 transition-opacity duration-500 group-hover:opacity-10"
                  style={{
                    background: "radial-gradient(circle, #A855F7 0%, transparent 70%)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
