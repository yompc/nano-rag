'use client';

import { type ReactNode, useEffect } from 'react';
import { UploadProvider } from '@/hooks/use-upload-state';

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  return (
    <UploadProvider>
      {children}
    </UploadProvider>
  );
}
