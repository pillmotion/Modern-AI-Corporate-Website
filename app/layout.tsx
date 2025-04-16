import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { LanguageProvider } from '@/components/language-provider';
import ClientLayout from '@/components/client-layout';
import GoogleAnalytics from '@/components/google-analytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Pillmotion - Leading AI Innovation and Development',
  description: 'Transform your business with cutting-edge AI solutions. Join us in shaping the future of technology.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/logo.png', sizes: 'any' }
    ],
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Pillmotion - Leading AI Innovation and Development',
    description: 'Transform your business with cutting-edge AI solutions. Join us in shaping the future of technology.',
    images: ['/images/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pillmotion - Leading AI Innovation and Development',
    description: 'Transform your business with cutting-edge AI solutions. Join us in shaping the future of technology.',
    images: ['images/og-image.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <head>
        <GoogleAnalytics />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <LanguageProvider>
            <ClientLayout>{children}</ClientLayout>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}