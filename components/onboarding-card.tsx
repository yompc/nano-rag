'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'nano-rag-onboarding-dismissed';

export function OnboardingCard() {
  const t = useTranslations('onboarding');
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== 'true') {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed) return null;

  const steps = [
    { num: 1, title: t('step1'), desc: t('step1Desc') },
    { num: 2, title: t('step2'), desc: t('step2Desc') },
    { num: 3, title: t('step3'), desc: t('step3Desc') },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl"
      >
        <div className="relative overflow-hidden rounded-2xl border border-[var(--hairline)] bg-gradient-to-br from-[var(--surface-soft)] to-[var(--canvas)]">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--canvas)] transition-colors z-10"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--ink)]">{t('welcome')}</h3>
                <p className="text-xs text-[var(--muted)]">{t('stepsCount')}</p>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {steps.map((step, index) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3 group"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--primary-subtle)] text-[var(--primary)] text-xs font-semibold shrink-0 mt-0.5">
                    {step.num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--ink)]">{step.title}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Link
              href="/upload"
              className="btn-primary w-full text-sm !py-2.5 flex items-center justify-center gap-2"
            >
              {t('cta')}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
