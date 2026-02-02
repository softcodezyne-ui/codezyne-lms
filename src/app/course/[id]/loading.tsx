import HeaderWrapper from "@/components/HeaderWrapper";
import FooterWrapper from "@/components/FooterWrapper";

export default function CourseDetailsLoading() {
  return (
    <div className="">
      <HeaderWrapper />
  
      {/* Loading Skeleton for Course Details */}
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section Skeleton */}
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 py-8 md:py-12">
          <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
            <div className="animate-pulse">
              {/* Breadcrumb Skeleton */}
              <div className="mb-6 flex items-center gap-2">
                <div className="h-4 w-20 rounded bg-gray-300"></div>
                <div className="h-4 w-2 rounded bg-gray-300"></div>
                <div className="h-4 w-32 rounded bg-gray-300"></div>
              </div>

              {/* Course Header Skeleton */}
              <div className="mb-8">
                <div className="mb-4 h-8 w-24 rounded-full bg-gray-300"></div>
                <div className="mb-4 h-10 w-3/4 rounded-lg bg-gray-300"></div>
                <div className="mb-2 h-6 w-full rounded bg-gray-300"></div>
                <div className="h-6 w-2/3 rounded bg-gray-300"></div>
              </div>

              {/* Stats and Info Skeleton */}
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-gray-300"></div>
                  <div className="h-4 w-20 rounded bg-gray-300"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-gray-300"></div>
                  <div className="h-4 w-24 rounded bg-gray-300"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-gray-300"></div>
                  <div className="h-4 w-16 rounded bg-gray-300"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            {/* Left Column - Main Content Skeleton */}
            <div className="w-full lg:w-2/3">
              {/* Video Player Skeleton */}
              <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-lg">
                <div className="relative aspect-video w-full bg-gray-200 animate-pulse">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-20 w-20 rounded-full bg-gray-300"></div>
                  </div>
                </div>
              </div>

              {/* Tabs Skeleton */}
              <div className="mb-6 border-b border-gray-200">
                <div className="flex gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 w-24 rounded bg-gray-200 animate-pulse"></div>
                  ))}
                </div>
              </div>

              {/* Tab Content Skeleton */}
              <div className="space-y-6">
                {/* Description Skeleton */}
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <div className="mb-4 h-6 w-32 rounded bg-gray-200 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-4 w-full rounded bg-gray-200 animate-pulse"></div>
                    <div className="h-4 w-full rounded bg-gray-200 animate-pulse"></div>
                    <div className="h-4 w-5/6 rounded bg-gray-200 animate-pulse"></div>
                    <div className="h-4 w-full rounded bg-gray-200 animate-pulse"></div>
                    <div className="h-4 w-4/5 rounded bg-gray-200 animate-pulse"></div>
                  </div>
                </div>

                {/* Curriculum Skeleton */}
                <div className="rounded-lg bg-white p-6 shadow-sm">
                  <div className="mb-4 h-6 w-40 rounded bg-gray-200 animate-pulse"></div>
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="rounded-lg border border-gray-200 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="h-5 w-48 rounded bg-gray-200 animate-pulse"></div>
                          <div className="h-4 w-16 rounded bg-gray-200 animate-pulse"></div>
                        </div>
                        <div className="space-y-2 pl-4">
                          {[...Array(2)].map((_, j) => (
                            <div key={j} className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
                              <div className="h-4 flex-1 rounded bg-gray-200 animate-pulse"></div>
                              <div className="h-4 w-16 rounded bg-gray-200 animate-pulse"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar Skeleton */}
            <div className="w-full lg:w-1/3">
              <div className="sticky top-4 rounded-xl bg-white p-6 shadow-lg">
                <div className="space-y-6">
                  {/* Price Skeleton */}
                  <div>
                    <div className="mb-2 h-8 w-32 rounded bg-gray-200 animate-pulse"></div>
                    <div className="h-6 w-24 rounded bg-gray-200 animate-pulse"></div>
                  </div>

                  {/* Buttons Skeleton */}
                  <div className="space-y-3">
                    <div className="h-12 w-full rounded-lg bg-gray-200 animate-pulse"></div>
                    <div className="h-12 w-full rounded-lg bg-gray-200 animate-pulse"></div>
                  </div>

                  {/* Course Info Skeleton */}
                  <div className="space-y-4 border-t border-gray-200 pt-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse"></div>
                        <div className="h-4 w-20 rounded bg-gray-200 animate-pulse"></div>
                      </div>
                    ))}
                  </div>

                  {/* Includes Skeleton */}
                  <div className="space-y-3 border-t border-gray-200 pt-6">
                    <div className="h-5 w-32 rounded bg-gray-200 animate-pulse"></div>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-gray-200 animate-pulse"></div>
                        <div className="h-4 w-40 rounded bg-gray-200 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FooterWrapper />
    </div>
  );
}


