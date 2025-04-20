import { clsx, type ClassValue } from 'clsx';
import { useConvexAuth } from 'convex/react';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function useSession() {
  return useConvexAuth();
}

export function analyzeTextAndEstimateDuration(text: string): {
  characterCount: number;
  wordCount: number;
  totalMinutes: number;
  duration: {
    minutes: number;
    seconds: number;
  };
} {

  // --- 文本分析部分 (不变) ---
  const englishWords =
    text.match(/\b[A-Za-z0-9]+(?:'[A-Za-z0-9]+)*\b/g) || [];
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const cleanText = text.replace(/\s+/g, "");

  const characterCount = cleanText.length;
  const wordCount = englishWords.length + chineseChars.length;
  const englishWordsCount = englishWords.length;
  const chineseCharsCount = chineseChars.length;

  // --- 时长估算部分 (不变) ---
  const SPEEDS = {
    en: 150,
    zh: 250,
  };

  const englishTime = englishWordsCount / SPEEDS.en;
  const chineseTime = chineseCharsCount / SPEEDS.zh;
  const totalMinutes = englishTime + chineseTime;

  let calculatedMinutes = 0;
  let calculatedSeconds = 0;

  if (totalMinutes > 0) {
    const totalSecondsRaw = totalMinutes * 60;
    const totalSecondsRounded = totalSecondsRaw < 1 && totalSecondsRaw > 0 ? 1 : Math.round(totalSecondsRaw);

    if (totalSecondsRounded >= 60) {
      calculatedMinutes = Math.floor(totalSecondsRounded / 60);
      calculatedSeconds = totalSecondsRounded % 60;
    } else {
      calculatedSeconds = totalSecondsRounded;
    }
  }

  return {
    characterCount,
    wordCount,
    totalMinutes,
    duration: {
      minutes: calculatedMinutes,
      seconds: calculatedSeconds,
    },
  };
}
