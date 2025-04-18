'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { FaGithub } from 'react-icons/fa';
import { FaXTwitter } from "react-icons/fa6";
import { SiWechat } from 'react-icons/si';
import Image from 'next/image';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="border-t">
      <div className="container py-8 md:py-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="max-w-md mb-8 md:mb-0 text-left">
            <h3 className="text-lg font-semibold mb-4">{t('companyName')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('footerDesc')}
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-4 text-left md:text-right">{t('footerFollow')}</h4>
            <div className="flex space-x-4 justify-start md:justify-end">
              <a href="https://x.com/hhwjsw711" className="p-2 rounded-full hover:bg-muted transition-colors" target="_blank" rel="noopener noreferrer">
                <FaXTwitter size={20} />
              </a>
              <a href="https://github.com/hhwjsw711" className="p-2 rounded-full hover:bg-muted transition-colors" target="_blank" rel="noopener noreferrer">
                <FaGithub size={20} />
              </a>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-2 rounded-full hover:bg-muted transition-colors">
                    <SiWechat size={20} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <div className="p-2">
                    <Image 
                      src="/weixin.jpg" 
                      alt="WeChat QR Code" 
                      width={200} 
                      height={200} 
                      className="rounded-md"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} {t('companyName')}. {t('footerRights')}
        </div>
      </div>
    </footer>
  );
}