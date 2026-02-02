import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Settings from '@/models/Settings';
import { defaultHeroContent } from '@/constants/heroContent';
import { defaultAboutContent } from '@/constants/aboutContent';
import { defaultWhyChooseUsContent } from '@/constants/whyChooseUsContent';
import { defaultStatisticsContent } from '@/constants/statisticsContent';
import { defaultServicesContent } from '@/constants/servicesContent';
import { defaultCertificatesContent } from '@/constants/certificatesContent';
import { defaultPhotoGalleryContent } from '@/constants/photoGalleryContent';
import { defaultBlogContent } from '@/constants/blogContent';
import { defaultDownloadAppContent } from '@/constants/downloadAppContent';
import { defaultFooterContent } from '@/constants/footerContent';
import { defaultSectionOrder, SectionConfig } from '@/constants/sectionOrder';
import { defaultCoursesContent } from '@/constants/coursesContent';
import { defaultCoursesByCategoryContent } from '@/constants/coursesByCategoryContent';
import { defaultFAQContent } from '@/constants/faqContent';
import { defaultPromoBannerContent } from '@/constants/promoBannerContent';

interface WebsiteContentSettings {
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
  hero: {
    subtitle: string;
    title: {
      part1: string;
      part2: string;
      part3: string;
      part4: string;
      part5: string;
    };
    titleColors: {
      part1: string;
      part2: string;
      part3: string;
      part4: string;
      part5: string;
    };
    gradientColors?: {
      from: string;
      via?: string;
      to: string;
    };
    description: string;
    buttons: {
      primary: {
        text: string;
        href: string;
      };
      secondary: {
        text: string;
        href: string;
      };
    };
    carousel: {
      enabled: boolean;
      autoPlay: boolean;
      autoPlayInterval: number;
      items: Array<{
        id: number;
        image: string;
        title: string;
        category: string;
      }>;
    };
    stats: {
      students: {
        enabled: boolean;
        count: string;
        avatars: string[];
      };
      courses: {
        enabled: boolean;
        count: string;
      };
    };
  };
  about?: {
    label: {
      text: string;
      backgroundColor: string;
    };
    title: {
      part1: string;
      part2: string;
      part3: string;
      part4: string;
      part5: string;
    };
    titleColors: {
      part1: string;
      part2: string;
      part3: string;
      part4: string;
      part5: string;
    };
    description: string;
    features: Array<{
      title: string;
      description: string;
    }>;
    button: {
      text: string;
      href?: string;
    };
    experience: {
      number: string;
      label: string;
      gradientFrom: string;
      gradientTo: string;
    };
    images: {
      main: string;
      secondary: string;
    };
  };
  whyChooseUs?: {
    label: {
      text: string;
      backgroundColor: string;
    };
    title: {
      part1: string;
      part2: string;
      part3: string;
      part4: string;
      part5: string;
    };
    titleColors: {
      part1: string;
      part2: string;
      part3: string;
      part4: string;
      part5: string;
    };
    description: string;
    image: string;
    features: Array<{
      id: number;
      title: string;
      titleBn: string;
      description: string;
      descriptionBn: string;
      iconType: 'money' | 'instructor' | 'flexible' | 'community';
    }>;
  };
  statistics?: {
    items: Array<{
      id: number;
      number: string;
      suffix: string;
      label: string;
      labelBengali: string;
      iconType: 'students' | 'courses' | 'tutors' | 'awards';
    }>;
  };
  services?: {
    label: {
      text: string;
      backgroundColor: string;
    };
    title: {
      part1: string;
      part2: string;
    };
    titleColors: {
      part1: string;
      part2: string;
    };
    gradientColors?: {
      from: string;
      to: string;
    };
    services: Array<{
      id: number;
      title: string;
      titleBengali: string;
      description: string;
      iconType: 'online-courses' | 'live-classes' | 'certification' | 'expert-support' | 'career-guidance' | 'lifetime-access';
    }>;
  };
  certificates?: {
    label: {
      text: string;
      backgroundColor: string;
    };
    title: {
      part1: string;
      part2: string;
    };
    titleColors: {
      part1: string;
      part2: string;
    };
    gradientColors?: {
      from: string;
      via?: string;
      to: string;
    };
    certificates: Array<{
      id: number;
      titleBengali: string;
      titleEnglish: string;
      imageUrl: string;
      description?: string;
    }>;
    about: {
      title: string;
      description: string[];
      imageUrl: string;
      name: string;
      affiliation: string;
    };
  };
  photoGallery?: {
    label: {
      text: string;
      backgroundColor: string;
    };
    title: {
      part1: string;
      part2: string;
    };
    titleColors: {
      part1: string;
      part2: string;
    };
    gradientColors?: {
      from: string;
      via?: string;
      to: string;
    };
    images: Array<{
      id: number;
      image: string;
      alt: string;
    }>;
  };
  blog?: {
    label: {
      text: string;
      backgroundColor: string;
    };
    title: {
      part1: string;
      part2: string;
      part3: string;
      part4: string;
    };
    titleColors: {
      part1: string;
      part2: string;
      part3: string;
      part4: string;
    };
    gradientColors?: {
      from: string;
      via?: string;
      to: string;
    };
    buttonText: string;
    posts: Array<{
      id: number;
      image: string;
      date: string;
      author: string;
      authorBengali: string;
      comments: string;
      commentsBengali: string;
      title: string;
      titleBengali: string;
      description: string;
      descriptionBengali: string;
    }>;
  };
  downloadApp?: {
    label: {
      text: string;
      backgroundColor: string;
    };
    title: {
      part1: string;
      part2: string;
      part3: string;
      part4: string;
      part5: string;
      part6: string;
      part7: string;
    };
    titleColors: {
      part1: string;
      part2: string;
      part3: string;
      part4: string;
      part5: string;
      part6: string;
      part7: string;
    };
    description: string;
    buttons: {
      googlePlay: {
        text: string;
        href: string;
        gradientFrom: string;
        gradientTo: string;
      };
      appStore: {
        text: string;
        href: string;
        gradientFrom: string;
        gradientVia?: string;
        gradientTo: string;
      };
    };
    backgroundImage: string;
  };
  footer?: {
    branding: {
      logoText: string;
      logoIcon: string;
      logoIconColor: string;
      logoTextColor: string;
      description: string;
    };
    newsletter: {
      title: string;
      emailPlaceholder: string;
      buttonText: string;
      buttonGradientFrom: string;
      buttonGradientTo: string;
    };
    companyLinks: Array<{
      label: string;
      href: string;
    }>;
    quickLinks: Array<{
      label: string;
      href: string;
    }>;
    contact: {
      address: {
        label: string;
        value: string;
      };
      phone: {
        label: string;
        value: string;
      };
      email: {
        label: string;
        value: string;
      };
    };
    paymentGateway: {
      title: string;
      methods: string[];
    };
    copyright: string;
    socialMedia: Array<{
      name: string;
      icon: string;
      color: string;
      href: string;
    }>;
    backgroundGradient: {
      from: string;
      to: string;
    };
  };
  courses?: {
    label: {
      text: string;
      backgroundColor: string;
    };
    title: {
      part1: string;
      part2: string;
    };
    titleColors: {
      part1: string;
      part2: string;
    };
    gradientColors: {
      from: string;
      via?: string;
      to: string;
    };
    buttonText: string;
    buttonHref: string;
    buttonGradientFrom: string;
    buttonGradientTo: string;
  };
  coursesByCategory?: {
    label: {
      text: string;
      backgroundColor: string;
    };
    title: {
      part1: string;
      part2: string;
      part3: string;
    };
    titleColors: {
      part1: string;
      part2: string;
      part3: string;
    };
    gradientColors: {
      from: string;
      to: string;
    };
    buttonText: string;
    buttonHref: string;
    buttonGradientFrom: string;
    buttonGradientTo: string;
  };
  sectionOrder?: Array<{
    id: string;
    label: string;
    enabled: boolean;
    order: number;
  }>;
  faq?: {
    label: {
      text: string;
      backgroundColor: string;
    };
    title: {
      part1: string;
      part2: string;
    };
    titleColors: {
      part1: string;
      part2: string;
    };
    gradientColors?: {
      from: string;
      via?: string;
      to: string;
    };
    faqs: Array<{
      id: number;
      question: string;
      answer: string;
      order: number;
    }>;
  };
  promotionalBanner?: {
    enabled: boolean;
    imageUrl: string;
    link: string;
    headline: string;
    subtext: string;
    ctaLabel: string;
  };
}

