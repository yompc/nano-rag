'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getChunksByFilename } from '@/app/actions/chunks';

interface Source {
  filename: string;
  page: number;
  content: string;
}

interface PDFPreviewTooltipProps {
  source: Source;
  mouseX: number;
  mouseY: number;
  pin?: boolean;
  onClose?: () => void;
}

export function PDFPreviewTooltip({ source, mouseX, mouseY, pin = false, onClose }: PDFPreviewTooltipProps) {
  const t = useTranslations('chat');
  const [pageContent, setPageContent] = useState<string>(source.content);
  const [loading, setLoading] = useState(false);
  const [contentLength, setContentLength] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function loadFullPage() {
      setLoading(true);
      try {
        const result = await getChunksByFilename(source.filename);
        if (cancelled) return;

        if (result.success && result.chunks) {
          // Concatenate all chunks for this page
          const pageChunks = result.chunks.filter(c => c.page === source.page);
          const fullContent = pageChunks.map(c => c.content).join('\n\n');
          setPageContent(fullContent);
          setContentLength(fullContent.length);
        } else {
          setPageContent(source.content);
          setContentLength(source.content.length);
        }
      } catch (err) {
        if (cancelled) return;
        setPageContent(source.content);
        setContentLength(source.content.length);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadFullPage();

    return () => { cancelled = true; };
  }, [source.filename, source.page, source.content]);

  // When pinned (clicked), position in the center of the viewport
  // When hovered, follow the mouse
  const positionStyle = pin
    ? {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        maxWidth: '600px',
        width: '90vw',
        maxHeight: '80vh',
      }
    : {
        left: mouseX + 16,
        bottom: 16,
        maxWidth: '480px',
        width: 'max-content',
      };

  return (
    <div
      className={`fixed z-50 animate-fade-in ${pin ? '' : 'pointer-events-none'}`}
      style={positionStyle}
    >
      <div className="bg-[var(--surface-card)] border border-[var(--hairline)] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-[var(--hairline)] bg-[var(--surface-soft)]">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-[var(--primary)] truncate max-w-[200px]">
              {source.filename}
            </span>
            <span className="text-xs text-[var(--muted)] whitespace-nowrap">
              {t('page', { page: source.page })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted)] whitespace-nowrap">
              {loading ? '...' : `${contentLength} ${t('pdfPreview.characters')}`}
            </span>
            {pin && onClose && (
              <button
                onClick={onClose}
                className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors pointer-events-auto"
                aria-label={t('pdfPreview.close')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className={`p-4 overflow-y-auto ${pin ? 'max-h-[60vh]' : 'max-h-96'}`}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
              {pageContent}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
