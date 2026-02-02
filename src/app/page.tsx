import React from "react";
import HeaderWrapper from "@/components/HeaderWrapper";
import HeroWrapper from "@/components/HeroWrapper";
import AboutWrapper from "@/components/AboutWrapper";
import WhyChooseUsWrapper from "@/components/WhyChooseUsWrapper";
import StatisticsWrapper from "@/components/StatisticsWrapper";
import ServicesWrapper from "@/components/ServicesWrapper";
import CertificatesWrapper from "@/components/CertificatesWrapper";
import PhotoGalleryWrapper from "@/components/PhotoGalleryWrapper";
import BlogWrapper from "@/components/BlogWrapper";
import DownloadAppWrapper from "@/components/DownloadAppWrapper";
import FooterWrapper from "@/components/FooterWrapper";
import CoursesWrapper from "@/components/CoursesWrapper";
import CoursesByCategoryWrapper from "@/components/CoursesByCategoryWrapper";
import Features from "./components/Features";
import Testimonials from "./components/Testimonials";
import { getSectionOrder } from "@/lib/section-order";

// Section component mapping
const sectionComponents: Record<string, () => React.ReactElement> = {
  header: () => <HeaderWrapper />,
  hero: () => <HeroWrapper />,
  about: () => <AboutWrapper />,
  courses: () => <CoursesWrapper />,
  whyChooseUs: () => <WhyChooseUsWrapper />,
  coursesByCategory: () => <CoursesByCategoryWrapper />,
  statistics: () => <StatisticsWrapper />,
  services: () => <ServicesWrapper />,
  certificates: () => <CertificatesWrapper />,
  testimonials: () => <Testimonials />,
  photoGallery: () => <PhotoGalleryWrapper />,
  blog: () => <BlogWrapper />,
  downloadApp: () => <DownloadAppWrapper />,
  footer: () => <FooterWrapper />,
};

export default async function Home() {
  // Get section order from CMS
  const sectionOrder = await getSectionOrder();
  
  // Filter enabled sections and sort by order
  const enabledSections = sectionOrder
    .filter(section => section.enabled)
    .sort((a, b) => a.order - b.order);

  return (
    <div>
      {/* Header and Hero are always in the background div */}
      {enabledSections.some(s => s.id === 'header' || s.id === 'hero') && (
      <div
        style={{
          backgroundImage: "url(https://live.themewild.com/edubo/assets/img/shape/01.png)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center top",
          backgroundSize: "cover",
        }}
      >
          {enabledSections
            .filter(s => s.id === 'header' || s.id === 'hero')
            .map(section => {
              const Component = sectionComponents[section.id];
              return Component ? <Component key={section.id} /> : null;
            })}
      </div>
      )}

      {/* Render other sections in order */}
      {enabledSections
        .filter(s => s.id !== 'header' && s.id !== 'hero')
        .map(section => {
          const Component = sectionComponents[section.id];
          return Component ? <Component key={section.id} /> : null;
        })}
    </div>
  );
}
