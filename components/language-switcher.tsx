'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1 bg-[var(--surface-soft)] rounded-lg p-1">
      <button
        type="button"
        onClick={() => switchLocale('zh')}
        className={`px-2 py-1 text-xs rounded-md transition-all ${
          locale === 'zh'
            ? 'bg-[var(--surface-card)] text-[var(--primary)] font-medium shadow-sm'
            : 'text-[var(--muted)] hover:text-[var(--body)] hover:bg-[var(--canvas)]'
        } focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-1`}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => switchLocale('en')}
        className={`px-2 py-1 text-xs rounded-md transition-all ${
          locale === 'en'
            ? 'bg-[var(--surface-card)] text-[var(--primary)] font-medium shadow-sm'
            : 'text-[var(--muted)] hover:text-[var(--body)] hover:bg-[var(--canvas)]'
        } focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-1`}
      >
        EN
      </button>
    </div>
  );
}
