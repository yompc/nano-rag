'use client';

import { useState, useEffect, useRef } from 'react';

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (password: string, remember: boolean) => void;
  error?: string;
}

export function PasswordDialog({ open, onClose, onSubmit, error }: PasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPassword = localStorage.getItem('admin_password');
      if (savedPassword) {
        setPassword(savedPassword);
        setRemember(true);
      }
    }
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(password, remember);
  };

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClose}
        aria-label="关闭"
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-50 cursor-default"
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-[var(--surface-card)] rounded-xl border border-[var(--hairline)] shadow-xl w-full max-w-md animate-slide-in-right pointer-events-auto"
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--hairline)]">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              管理员验证
            </h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 bg-[var(--canvas)] border border-[var(--hairline)] rounded-full hover:bg-[var(--surface-soft)] transition-colors"
              aria-label="关闭"
            >
              <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <title>关闭</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm text-[var(--body-strong)] mb-2">
                密码
              </label>
              <input
                ref={inputRef}
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-text w-full"
                placeholder="请输入管理员密码"
                autoComplete="current-password"
              />
            </div>

            <div className="mb-6 flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--hairline)] text-[var(--primary)] focus:ring-[var(--primary)] focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-sm text-[var(--body)] cursor-pointer select-none">
                记住密码
              </label>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="btn-secondary flex-1"
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-primary flex-1"
              >
                确认
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
