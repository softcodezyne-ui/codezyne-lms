import { defaultSectionOrder, SectionConfig } from '@/constants/sectionOrder';
import { unstable_cache } from 'next/cache';
import connectDB from '@/lib/mongodb';
import Settings from '@/models/Settings';

const CACHE_TAG = 'website-content';

// Server-side function to get section order with caching
export async function getSectionOrder(): Promise<SectionConfig[]> {
  const getCachedSectionOrder = unstable_cache(
    async () => {
      try {
        await connectDB();
        const settings = await Settings.findOne({ category: 'website-content' });
        const websiteContent = settings?.settings;
        
        // Return section order if available, otherwise return default
        if (websiteContent?.sectionOrder && websiteContent.sectionOrder.length > 0) {
          return websiteContent.sectionOrder.sort((a: SectionConfig, b: SectionConfig) => a.order - b.order);
        }
        return defaultSectionOrder.sort((a, b) => a.order - b.order);
      } catch (error) {
        console.error('Error fetching section order:', error);
        return defaultSectionOrder.sort((a, b) => a.order - b.order);
      }
    },
    ['section-order'],
    {
      tags: [CACHE_TAG],
      revalidate: false, // No time-based revalidation
    }
  );

  return await getCachedSectionOrder();
}

