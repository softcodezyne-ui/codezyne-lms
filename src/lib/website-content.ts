import 'server-only';
import { unstable_cache } from 'next/cache';
import connectDB from '@/lib/mongodb';
import { defaultHeroContent, HeroContent } from '@/constants/heroContent';
import { defaultAboutContent, AboutContent } from '@/constants/aboutContent';
import { defaultWhyChooseUsContent, WhyChooseUsContent } from '@/constants/whyChooseUsContent';
import { defaultStatisticsContent, StatisticsContent } from '@/constants/statisticsContent';
import { defaultServicesContent, ServicesContent } from '@/constants/servicesContent';
import { defaultCertificatesContent, CertificatesContent } from '@/constants/certificatesContent';
import { defaultPhotoGalleryContent, PhotoGalleryContent } from '@/constants/photoGalleryContent';
import { defaultBlogContent, BlogContent } from '@/constants/blogContent';
import { defaultDownloadAppContent, DownloadAppContent } from '@/constants/downloadAppContent';
import { defaultFooterContent, FooterContent } from '@/constants/footerContent';
import { defaultCoursesContent, CoursesContent } from '@/constants/coursesContent';
import { defaultCoursesByCategoryContent, CoursesByCategoryContent } from '@/constants/coursesByCategoryContent';

export interface WebsiteContent {
  marquee: {
    enabled: boolean;
    messages: string[];
    gradientFrom: string;
    gradientTo: string;
  };
  contact: {
    registrationNumber: string;
  };
  socialMedia: {
    facebook: string;
    twitter: string;
    linkedin: string;
    instagram?: string;
    youtube?: string;
  };
  branding: {
    logoText: string;
    logoTextColor1: string;
    logoTextColor2: string;
    logoIconColor1: string;
    logoIconColor2: string;
  };
  navigation: {
    home: {
      label: string;
      items: Array<{ label: string; href: string; icon?: string }>;
    };
    category: {
      label: string;
      items: Array<{ label: string; href: string; icon?: string }>;
    };
    pages: {
      label: string;
      items: Array<{ label: string; href: string; icon?: string }>;
    };
    courses: {
      label: string;
      items: Array<{ label: string; href: string; icon?: string }>;
    };
    account: {
      label: string;
      items: Array<{ label: string; href: string; icon?: string }>;
    };
    contact: {
      label: string;
      href: string;
    };
  };
  buttons: {
    liveCourse: {
      enabled: boolean;
      text: string;
      href?: string;
    };
    login: {
      text: string;
      href: string;
    };
  };
  mobileMenu: {
    items: Array<{ label: string; href: string }>;
  };
  hero?: any; // Hero content is optional for header
  about?: AboutContent;
  whyChooseUs?: WhyChooseUsContent;
  statistics?: StatisticsContent;
  services?: ServicesContent;
  certificates?: CertificatesContent;
  photoGallery?: PhotoGalleryContent;
  blog?: BlogContent;
  downloadApp?: DownloadAppContent;
  footer?: FooterContent;
  courses?: CoursesContent;
  coursesByCategory?: CoursesByCategoryContent;
}

