'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

export function OnboardingCard() {
  const t = useTranslations('onboarding');
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const steps = [
    { icon: '📄', label: t('step1'), desc: t('step1Desc') },
    { icon: '⚙️', label: t('step2'), desc: t('step2Desc') },
    { icon: '💬', label: t('step3'), desc: t('step3Desc') },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-6 p-5 bg-[var(--surface-card)] border border-[var(--hairline)] rounded-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--ink)]">
            {t('welcome')}
          </h2>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 text-[var(--muted-soft)] hover:text-[var(--ink)] transition-colors rounded hover:bg-[var(--canvas)]"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 mb-4">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              <span className="text-2xl shrink-0">{step.icon}</span>
              <div>
                <p className="text-sm font-medium text-[var(--body-strong)]">
                  {i + 1}. {step.label}
                </p>
                <p className="text-xs text-[var(--muted-soft)] mt-0.5">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Link
          href="/upload"
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          {t('cta')}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
