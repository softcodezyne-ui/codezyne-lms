export interface ServiceItem {
  id: number;
  title: string;
  titleBengali: string;
  description: string;
  iconType: 'online-courses' | 'live-classes' | 'certification' | 'expert-support' | 'career-guidance' | 'lifetime-access';
}

export interface ServicesContent {
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
  services: ServiceItem[];
}

export const defaultServicesContent: ServicesContent = {
  label: {
    text: "আমাদের সেবা",
    backgroundColor: "#A855F7",
  },
  title: {
    part1: "আমাদের",
    part2: "সেবা",
  },
  titleColors: {
    part1: "#1E3A8A",
    part2: "gradient", // Can be gradient or color
  },
  gradientColors: {
    from: "#A855F7",
    to: "#10B981",
  },
  services: [
    {
      id: 1,
      title: "Online Courses",
      titleBengali: "অনলাইন কোর্স",
      description: "আমাদের বিস্তৃত অনলাইন কোর্স লাইব্রেরি থেকে আপনার পছন্দের বিষয়ে শিখুন।",
      iconType: "online-courses",
    },
    {
      id: 2,
      title: "Live Classes",
      titleBengali: "লাইভ ক্লাস",
      description: "বিশেষজ্ঞ শিক্ষকদের সাথে ইন্টারেক্টিভ লাইভ ক্লাসে অংশগ্রহণ করুন।",
      iconType: "live-classes",
    },
    {
      id: 3,
      title: "Certification",
      titleBengali: "সার্টিফিকেশন",
      description: "কোর্স সম্পন্ন করার পর আন্তর্জাতিক মানের সার্টিফিকেট পান।",
      iconType: "certification",
    },
    {
      id: 4,
      title: "Expert Support",
      titleBengali: "বিশেষজ্ঞ সহায়তা",
      description: "২৪/৭ বিশেষজ্ঞ শিক্ষকদের কাছ থেকে সহায়তা এবং গাইডেন্স পান।",
      iconType: "expert-support",
    },
    {
      id: 5,
      title: "Career Guidance",
      titleBengali: "ক্যারিয়ার গাইডেন্স",
      description: "ক্যারিয়ার কাউন্সেলিং এবং জব প্লেসমেন্ট সহায়তা পান।",
      iconType: "career-guidance",
    },
    {
      id: 6,
      title: "Lifetime Access",
      titleBengali: "আজীবন অ্যাক্সেস",
      description: "কোর্স কেনার পর আজীবন অ্যাক্সেস পান এবং যেকোনো সময় রিভিশন করুন।",
      iconType: "lifetime-access",
    },
  ],
};

