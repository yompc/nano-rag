'use client';

import { type ReactNode } from 'react';
import { UploadProvider } from '@/hooks/use-upload-state';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <UploadProvider>
      {children}
    </UploadProvider>
  );
}
