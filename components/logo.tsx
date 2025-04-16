'use client';

import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

export default function Logo() {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-8 w-8">
        <Image 
          src="/logo.png" 
          alt="Pillmotion Logo" 
          fill
          className="object-contain"
          sizes="32px"
        />
      </div>
      <span className="text-xl font-bold text-primary">
        {t('companyName')}
      </span>
    </div>
  );
}