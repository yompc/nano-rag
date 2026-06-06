'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/app-shell';
import { PasswordDialog } from '@/components/password-dialog';
import { listDocuments, deleteDocument, type DocWithChunks } from '@/app/actions/library';
import { formatDate } from '@/lib/utils';

const DOC_TYPE_ICONS: Record<string, string> = {
  manual: '📖',
  faq: '❓',
  api_doc: '🔧',
};

export function LibraryPageClient() {
  const t = useTranslations('library');
  const tCommon = useTranslations('common');
  const tDocTypes = useTranslations('docTypes');
  const [docs, setDocs] = useState<DocWithChunks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [pendingDeleteDocId, setPendingDeleteDocId] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadDocs() {
      setLoading(true);
      setError(null);
      const result = await listDocuments();
      if (!ignore) {
        if (result.success && result.docs) {
          setDocs(result.docs);
        } else {
          setError(result.error || tCommon('error'));
        }
        setLoading(false);
      }
    }

    loadDocs();
    return () => { ignore = true; };
  }, [tCommon]);

  const handleDeleteClick = (docId: number) => {
    const savedPassword = localStorage.getItem('admin_password');
    if (savedPassword) {
      performDelete(docId, savedPassword);
    } else {
      setPendingDeleteDocId(docId);
      setPasswordDialogOpen(true);
    }
  };

  const handlePasswordSubmit = async (password: string, remember: boolean) => {
    if (remember) {
      localStorage.setItem('admin_password', password);
    }
    setPasswordDialogOpen(false);
    setPasswordError(undefined);

    if (pendingDeleteDocId !== null) {
      await performDelete(pendingDeleteDocId, password);
      setPendingDeleteDocId(null);
    }
  };

  const performDelete = async (docId: number, password: string) => {
    setDeleting(docId);
    const result = await deleteDocument(docId, password);
    if (result.success) {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } else {
      if (result.error?.includes('密码') || result.error?.includes('password')) {
        setPasswordError(result.error);
        setPasswordDialogOpen(true);
      } else {
        setError(result.error || tCommon('error'));
      }
    }
    setDeleting(null);
  };

  const totalChunks = docs.reduce((acc, d) => acc + d.chunk_count, 0);

  return (
    <AppShell>
      <PasswordDialog
        open={passwordDialogOpen}
        onClose={() => { setPasswordDialogOpen(false); setPasswordError(undefined); setPendingDeleteDocId(null); }}
        onSubmit={handlePasswordSubmit}
        error={passwordError}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link
                href="/"
                className="flex items-center gap-2 text-[var(--primary)] hover:opacity-80 transition-opacity"
                aria-label={tCommon('back')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>{tCommon('back')}</span>
              </Link>
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display text-[var(--ink)]">
              {t('title')}
            </h1>
            {docs.length > 0 && (
              <p className="text-sm text-[var(--muted-soft)] mt-1">
                {t('totalDocs', { docs: docs.length, chunks: totalChunks })}
              </p>
            )}
          </div>
          <Link
            href="/upload"
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('uploadButton')}
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--primary)] animate-pulse" />
              <div className="w-3 h-3 rounded-full bg-[var(--primary)] animate-pulse animation-delay-200" />
              <div className="w-3 h-3 rounded-full bg-[var(--primary)] animate-pulse animation-delay-400" />
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl mb-6">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {!loading && docs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[var(--surface-soft)] flex items-center justify-center mb-6 shadow-sm">
              <svg className="w-10 h-10 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-display font-medium text-[var(--ink)] mb-2">{t('empty')}</h3>
            <p className="text-sm text-[var(--muted)] mb-6 max-w-sm">{t('emptyHint')}</p>
            <div className="flex gap-3">
              <Link href="/upload" className="btn-primary">
                {t('uploadButton')}
              </Link>
            </div>
          </div>
        )}

        {!loading && docs.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="bg-[var(--surface-card)] border border-[var(--hairline)] rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:border-[var(--primary)] hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0" aria-hidden="true">
                      {DOC_TYPE_ICONS[doc.doc_type] || '📄'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--canvas)] text-[var(--muted)] border border-[var(--hairline)]">
                      {tDocTypes(doc.doc_type)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(doc.id)}
                    disabled={deleting === doc.id}
                    className="p-1.5 text-[var(--muted-soft)] hover:text-[var(--error)] transition-colors rounded hover:bg-[var(--canvas)] disabled:opacity-50"
                    aria-label={tCommon('delete')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <h3 className="text-sm font-medium text-[var(--body-strong)] truncate mb-3" title={doc.filename}>
                  {doc.filename}
                </h3>

                <div className="flex items-center justify-between text-xs text-[var(--muted-soft)]">
                  <span>{t('chunks', { count: doc.chunk_count })}</span>
                  <span>{formatDate(doc.uploaded_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
