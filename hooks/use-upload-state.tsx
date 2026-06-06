'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface UploadState {
  lastUploadedDocIds: number[];
  uploadCount: number;
  lastFilename: string | null;
}

interface UploadContextValue extends UploadState {
  notifyUpload: (docId: number, filename: string) => void;
  clearUploadState: () => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UploadState>({
    lastUploadedDocIds: [],
    uploadCount: 0,
    lastFilename: null,
  });

  const notifyUpload = useCallback((docId: number, filename: string) => {
    setState((prev) => ({
      lastUploadedDocIds: [...prev.lastUploadedDocIds, docId],
      uploadCount: prev.uploadCount + 1,
      lastFilename: filename,
    }));
  }, []);

  const clearUploadState = useCallback(() => {
    setState({
      lastUploadedDocIds: [],
      uploadCount: 0,
      lastFilename: null,
    });
  }, []);

  return (
    <UploadContext.Provider value={{ ...state, notifyUpload, clearUploadState }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUploadState(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) {
    throw new Error('useUploadState must be used within UploadProvider');
  }
  return ctx;
}
