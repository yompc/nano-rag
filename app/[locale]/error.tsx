'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  useEffect(() => {
    // 可以在这里上报错误到监控系统
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 错误图标 */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-[#cc785c]/10 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-[#cc785c]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
        </div>

        {/* 标题 */}
        <h1 className="text-2xl font-semibold text-[#181715] mb-3">
          {t('title')}
        </h1>

        {/* 描述 */}
        <p className="text-[#5c5c5c] mb-8">
          {t('description')}
        </p>

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#cc785c] text-white font-medium hover:bg-[#b86a4e] transition-colors"
          >
            {t('retry')}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-[#cc785c] text-[#cc785c] font-medium hover:bg-[#cc785c]/10 transition-colors"
          >
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