const defaultWebsiteContent: WebsiteContent = {
  marquee: {
    enabled: true,
    messages: [
      "🎉 নতুন কোর্সে ৫০% ছাড়! এখনই নিবন্ধন করুন",
      "✨ ১০০+ কোর্স উপলব্ধ - আপনার পছন্দের কোর্স খুঁজে নিন",
      "🚀 বিশেষ অফার: প্রথম ১০০ জন শিক্ষার্থী পাবে বিনামূল্যে সার্টিফিকেট",
      "📚 মাসিক নতুন কোর্স যোগ করা হচ্ছে - সর্বশেষ আপডেটের জন্য সাবস্ক্রাইব করুন",
    ],
    gradientFrom: "#EC4899",
    gradientTo: "#A855F7",
  },
  contact: {
    registrationNumber: "বাংলাদেশ সরকার অনুমোদিত রেজিঃ নং- ৩১১০৫",
  },
  socialMedia: {
    facebook: "#",
    twitter: "#",
    linkedin: "#",
  },
  branding: {
    logoText: "CodeZyne",
    logoTextColor1: "#7B2CBF",
    logoTextColor2: "#FF6B35",
    logoIconColor1: "#FF6B35",
    logoIconColor2: "#7B2CBF",
  },
  navigation: {
    home: {
      label: "হোম",
      items: [
        { label: "হোমপেজ", href: "/" },
        { label: "আমাদের সম্পর্কে", href: "/#about" },
        { label: "কোর্সসমূহ", href: "/#courses" },
      ],
    },
    category: {
      label: "বিভাগ",
      items: [
        { label: "ডেভেলপমেন্ট", href: "/#courses" },
        { label: "ডিজাইন", href: "/#courses" },
        { label: "মার্কেটিং", href: "/#courses" },
        { label: "ব্যবসা", href: "/#courses" },
      ],
    },
    pages: {
      label: "পাতা",
      items: [
        { label: "আমাদের সম্পর্কে", href: "/about" },
        { label: "ব্লগ", href: "/blog" },
        { label: "যোগাযোগ", href: "/contact" },
        { label: "প্রশ্নোত্তর", href: "/faq" },
      ],
    },
    courses: {
      label: "কোর্স",
      items: [
        { label: "সব কোর্স", href: "/#courses" },
        { label: "কোর্স বিস্তারিত", href: "/course-details" },
        { label: "জনপ্রিয় কোর্স", href: "/#courses" },
        { label: "নতুন কোর্স", href: "/#courses" },
      ],
    },
    account: {
      label: "হিসাব",
      items: [
        { label: "লগ ইন", href: "/login" },
        { label: "নিবন্ধন", href: "/register" },
        { label: "প্রোফাইল", href: "/profile" },
        { label: "ড্যাশবোর্ড", href: "/dashboard" },
      ],
    },
    contact: {
      label: "যোগাযোগ",
      href: "/contact",
    },
  },
  buttons: {
    liveCourse: {
      enabled: true,
      text: "লাইভ কোর্স",
    },
    login: {
      text: "লগ ইন",
      href: "/login",
    },
  },
  mobileMenu: {
    items: [
      { label: "হোম", href: "#" },
      { label: "বিভাগ", href: "#" },
      { label: "পাতা", href: "#" },
      { label: "কোর্স", href: "#" },
      { label: "হিসাব", href: "#" },
      { label: "যোগাযোগ", href: "#" },
    ],
  },
};

// Server-side function to get website content with caching
export async function getWebsiteContent(): Promise<WebsiteContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultWebsiteContent;
  }

  const getCachedContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        return settings?.settings || defaultWebsiteContent;
      } catch (error) {
        console.error('Error fetching website content:', error);
        return defaultWebsiteContent;
      }
    },
    ['website-content'],
    {
      tags: ['website-content'],
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedContent();
}

// Server-side function to get hero content with caching
export async function getHeroContent(): Promise<HeroContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultHeroContent;
  }

  const getCachedHeroContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return hero content if available, otherwise return default
        if (websiteContent?.hero) {
          return websiteContent.hero;
        }
        return defaultHeroContent;
      } catch (error) {
        console.error('Error fetching hero content:', error);
        return defaultHeroContent;
      }
    },
    ['hero-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedHeroContent();
}

// Server-side function to get about content with caching
export async function getAboutContent(): Promise<AboutContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultAboutContent;
  }

  const getCachedAboutContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return about content if available, otherwise return default
        if (websiteContent?.about) {
          return websiteContent.about;
        }
        return defaultAboutContent;
      } catch (error) {
        console.error('Error fetching about content:', error);
        return defaultAboutContent;
      }
    },
    ['about-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedAboutContent();
}

// Server-side function to get why choose us content with caching
export async function getWhyChooseUsContent(): Promise<WhyChooseUsContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultWhyChooseUsContent;
  }

  const getCachedWhyChooseUsContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return why choose us content if available, otherwise return default
        if (websiteContent?.whyChooseUs) {
          return websiteContent.whyChooseUs;
        }
        return defaultWhyChooseUsContent;
      } catch (error) {
        console.error('Error fetching why choose us content:', error);
        return defaultWhyChooseUsContent;
      }
    },
    ['why-choose-us-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedWhyChooseUsContent();
}

// Server-side function to get statistics content with caching
export async function getStatisticsContent(): Promise<StatisticsContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultStatisticsContent;
  }

  const getCachedStatisticsContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return statistics content if available, otherwise return default
        if (websiteContent?.statistics) {
          return websiteContent.statistics;
        }
        return defaultStatisticsContent;
      } catch (error) {
        console.error('Error fetching statistics content:', error);
        return defaultStatisticsContent;
      }
    },
    ['statistics-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedStatisticsContent();
}

// Server-side function to get services content with caching
export async function getServicesContent(): Promise<ServicesContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultServicesContent;
  }

  const getCachedServicesContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return services content if available, otherwise return default
        if (websiteContent?.services) {
          return websiteContent.services;
        }
        return defaultServicesContent;
      } catch (error) {
        console.error('Error fetching services content:', error);
        return defaultServicesContent;
      }
    },
    ['services-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedServicesContent();
}

