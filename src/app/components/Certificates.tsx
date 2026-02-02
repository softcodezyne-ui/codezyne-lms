"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { LuAward, LuBuilding } from "react-icons/lu";
import type { CertificatesContent } from "@/constants/certificatesContent";
import { defaultCertificatesContent } from "@/constants/certificatesContent";

interface CertificatesProps {
  initialContent?: CertificatesContent;
}

export default function Certificates({ initialContent }: CertificatesProps) {
  const [isLoaded, setIsLoaded] = useState(true);
  const [certificatesContent, setCertificatesContent] = useState<CertificatesContent>(initialContent || defaultCertificatesContent);

  useEffect(() => {
    // Only fetch if initialContent was not provided (fallback for client-side updates)
    if (!initialContent) {
      const fetchCertificatesContent = async () => {
        try {
          // Add timestamp to bust cache and ensure fresh data
          const response = await fetch('/api/website-content?' + new URLSearchParams({
            _t: Date.now().toString()
          }), {
            cache: 'no-store',
            next: { revalidate: 0 }, // Always revalidate
          });
          if (response.ok) {
            const data = await response.json();
            if (data.data?.certificates) {
              setCertificatesContent(data.data.certificates);
            }
          }
        } catch (error) {
          console.error('Error fetching certificates content:', error);
        }
      };
      fetchCertificatesContent();
    }
  }, [initialContent]);

  return (
    <section className="relative bg-gradient-to-b from-white to-[#FEF9F3] py-20 px-4 md:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 text-center md:mb-16">
          {/* Section Label */}
          <div
            className={`mb-4 inline-flex items-center gap-3 rounded-full px-5 py-2.5 ${
              isLoaded ? "animate-fade-in-up" : "animate-on-load"
            }`}
            style={{
              animationDelay: "0.1s",
              fontFamily: "var(--font-bengali), sans-serif",
              backgroundColor: certificatesContent.label.backgroundColor,
            }}
          >
            <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white">
              <LuAward className="w-3.5 h-3.5 text-[#A855F7]" />
            </div>
            <span className="text-xs font-semibold text-white">{certificatesContent.label.text}</span>
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
            <span style={{ color: certificatesContent.titleColors.part1 }}>{certificatesContent.title.part1}</span>{" "}
            {certificatesContent.titleColors.part2 === 'gradient' ? (
            <span
              className="bg-clip-text text-transparent"
              style={{
                  backgroundImage: certificatesContent.gradientColors?.via
                    ? `linear-gradient(to right, ${certificatesContent.gradientColors.from}, ${certificatesContent.gradientColors.via}, ${certificatesContent.gradientColors.to})`
                    : `linear-gradient(to right, ${certificatesContent.gradientColors?.from || '#10B981'}, ${certificatesContent.gradientColors?.to || '#A855F7'})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
                {certificatesContent.title.part2}
            </span>
            ) : (
              <span style={{ color: certificatesContent.titleColors.part2 }}>{certificatesContent.title.part2}</span>
            )}
          </h2>
        </div>

        {/* Certificates in Pairs - Two per Row */}
        <div className="space-y-12">
          {(() => {
            // Group certificates into pairs (2 per row)
            const pairs: Array<Array<typeof certificatesContent.certificates[0]>> = [];
            for (let i = 0; i < certificatesContent.certificates.length; i += 2) {
              pairs.push(certificatesContent.certificates.slice(i, i + 2));
            }
            
            return pairs.map((pair, pairIndex) => {
              // Use description from first certificate in the pair, or empty string
              const pairDescription = pair[0]?.description || '';
              
              return (
                <div key={pairIndex} className="space-y-6">
                  {/* Certificates Pair */}
                  <div 
                    className={`grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 ${
                      isLoaded ? "animate-fade-in-up" : "animate-on-load"
                    }`}
                    style={{ animationDelay: `${0.5 + pairIndex * 0.2}s` }}
                  >
                    {/* Left Column Certificate */}
                    {pair[0] && (
                    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-2xl hover:scale-[1.02] md:p-8">
                      {/* Certificate Title */}
                      <div className="mb-6 text-center">
                        <h3
                          className="text-xl font-bold text-[#1E3A8A] md:text-2xl"
                          style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                        >
                          {pair[0].titleBengali}
                        </h3>
                      </div>

                      {/* Certificate Image Container */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100 shadow-inner">
                        <Image
                          src={pair[0].imageUrl}
                          alt={pair[0].titleEnglish}
                          fill
                          className="object-contain transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>

                      {/* Decorative Border */}
                      <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-[#A855F7] via-[#EC4899] to-[#A855F7] opacity-0 transition-opacity duration-300 group-hover:opacity-20" style={{ backgroundSize: "200% 200%" }}></div>
                    </div>
                  )}

                  {/* Right Column Certificate */}
                  {pair[1] && (
                    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg transition-all hover:shadow-2xl hover:scale-[1.02] md:p-8">
                      {/* Certificate Title */}
                      <div className="mb-6 text-center">
                        <h3
                          className="text-xl font-bold text-[#1E3A8A] md:text-2xl"
                          style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                        >
                          {pair[1].titleBengali}
                        </h3>
                      </div>

                      {/* Certificate Image Container */}
                      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100 shadow-inner">
                        <Image
                          src={pair[1].imageUrl}
                          alt={pair[1].titleEnglish}
                          fill
                          className="object-contain transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>

                      {/* Decorative Border */}
                      <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-r from-[#A855F7] via-[#EC4899] to-[#A855F7] opacity-0 transition-opacity duration-300 group-hover:opacity-20" style={{ backgroundSize: "200% 200%" }}></div>
                    </div>
                  )}
                  </div>
                  
                  {/* Description for the Pair - Displayed at Bottom */}
                  {pairDescription && pairDescription.trim() !== '' && (
                    <div
                      className={`text-left mx-auto mt-4 ${
                        isLoaded ? "animate-fade-in-up" : "animate-on-load"
                      }`}
                      style={{
                        animationDelay: `${0.7 + pairIndex * 0.2}s`,
                        fontFamily: "var(--font-bengali), sans-serif",
                      }}
                    >
                      <p className="text-base leading-relaxed text-gray-700 md:text-lg">
                        {pairDescription}
                      </p>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* About the Institution Section */}
        <div className="mt-20 bg-white p-8 rounded-2xl">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
            {/* Left Side - Text Content */}
            <div className="w-full lg:w-1/2">
              <h3
                className={`mb-6 text-2xl font-bold text-[#1E3A8A] md:text-3xl lg:text-4xl ${
                  isLoaded ? "animate-fade-in-up" : "animate-on-load"
                }`}
                style={{
                  animationDelay: "0.9s",
                  fontFamily: "var(--font-bengali), sans-serif",
                }}
              >
                {certificatesContent.about.title}
              </h3>
              
              <div
                className={`space-y-4 text-base leading-relaxed text-gray-700 md:text-lg ${
                  isLoaded ? "animate-fade-in-up" : "animate-on-load"
                }`}
                style={{
                  animationDelay: "1.1s",
                  fontFamily: "var(--font-bengali), sans-serif",
                }}
              >
                {certificatesContent.about.description.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* Right Side - Director Photo */}
            <div className="w-full lg:w-1/2">
              <div
                className={`flex flex-col items-center lg:items-end ${
                  isLoaded ? "animate-fade-in-up" : "animate-on-load"
                }`}
                style={{ animationDelay: "1.3s" }}
              >
                {/* Photo Container */}
                <div className="group relative mb-6 h-[400px] w-full max-w-[350px] md:h-[450px] md:max-w-[400px]">
                  {/* Decorative Background Gradient */}
                  <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#A855F7] via-[#EC4899] to-[#10B981] opacity-20 blur-sm transition-opacity duration-300 group-hover:opacity-40"></div>
                  
                  {/* Main Image Container */}
                  <div className="relative h-full w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#A855F7] to-[#EC4899] p-1 shadow-2xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_20px_50px_rgba(168,85,247,0.3)]">
                    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-white">
                      <Image
                        src={certificatesContent.about.imageUrl}
                        alt={certificatesContent.about.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, 400px"
                      />
                      
                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                      
                      {/* Decorative Corner Elements */}
                      <div className="absolute -left-3 -top-3 h-12 w-12 rounded-full bg-gradient-to-br from-[#10B981] to-[#14B8A6] opacity-60 blur-md transition-all duration-300 group-hover:scale-150 group-hover:opacity-80"></div>
                      <div className="absolute -bottom-3 -right-3 h-16 w-16 rounded-full bg-gradient-to-br from-[#EC4899] to-[#A855F7] opacity-60 blur-md transition-all duration-300 group-hover:scale-150 group-hover:opacity-80"></div>
                      
                      {/* Inner Border Glow */}
                      <div className="absolute inset-0 rounded-3xl border-2 border-white/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                    </div>
                  </div>
                  
                  {/* Floating Badge */}
                  <div className="absolute -right-4 top-4 z-10 rounded-full bg-gradient-to-r from-[#A855F7] to-[#EC4899] px-4 py-2 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
                    <div className="flex items-center gap-2">
                      <LuBuilding className="w-4 h-4 text-white" />
                      <span className="text-xs font-semibold text-white">Team</span>
                    </div>
                  </div>
                </div>

                {/* Name and Affiliation */}
                <div className="w-full max-w-[350px] text-center lg:text-right md:max-w-[400px]">
                  <h4
                    className="mb-2 text-xl font-bold text-[#1E3A8A] md:text-2xl"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {certificatesContent.about.name}
                  </h4>
                  <p
                    className="text-base text-gray-600 md:text-lg"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {certificatesContent.about.affiliation}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
