import { Link } from '@/i18n/routing';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist',
  robots: {
    index: false,
    follow: true,
  },
};

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 图标 */}
        <div className="mb-8">
          <span className="text-[120px] font-serif text-[#cc785c] leading-none select-none">
            404
          </span>
        </div>

        {/* 标题 */}
        <h1 className="text-2xl font-semibold text-[#181715] mb-3">
          {t('title')}
        </h1>

        {/* 描述 */}
        <p className="text-[#5c5c5c] mb-8">
          {t('description')}
        </p>

        {/* 导航链接 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#cc785c] text-white font-medium hover:bg-[#b86a4e] transition-colors"
          >
            {t('goToChat')}
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-[#cc785c] text-[#cc785c] font-medium hover:bg-[#cc785c]/10 transition-colors"
          >
            {t('goToLibrary')}
          </Link>
        </div>
      </div>
    </div>
  );
}