// Server-side function to get certificates content with caching
export async function getCertificatesContent(): Promise<CertificatesContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultCertificatesContent;
  }

  const getCachedCertificatesContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return certificates content if available, otherwise return default
        if (websiteContent?.certificates) {
          return websiteContent.certificates;
        }
        return defaultCertificatesContent;
      } catch (error) {
        console.error('Error fetching certificates content:', error);
        return defaultCertificatesContent;
      }
    },
    ['certificates-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: 60, // Revalidate every 60 seconds
    }
  );

  return await getCachedCertificatesContent();
}

// Server-side function to get photo gallery content with caching
export async function getPhotoGalleryContent(): Promise<PhotoGalleryContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultPhotoGalleryContent;
  }

  const getCachedPhotoGalleryContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return photo gallery content if available, otherwise return default
        if (websiteContent?.photoGallery) {
          return websiteContent.photoGallery;
        }
        return defaultPhotoGalleryContent;
      } catch (error) {
        console.error('Error fetching photo gallery content:', error);
        return defaultPhotoGalleryContent;
      }
    },
    ['photo-gallery-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedPhotoGalleryContent();
}

// Server-side function to get blog content with caching
export async function getBlogContent(): Promise<BlogContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultBlogContent;
  }

  const getCachedBlogContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return blog content if available, otherwise return default
        if (websiteContent?.blog) {
          return websiteContent.blog;
        }
        return defaultBlogContent;
      } catch (error) {
        console.error('Error fetching blog content:', error);
        return defaultBlogContent;
      }
    },
    ['blog-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedBlogContent();
}

// Server-side function to get download app content with caching
export async function getDownloadAppContent(): Promise<DownloadAppContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultDownloadAppContent;
  }

  const getCachedDownloadAppContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return download app content if available, otherwise return default
        if (websiteContent?.downloadApp) {
          return websiteContent.downloadApp;
        }
        return defaultDownloadAppContent;
      } catch (error) {
        console.error('Error fetching download app content:', error);
        return defaultDownloadAppContent;
      }
    },
    ['download-app-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedDownloadAppContent();
}

// Server-side function to get footer content with caching
export async function getFooterContent(): Promise<FooterContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultFooterContent;
  }

  const getCachedFooterContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return footer content if available, otherwise return default
        if (websiteContent?.footer) {
          return websiteContent.footer;
        }
        return defaultFooterContent;
      } catch (error) {
        console.error('Error fetching footer content:', error);
        return defaultFooterContent;
      }
    },
    ['footer-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedFooterContent();
}

// Server-side function to get courses content with caching
export async function getCoursesContent(): Promise<CoursesContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultCoursesContent;
  }

  const getCachedCoursesContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Merge DB courses with default so featuredCourseIds and all fields are preserved
        const merged = {
          ...defaultCoursesContent,
          ...(websiteContent?.courses || {}),
          label: { ...defaultCoursesContent.label, ...(websiteContent?.courses?.label || {}) },
          title: { ...defaultCoursesContent.title, ...(websiteContent?.courses?.title || {}) },
          titleColors: { ...defaultCoursesContent.titleColors, ...(websiteContent?.courses?.titleColors || {}) },
          gradientColors: { ...defaultCoursesContent.gradientColors, ...(websiteContent?.courses?.gradientColors || {}) },
        };
        if (websiteContent?.courses?.featuredCourseIds != null) {
          (merged as any).featuredCourseIds = websiteContent.courses.featuredCourseIds;
        }
        return merged as CoursesContent;
      } catch (error) {
        console.error('Error fetching courses content:', error);
        return defaultCoursesContent;
      }
    },
    ['courses-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedCoursesContent();
}

// Server-side function to get courses by category content with caching
export async function getCoursesByCategoryContent(): Promise<CoursesByCategoryContent> {
  // Prevent execution in browser
  if (typeof window !== 'undefined') {
    return defaultCoursesByCategoryContent;
  }

  const getCachedCoursesByCategoryContent = unstable_cache(
    async () => {
      try {
        await connectDB();
        // Dynamic import to prevent client-side bundling
        const Settings = (await import('@/models/Settings')).default;
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return courses by category content if available, otherwise return default
        if (websiteContent?.coursesByCategory) {
          return websiteContent.coursesByCategory;
        }
        return defaultCoursesByCategoryContent;
      } catch (error) {
        console.error('Error fetching courses by category content:', error);
        return defaultCoursesByCategoryContent;
      }
    },
    ['courses-by-category-content'],
    {
      tags: ['website-content'], // Same tag so it revalidates with website content
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedCoursesByCategoryContent();
}

