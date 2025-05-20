'use client';

import Image from 'next/image';
import { useTranslation } from '@/hooks/useTranslation';

export default function Logo({ className = '', hideText = false }: { className?: string, hideText?: boolean }) {
  const { t } = useTranslation();
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative h-8 w-8">
        <Image 
          src="/logo.png" 
          alt="Pillmotion Logo" 
          fill
          className="object-contain"
          sizes="32px"
        />
      </div>
      {!hideText && (
        <span className="text-xl font-bold text-primary">
          {t('companyName')}
        </span>
      )}
    </div>
  );
}