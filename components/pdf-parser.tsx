'use client';

import { useState, useCallback, useRef } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { useTranslations } from 'next-intl';

// Configure PDF.js worker - use static file from public directory
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedPDF {
  filename: string;
  pages: ParsedPage[];
  totalPages: number;
}

interface PDFParserProps {
  onParsed: (result: ParsedPDF) => void;
  onError: (error: string) => void;
  className?: string;
}

export function PDFParser({ onParsed, onError, className = '' }: PDFParserProps) {
  const t = useTranslations('pdfParser');
  const [parsing, setParsing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [previewPages, setPreviewPages] = useState<ParsedPage[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsePDF = useCallback(async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      onError(t('notPdf'));
      return;
    }

    setParsing(true);
    setProgress(0);
    setPreviewPages([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      const pages: ParsedPage[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const text = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        
        pages.push({ pageNumber: i, text });
        setProgress(Math.round((i / pdf.numPages) * 100));
      }

      const result: ParsedPDF = {
        filename: file.name,
        pages,
        totalPages: pdf.numPages,
      };

      setPreviewPages(pages);
      onParsed(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('unknownError');
      onError(`${t('parseFailed')}: ${message}`);
    } finally {
      setParsing(false);
    }
  }, [onParsed, onError, t]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      parsePDF(files[0]);
    }
  }, [parsePDF]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      parsePDF(files[0]);
    }
  }, [parsePDF]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div className={`w-full ${className}`}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={t('uploadAria')}
        className={`
          relative bg-[var(--surface-card)] rounded-lg border-2 border-dashed border-[var(--hairline)] p-12
          transition-all duration-200 cursor-pointer
          flex flex-col items-center justify-center gap-4
          min-h-[200px]
          ${isDragging
            ? 'bg-[var(--surface-card)] border-[var(--primary)]'
            : 'border-[var(--hairline)] hover:border-[var(--ink)]'
          }
          ${parsing ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="text-[var(--muted)]">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-16 h-16" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-label={t('pdfIcon')}
          >
            <title>{t('pdfIcon')}</title>
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
            />
          </svg>
        </div>
        
        <div className="text-center">
          <p className="text-lg font-medium text-[var(--ink)]">
            {t('dragOrDrop')}
          </p>
          <p className="text-sm text-[var(--muted)] mt-1">
            {t('clickToSelect')}
          </p>
        </div>

        {parsing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--surface-card)]/80 rounded-xl">
            <div className="w-48 h-2 bg-[var(--canvas)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-medium text-[var(--ink)]">
              {t('parsing')} {progress}%
            </p>
          </div>
        )}
      </div>

      {previewPages.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-sm font-medium text-[var(--ink)] hover:text-[var(--primary)] transition-colors"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`w-4 h-4 transition-transform ${showPreview ? 'rotate-90' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-label={t('togglePreview')}
            >
              <title>{t('togglePreview')}</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {t('viewExtracted')} ({previewPages.length} {t('pages')})
          </button>

          {showPreview && (
            <div className="mt-4 space-y-4 max-h-[400px] overflow-y-auto">
              {previewPages.map((page) => (
                <div
                  key={page.pageNumber}
                  className="bg-[var(--canvas)] border border-[var(--hairline)] rounded-lg p-4"
                >
                  <p className="text-xs font-medium text-[var(--muted)] mb-2">
                    {t('page')} {page.pageNumber}
                  </p>
                  <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
                    {page.text || t('noText')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
