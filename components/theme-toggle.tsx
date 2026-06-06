'use client';

import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme';
const THEME_ICONS: Record<Theme, string> = {
  light: '☀️',
  dark: '🌙',
  system: '💻',
};

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function applyTheme(theme: Theme) {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme;

  if (resolved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  }, [theme, mounted]);

  const cycleTheme = () => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  };

  const cycleLabel = () => {
    if (theme === 'light') return '切换到暗色模式';
    if (theme === 'dark') return '跟随系统';
    return '切换到亮色模式';
  };

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="p-2 rounded-full hover:bg-[var(--surface-soft)] transition-all text-sm focus-visible:outline-2 focus-visible:outline-[var(--primary)] focus-visible:outline-offset-2"
      aria-label={cycleLabel()}
      title={cycleLabel()}
    >
      {mounted ? (
        <span className="text-base leading-none">{THEME_ICONS[theme]}</span>
      ) : (
        <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
