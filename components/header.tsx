'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useLanguage } from './language-provider';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Globe, Menu, ArrowLeft } from 'lucide-react';
import Logo from './logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTranslation } from '@/hooks/useTranslation';
import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from '@/convex/_generated/api';
import { useQuery } from "convex/react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const pathname = usePathname();
  const showBackButton = pathname !== '/';

  const { isLoaded: isUserLoaded, isSignedIn } = useUser();

  const currentUserData = useQuery(
    api.users.getCurrentUserCredits, // Use the query that gets data for the *current* user
    // Only run the query if Clerk is loaded and the user is signed in
    isUserLoaded && isSignedIn ? {} : "skip"
  );

  // Extract credits, handle loading/null states in JSX
  const credits = currentUserData?.credits;

  const getCreditsText = () => {
    if (currentUserData === undefined) {
      return '...'; // Loading state
    }
    return credits ?? '-'; // Show credits or '-' if null/undefined
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4 md:gap-8">
          {showBackButton && (
            <Link href="/" className="hidden md:flex items-center text-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Link>
          )}
          <Logo />
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <a href="/" className="text-foreground/60 hover:text-primary transition-colors">
            {t('home')}
          </a>
          <a href="/#features" className="text-foreground/60 hover:text-primary transition-colors">
            {t('features')}
          </a>
          <a href="/#pricing" className="text-foreground/60 hover:text-primary transition-colors">
            {t('pricing')}
          </a>
          <a href="/generate" className="text-foreground/60 hover:text-primary transition-colors">
            {t('generate')}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('zh')}>
                中文
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="hover:text-primary"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <div className="h-6 w-[1px] bg-border hidden md:block" />

          {/* Auth Section */}
          {!isUserLoaded ? (
            // Optional: Show a loading spinner while Clerk is initializing
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          ) : (
            <>
              {isSignedIn ? (
                <>
                  {/* === Replace the div with this anchor tag === */}
                  <a
                    href="/#pricing" // Link to homepage pricing section
                    className="px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground hover:bg-muted/80 transition-colors mr-2 hidden sm:inline-block" // Apply styling (using shadcn muted style as an example, adjust as needed)
                  >
                    {/* Use t() for "Credits" and display the value */}
                    {getCreditsText()} {t('credits', { count: credits ?? 0 })} {/* Pass count for potential pluralization */}
                  </a>
                  {/* === End of replacement === */}


                  {/* Optional: Add "Buy Credits" button */}
                  {/* <Button size="sm">购买积分</Button> */}

                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <SignInButton mode="modal">
                  <Button className="bg-primary hover:bg-primary/90">
                    {t('login')}
                  </Button>
                </SignInButton>
              )}
            </>
          )}

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="hover:text-primary">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[250px] sm:w-[300px]">
              <div className="flex flex-col gap-6 mt-6">
                {isSignedIn && (
                  <a
                    href="/#pricing"
                    className="text-foreground/60 hover:text-primary transition-colors"
                  >
                    {getCreditsText()} {t('credits', { count: credits ?? 0 })}
                  </a>
                )}
                <a href="/" className="text-foreground/60 hover:text-primary transition-colors">
                  {t('home')}
                </a>
                <a href="/#features" className="text-foreground/60 hover:text-primary transition-colors">
                  {t('features')}
                </a>
                <a href="/#pricing" className="text-foreground/60 hover:text-primary transition-colors">
                  {t('pricing')}
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}