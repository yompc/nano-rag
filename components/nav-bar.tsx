'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  match: 'exact' | 'prefix';
}

interface NavBarProps {
  variant?: 'default' | 'landing';
  /** Additional elements to render in the nav center area (desktop only) */
  children?: React.ReactNode;
  /** Hide mobile hamburger menu (use when page has its own mobile menu) */
  hideMobileMenu?: boolean;
}

const SVG_ICONS: Record<string, React.ReactNode> = {
  chat: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  upload: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  library: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
};

export function NavBar({ variant = 'default', children, hideMobileMenu = false }: NavBarProps) {
  const pathname = usePathname();
  const t = useTranslations('common');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLanding = variant === 'landing';

  const navItems: NavItem[] = [
    { href: '/', icon: 'chat', label: t('chat'), match: 'exact' },
    { href: '/upload', icon: 'upload', label: t('upload'), match: 'prefix' },
    { href: '/library', icon: 'library', label: t('library'), match: 'prefix' },
  ];

  const isActive = (item: NavItem) => {
    if (item.match === 'exact') return pathname === item.href;
    return pathname.startsWith(item.href) && item.href !== '/';
  };

  return (
    <header
      className={`
        flex items-center justify-between px-4 py-3
        border-b border-[var(--hairline)] bg-[var(--canvas)]
      `}
    >
      {/* Left: Logo + Hamburger (mobile) */}
      <div className="flex items-center gap-2">
        {!hideMobileMenu && (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-[var(--surface-soft)] transition-all focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2 focus-visible:ring-[3px] focus-visible:ring-[var(--primary-subtle)]"
            aria-label={t('menu')}
          >
            <svg className="w-5 h-5 text-[var(--muted-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Nano RAG" className="w-8 h-8" />
          <span className="font-display font-semibold text-base md:text-lg text-[var(--ink)]">
            Nano RAG
          </span>
        </Link>
      </div>

      {/* Center: Nav Links (desktop) */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all
              ${isActive(item)
                ? 'text-[var(--primary)] bg-[var(--surface-soft)]'
                : 'text-[var(--muted-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)]'
              }
              focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2
            `}
          >
            {SVG_ICONS[item.icon]}
            <span>{item.label}</span>
          </Link>
        ))}
        {children && (
          <div className="ml-2 flex items-center gap-2">
            {children}
          </div>
        )}
      </nav>

      {/* Right: Theme + Language */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      {/* Mobile Menu Overlay */}
      {!hideMobileMenu && mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed top-0 left-0 z-50 w-64 h-full bg-[var(--canvas)] border-r border-[var(--hairline)] shadow-lg md:hidden animate-slide-in-left">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--hairline)]">
              <span className="font-display font-semibold text-base text-[var(--ink)]">Nano RAG</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-[var(--surface-soft)] transition-all focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
                aria-label={t('close')}
              >
                <svg className="w-5 h-5 text-[var(--muted-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="p-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-colors
                    ${isActive(item)
                      ? 'text-[var(--primary)] bg-[var(--surface-soft)]'
                      : 'text-[var(--muted-soft)] hover:text-[var(--ink)] hover:bg-[var(--surface-soft)]'
                    }
                  `}
                >
                  {SVG_ICONS[item.icon]}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
