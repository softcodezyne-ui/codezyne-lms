"use client";

import { useEffect, useState } from "react";
import { LuMapPin, LuPhone, LuMail, LuArrowRight } from "react-icons/lu";
import type { FooterContent } from "@/constants/footerContent";
import { defaultFooterContent } from "@/constants/footerContent";

interface FooterProps {
  initialContent?: FooterContent;
}

// Social Icon Component
const SocialIcon = ({ social }: { social: { name: string; icon: string; color: string; href: string } }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <a
      href={social.href}
      className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-all hover:scale-110 hover:shadow-lg"
      style={{
        backgroundColor: isHovered ? social.color : `${social.color}20`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="transition-colors"
        style={{ color: isHovered ? "#FFFFFF" : social.color }}
      >
        <path d={social.icon} />
      </svg>
    </a>
  );
};

export default function Footer({ initialContent }: FooterProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [isButtonVisible, setIsButtonVisible] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [footerContent, setFooterContent] = useState<FooterContent>(initialContent || defaultFooterContent);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    // Only fetch if initialContent was not provided (fallback for client-side updates)
    if (!initialContent) {
      const fetchFooterContent = async () => {
        try {
          const response = await fetch('/api/website-content', {
            cache: 'force-cache',
            next: { tags: ['website-content'] },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.data?.footer) {
              setFooterContent(data.data.footer);
            }
          }
        } catch (error) {
          console.error('Error fetching footer content:', error);
        }
      };
      fetchFooterContent();
    }
  }, [initialContent]);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollableHeight = documentHeight - windowHeight;
      const percentage = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;
      setScrollPercentage(Math.min(100, Math.max(0, percentage)));

      // Handle button visibility with animation
      if (percentage > 5 && !isButtonVisible) {
        setIsButtonVisible(true);
        setIsAnimatingOut(false);
      } else if (percentage <= 5 && isButtonVisible && !isAnimatingOut) {
        setIsAnimatingOut(true);
        setTimeout(() => {
          setIsButtonVisible(false);
          setIsAnimatingOut(false);
        }, 500); // Match animation duration
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isButtonVisible, isAnimatingOut]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(to bottom right, ${footerContent.backgroundGradient.from} 0%, ${footerContent.backgroundGradient.to} 100%)`,
      }}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-8 lg:py-16">
        {/* Main Footer Content */}
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Branding and Newsletter */}
          <div className="lg:col-span-1">
            {/* Logo */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: footerContent.branding.logoIconColor }}>
                <span className="text-xl font-bold text-white">{footerContent.branding.logoIcon}</span>
              </div>
              <span className="text-2xl font-bold" style={{ color: footerContent.branding.logoTextColor }}>{footerContent.branding.logoText}</span>
            </div>

            {/* Description */}
            <p
              className="mb-6 text-sm leading-relaxed text-gray-600"
              style={{ fontFamily: "var(--font-bengali), sans-serif" }}
            >
              {footerContent.branding.description}
            </p>

            {/* Language Selector */}
            <div className="mb-6">
              <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:border-[#A855F7]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-gray-500">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M12 2C15.31 2 18.23 3.89 19.75 6.5M12 22C8.69 22 5.77 20.11 4.25 17.5M19.75 6.5L16 12L19.75 17.5M4.25 17.5L8 12L4.25 6.5M19.75 6.5C18.5 4.07 15.54 2.5 12 2.5M4.25 6.5C5.5 4.07 8.46 2.5 12 2.5M4.25 17.5C5.5 19.93 8.46 21.5 12 21.5M19.75 17.5C18.5 19.93 15.54 21.5 12 21.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>বাংলা</span>
              </button>
            </div>

            {/* Newsletter */}
            <div>
              <h3
                className="mb-3 text-lg font-bold text-[#1E3A8A]"
                style={{ fontFamily: "var(--font-bengali), sans-serif" }}
              >
                {footerContent.newsletter.title}
              </h3>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <LuMail className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    placeholder={footerContent.newsletter.emailPlaceholder}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-700 placeholder-gray-400 focus:border-[#A855F7] focus:outline-none"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  />
                </div>
                <button
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${footerContent.newsletter.buttonGradientFrom} 0%, ${footerContent.newsletter.buttonGradientTo} 100%)`,
                    fontFamily: "var(--font-bengali), sans-serif",
                  }}
                >
                  <span>{footerContent.newsletter.buttonText}</span>
                  <LuArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Company Links */}
          <div>
            <h3
              className="mb-4 border-b-2 border-[#A855F7] pb-2 text-lg font-bold text-[#1E3A8A]"
              style={{ fontFamily: "var(--font-bengali), sans-serif" }}
            >
              কোম্পানি
            </h3>
            <ul className="space-y-3">
              {footerContent.companyLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-600 transition-colors hover:text-[#A855F7]"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3
              className="mb-4 border-b-2 border-[#A855F7] pb-2 text-lg font-bold text-[#1E3A8A]"
              style={{ fontFamily: "var(--font-bengali), sans-serif" }}
            >
              দ্রুত লিঙ্ক
            </h3>
            <ul className="space-y-3">
              {footerContent.quickLinks.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-600 transition-colors hover:text-[#A855F7]"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Get In Touch */}
          <div>
            <h3
              className="mb-4 border-b-2 border-[#A855F7] pb-2 text-lg font-bold text-[#1E3A8A]"
              style={{ fontFamily: "var(--font-bengali), sans-serif" }}
            >
              যোগাযোগ করুন
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A855F7]/20">
                  <LuMapPin className="w-[18px] h-[18px] text-[#A855F7]" />
                </div>
                <div>
                  <p
                    className="mb-1 text-sm font-bold text-[#1E3A8A]"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {footerContent.contact.address.label}
                  </p>
                  <p
                    className="text-sm text-gray-600"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {footerContent.contact.address.value}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A855F7]/20">
                  <LuPhone className="w-[18px] h-[18px] text-[#A855F7]" />
                </div>
                <div>
                  <p
                    className="mb-1 text-sm font-bold text-[#1E3A8A]"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {footerContent.contact.phone.label}
                  </p>
                  <p
                    className="text-sm text-gray-600"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {footerContent.contact.phone.value}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#A855F7]/20">
                  <LuMail className="w-[18px] h-[18px] text-[#A855F7]" />
                </div>
                <div>
                  <p
                    className="mb-1 text-sm font-bold text-[#1E3A8A]"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {footerContent.contact.email.label}
                  </p>
                  <p
                    className="text-sm text-gray-600"
                    style={{ fontFamily: "var(--font-bengali), sans-serif" }}
                  >
                    {footerContent.contact.email.value}
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Gateway Section */}
        <div className="mb-8 border-t border-gray-200 pt-8">
          <h3
            className="mb-4 text-center text-lg font-bold text-[#1E3A8A]"
            style={{ fontFamily: "var(--font-bengali), sans-serif" }}
          >
            {footerContent.paymentGateway.title}
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {footerContent.paymentGateway.methods.map((payment, index) => (
              <div
                key={index}
                className="flex h-12 w-20 items-center justify-center rounded-lg bg-white px-3 py-2 shadow-sm transition-all hover:shadow-md"
              >
                <span className="text-xs font-semibold text-gray-600">{payment}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Copyright and Social Media */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 md:flex-row">
          <p
            className="text-sm text-gray-600"
            style={{ fontFamily: "var(--font-bengali), sans-serif" }}
          >
            {footerContent.copyright}
          </p>
          <div className="flex items-center gap-3">
            {footerContent.socialMedia.map((social, index) => (
              <SocialIcon key={index} social={social} />
            ))}
          </div>
        </div>
      </div>

      {/* Scroll to Top Button with Percentage */}
      {isButtonVisible && (
        <button
          onClick={scrollToTop}
          className={`group fixed bottom-8 right-8 z-50 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-white shadow-2xl transition-all duration-500 hover:scale-110 hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] ${
            isAnimatingOut ? "animate-slide-up-to-top" : "animate-slide-down-from-top"
          }`}
          style={{
            background: "linear-gradient(135deg, #A855F7 0%, #9333EA 50%, #EC4899 100%)",
          }}
          aria-label="Scroll to top"
        >
          {/* Animated Background Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#A855F7] via-[#9333EA] to-[#EC4899] opacity-75 blur-sm transition-opacity group-hover:opacity-100" />
          
          {/* Circular Progress Background */}
          <svg className="absolute inset-0 h-full w-full -rotate-90 transform" viewBox="0 0 48 48">
            {/* Background Circle */}
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="2"
            />
            {/* Progress Circle with Gradient */}
            <defs>
              <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="url(#progress-gradient)"
              strokeWidth="2.5"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - scrollPercentage / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-300"
              style={{
                filter: "drop-shadow(0 0 2px rgba(255,255,255,0.5))",
              }}
            />
          </svg>
          
          {/* Content Container */}
          <div className="relative z-10 flex items-center justify-center">
            {/* Percentage Text */}
            <span className="text-xs font-bold text-white drop-shadow-lg transition-all group-hover:scale-110">
              {Math.round(scrollPercentage)}%
            </span>
          </div>
          
          {/* Ripple Effect on Click */}
          <div className="absolute inset-0 rounded-full bg-white opacity-0 transition-opacity group-active:opacity-20 group-active:animate-ping" />
        </button>
      )}
    </footer>
  );
}

