'use client';

import { Button } from '@/components/ui/button';
import { LuArrowLeft as ArrowLeft } from 'react-icons/lu';

export default function GoBackButton() {
  return (
    <Button 
      variant="outline"
      onClick={() => window.history.back()}
      className="transition-all duration-200 border-2"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      <span style={{ fontFamily: "var(--font-bengali), sans-serif" }}>পিছনে</span>
      <span className="ml-1">Go Back</span>
    </Button>
  );
}

