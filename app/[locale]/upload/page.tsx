'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PDFParser, type ParsedPDF } from '@/components/pdf-parser';
import { createDocument, ingestPage } from '@/app/actions/ingest';
import { PasswordDialog } from '@/components/password-dialog';
import { AppShell } from '@/components/app-shell';
import { useUploadState } from '@/hooks/use-upload-state';

type DocType = 'manual' | 'faq' | 'api_doc';

export default function UploadPage() {
  const t = useTranslations('upload');
  const tCommon = useTranslations('common');
  const tDocTypes = useTranslations('docTypes');
  const [parsedPDF, setParsedPDF] = useState<ParsedPDF | null>(null);
  const [docType, setDocType] = useState<DocType>('manual');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentDocId, setCurrentDocId] = useState<number | null>(null);
  const [failedPage, setFailedPage] = useState<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const { notifyUpload } = useUploadState();

  const DOC_TYPE_OPTIONS: { value: DocType; label: string; icon: string }[] = [
    { value: 'manual', label: tDocTypes('manual'), icon: '📖' },
    { value: 'faq', label: tDocTypes('faq'), icon: '❓' },
    { value: 'api_doc', label: tDocTypes('api_doc'), icon: '🔧' },
  ];

  const handleParsed = useCallback((result: ParsedPDF) => {
    setParsedPDF(result);
    setError(null);
    setSuccess(false);
  }, []);

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setParsedPDF(null);
  }, []);

  const performUpload = useCallback(async (password: string) => {
    if (!parsedPDF) return;

    const createResult = await createDocument({
      filename: parsedPDF.filename,
      doc_type: docType,
      password
    });

    if (!createResult.success) {
      if (createResult.error?.includes('密码') || createResult.error?.includes('password')) {
        setPasswordError(createResult.error);
        setPasswordDialogOpen(true);
        setIsUploading(false);
        return;
      }
      throw new Error(createResult.error);
    }

    const docId = createResult.docId!;
    setCurrentDocId(docId);

    for (let i = 0; i < parsedPDF.pages.length; i++) {
      setCurrentPage(i + 1);

      const pageResult = await ingestPage({
        docId,
        filename: parsedPDF.filename,
        doc_type: docType,
        page: parsedPDF.pages[i],
        pageIndex: i,
        totalPages: parsedPDF.pages.length
      });

      if (!pageResult.success) {
        setFailedPage(i);
        throw new Error(t('pageFailed', { page: i + 1 }));
      }

      setUploadProgress(pageResult.progress);
    }

    setUploadProgress(100);
    setSuccess(true);
    notifyUpload(docId, parsedPDF.filename);
    // Keep success state visible — user can click CTA or continue uploading
  }, [parsedPDF, docType, t, notifyUpload]);

  const handlePasswordSubmit = useCallback(async (password: string, remember: boolean) => {
    if (!parsedPDF) return;

    if (remember) {
      localStorage.setItem('admin_password', password);
    }

    setPasswordDialogOpen(false);
    setPasswordError(undefined);

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(false);
    setFailedPage(null);

    try {
      await performUpload(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setIsUploading(false);
    }
  }, [parsedPDF, performUpload, tCommon]);

  const handleUpload = async () => {
    if (!parsedPDF) return;

    const savedPassword = localStorage.getItem('admin_password');

    if (!savedPassword) {
      setPasswordDialogOpen(true);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(false);
    setFailedPage(null);

    try {
      await performUpload(savedPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setParsedPDF(null);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
  };

  const handleRetry = async () => {
    if (failedPage === null || !parsedPDF || currentDocId === null) return;

    setIsRetrying(true);
    setError(null);

    try {
      const pageResult = await ingestPage({
        docId: currentDocId,
        filename: parsedPDF.filename,
        doc_type: docType,
        page: parsedPDF.pages[failedPage],
        pageIndex: failedPage,
        totalPages: parsedPDF.pages.length
      });

      if (pageResult.success) {
        setFailedPage(null);
        for (let i = failedPage + 1; i < parsedPDF.pages.length; i++) {
          setCurrentPage(i + 1);

          const result = await ingestPage({
            docId: currentDocId,
            filename: parsedPDF.filename,
            doc_type: docType,
            page: parsedPDF.pages[i],
            pageIndex: i,
            totalPages: parsedPDF.pages.length
          });

          if (!result.success) {
            setFailedPage(i);
            throw new Error(t('pageFailed', { page: i + 1 }));
          }

          setUploadProgress(result.progress);
        }

        setUploadProgress(100);
        setSuccess(true);
        notifyUpload(currentDocId, parsedPDF.filename);
      } else {
        setError(t('pageFailed', { page: failedPage + 1 }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSkip = async () => {
    if (failedPage === null || !parsedPDF || currentDocId === null) return;

    setIsRetrying(true);
    setError(null);
    setFailedPage(null);

    try {
      for (let i = failedPage + 1; i < parsedPDF.pages.length; i++) {
        setCurrentPage(i + 1);

        const result = await ingestPage({
          docId: currentDocId,
          filename: parsedPDF.filename,
          doc_type: docType,
          page: parsedPDF.pages[i],
          pageIndex: i,
          totalPages: parsedPDF.pages.length
        });

        if (!result.success) {
          setFailedPage(i);
          throw new Error(t('pageFailed', { page: i + 1 }));
        }

        setUploadProgress(result.progress);
      }

      setUploadProgress(100);
      setSuccess(true);
      notifyUpload(currentDocId, parsedPDF.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <AppShell>
      <PasswordDialog
        open={passwordDialogOpen}
        onClose={() => { setPasswordDialogOpen(false); setPasswordError(undefined); }}
        onSubmit={handlePasswordSubmit}
        error={passwordError}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
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
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-display text-[var(--ink)] mb-2">
              {t('title')}
            </h1>
            <p className="text-sm md:text-base text-[var(--body)]">
              {t('subtitle')}
            </p>
          </div>
        </div>

        <div className="bg-[var(--surface-card)] rounded-xl border border-[var(--hairline)] p-4 md:p-6 lg:p-8 w-full md:max-w-2xl lg:max-w-3xl mx-auto">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl"
              >
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl"
              >
                <p className="text-green-700 dark:text-green-300 text-sm flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t('uploadSuccess')}
                </p>
                <div className="flex gap-2">
                  <Link
                    href="/"
                    className="btn-primary px-4 py-2 text-sm transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t('askNow')}
                  </Link>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 border border-[var(--hairline)] text-[var(--body-strong)] rounded-lg text-sm hover:bg-[var(--canvas)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t('continueUpload')}
                  </button>
                  <Link
                    href="/library"
                    className="px-4 py-2 border border-[var(--hairline)] text-[var(--body-strong)] rounded-lg text-sm hover:bg-[var(--canvas)] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t('goToLibrary')}
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {failedPage !== null && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-xl"
              >
                <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
                  {t('pageFailed', { page: failedPage + 1 })}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-50 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isRetrying ? tCommon('loading') : t('retryPage')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isRetrying}
                    className="px-4 py-2 border border-[var(--hairline)] text-[var(--body-strong)] rounded-lg text-sm hover:bg-[var(--canvas)] disabled:opacity-50 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t('skipContinue')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-8">
            <p className="block text-sm text-[var(--body-strong)] mb-3">
              {t('pdfFile')}
            </p>
            <PDFParser
              onParsed={handleParsed}
              onError={handleError}
              className=""
            />
          </div>

          <AnimatePresence>
            {parsedPDF && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="mb-8">
                  <p className="block text-sm text-[var(--body-strong)] mb-3">
                    {t('docType')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4" role="radiogroup" aria-label={t('docType')}>
                    {DOC_TYPE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setDocType(option.value)}
                        disabled={isUploading}
                        role="radio"
                        aria-checked={docType === option.value}
                        type="button"
                        className={`
                          p-4 rounded-xl border-2 transition-all duration-200
                          ${docType === option.value
                            ? 'border-[var(--primary)] bg-[var(--primary-subtle)] shadow-sm scale-[1.02]'
                            : 'border-[var(--hairline)] bg-[var(--canvas)] hover:border-[var(--muted-soft)]'
                          }
                          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'}
                          focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2
                        `}
                      >
                        <div className={`text-3xl mb-2 transition-transform duration-200 ${docType === option.value ? 'scale-110' : ''}`} aria-hidden="true">{option.icon}</div>
                        <div className={`text-sm ${docType === option.value ? 'text-[var(--primary)] font-medium' : 'text-[var(--body-strong)]'}`}>
                          {option.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-8 p-6 bg-[var(--canvas)] rounded-xl border border-[var(--hairline)]">
                  <h3 className="text-sm text-[var(--body-strong)] mb-4">
                    {t('docInfo')}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--body)]">{t('filename')}</span>
                      <span className="text-[var(--ink)] font-medium">
                        {parsedPDF.filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--body)]">{t('pages')}</span>
                      <span className="text-[var(--ink)] font-medium">
                        {parsedPDF.totalPages}
                      </span>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isUploading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="mb-6"
                    >
                      <div className="h-2 bg-[var(--canvas)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--primary)] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-[var(--body)] mt-2 text-center">
                        {currentPage > 0
                          ? t('processing', { current: currentPage, total: parsedPDF?.pages.length })
                          : `${tCommon('loading')} ${uploadProgress}%`
                        }
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <button
                    onClick={handleReset}
                    disabled={isUploading}
                    type="button"
                    className={`
                      flex-1 py-4 px-6 rounded-xl font-medium
                      border border-[var(--hairline)]
                      text-[var(--body-strong)]
                      hover:bg-[var(--canvas)]
                      transition-all duration-150
                      ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
                    `}
                  >
                    {tCommon('cancel')}
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    type="button"
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isUploading ? tCommon('loading') : t('confirmUpload')}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-[var(--body)]">{t('legalNotice')}</p>
        </div>
      </div>
    </AppShell>
  );
}