const defaultWebsiteContent: WebsiteContentSettings = {
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
  hero: defaultHeroContent,
  about: defaultAboutContent,
  whyChooseUs: defaultWhyChooseUsContent,
  statistics: defaultStatisticsContent,
  services: defaultServicesContent,
  certificates: defaultCertificatesContent,
  photoGallery: defaultPhotoGalleryContent,
  blog: defaultBlogContent,
  downloadApp: defaultDownloadAppContent,
  footer: defaultFooterContent,
  courses: defaultCoursesContent,
  coursesByCategory: defaultCoursesByCategoryContent,
  sectionOrder: defaultSectionOrder,
  faq: defaultFAQContent,
  promotionalBanner: defaultPromoBannerContent,
};

// Cache tag for on-demand revalidation
const CACHE_TAG = 'website-content';

// GET - Public endpoint to retrieve website content (no auth required)
export async function GET(request: NextRequest) {
  try {
    // Use unstable_cache with tag for on-demand revalidation
    const getCachedContent = unstable_cache(
      async () => {
        await connectDB();
        const settings = await Settings.findOne({ category: 'website-content' });
        return settings?.settings || defaultWebsiteContent;
      },
      ['website-content'],
      {
        tags: [CACHE_TAG],
        revalidate: 60, // Revalidate every 60 seconds
      }
    );

    const data = await getCachedContent();
    
    return NextResponse.json(
      {
        success: true,
        data
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Cache for 60s, allow stale for 5min
        },
      }
    );

  } catch (error) {
    console.error('Error fetching website content:', error);
    // Return default on error so site doesn't break
    return NextResponse.json(
      {
        success: true,
        data: defaultWebsiteContent
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300', // Cache for 60s, allow stale for 5min
        },
      }
    );
  }
}

