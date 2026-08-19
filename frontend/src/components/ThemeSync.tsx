'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ThemeSync() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // 1. Check if theme is passed via URL query parameter (e.g. ?theme=dark)
    const urlTheme = searchParams.get('theme');
    if (urlTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (urlTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // 1.5 Fallback to OS/Browser theme preference automatically
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }

    // 2. Listen for postMessage from the parent window (for dynamic toggling)
    const handleMessage = (event: MessageEvent) => {
      // Allow the parent platform to send { type: 'THEME_CHANGE', theme: 'dark' }
      if (event.data && event.data.type === 'THEME_CHANGE') {
        if (event.data.theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [searchParams]);

  return null;
}
