'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, memo } from 'react';
import { useTranslations } from 'next-intl';

export interface SourceWithSimilarity {
  filename: string;
  page: number;
  similarity: number;
}

export interface ThinkingStep {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  duration?: number;
  metadata?: {
    count?: number;
    sources?: SourceWithSimilarity[];
    originalQuery?: string;
    rewrittenQuery?: string;
  };
}

interface ThinkingProcessProps {
  steps: ThinkingStep[];
  isComplete: boolean;
  className?: string;
}

function getSimilarityColor(similarity: number): string {
  if (similarity >= 0.8) return 'var(--success)';
  if (similarity >= 0.6) return 'var(--warning)';
  return 'var(--muted)';
}

function StepIcon({ status }: { status: ThinkingStep['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-3.5 h-3.5 rounded-full bg-[var(--success)] flex items-center justify-center"
        >
          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
      );
    case 'active':
      return (
        <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--primary)] flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]"
          />
        </div>
      );
    case 'error':
      return (
        <div className="w-3.5 h-3.5 rounded-full bg-[var(--error)] flex items-center justify-center">
          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      );
    default:
      return <div className="w-3.5 h-3.5 rounded-full border border-[var(--hairline)] bg-[var(--canvas)]" />;
  }
}

function DocumentPreview({ source, index }: { source: SourceWithSimilarity; index: number }) {
  const t = useTranslations('chat.thinking');
  const similarityPercent = Math.round(source.similarity * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex items-center gap-1.5 py-0.5 px-1.5 rounded text-[10px] bg-[var(--canvas)] border border-[var(--hairline-soft)]"
    >
      <svg className="w-3 h-3 shrink-0 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="font-medium truncate text-[var(--ink)]" style={{ maxWidth: '100px' }}>
        {source.filename}
      </span>
      <span className="text-[var(--muted)]">P{source.page}</span>
      <span className="ml-auto font-medium tabular-nums" style={{ color: getSimilarityColor(source.similarity) }}>
        {similarityPercent}%
      </span>
    </motion.div>
  );
}

function StepItem({ step, isLast }: { step: ThinkingStep; isLast: boolean }) {
  const t = useTranslations('chat.thinking');
  const tSteps = useTranslations('steps');
  const hasSources = step.metadata?.sources && step.metadata.sources.length > 0;
  const hasQueryRewrite = step.metadata?.originalQuery && step.metadata?.rewrittenQuery &&
    step.metadata.originalQuery !== step.metadata.rewrittenQuery;

  return (
    <div className="relative">
      <div className="flex items-start gap-2">
        <div className="flex flex-col items-center pt-[3px]">
          <StepIcon status={step.status} />
          {!isLast && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: step.status === 'completed' ? 20 : 16 }}
              className="w-px mt-0.5"
              style={{ backgroundColor: 'var(--hairline-soft)' }}
            />
          )}
        </div>
        
        <div className="flex-1 min-w-0 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span 
              className="text-xs font-medium"
              style={{ 
                color: step.status === 'error' ? 'var(--error)' : 
                       step.status === 'active' ? 'var(--primary)' : 'var(--ink)' 
              }}
            >
              {tSteps(step.name)}
            </span>
            {step.duration !== undefined && step.status === 'completed' && (
              <span className="text-[10px] text-[var(--muted)] tabular-nums">{step.duration}ms</span>
            )}
            {step.metadata?.count !== undefined && step.status === 'completed' && (
              <span className="text-[10px] px-1 py-0.5 rounded bg-[var(--primary-subtle)] text-[var(--primary)] font-medium">
                +{step.metadata.count}
              </span>
            )}
          </div>

          <AnimatePresence>
            {hasQueryRewrite && step.status === 'completed' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1 p-1.5 rounded bg-[var(--canvas)] border border-[var(--hairline-soft)]"
              >
                <div className="text-[10px] space-y-0.5">
                  <div className="flex items-start gap-1.5">
                    <span className="text-[var(--muted)] shrink-0">{t('original')}:</span>
                    <span className="text-[var(--ink)]">{step.metadata!.originalQuery}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-[var(--primary)] shrink-0">{t('rewritten')}:</span>
                    <span className="text-[var(--primary)] font-medium">{step.metadata!.rewrittenQuery}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {hasSources && step.status === 'completed' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1 space-y-0.5"
              >
                {step.metadata!.sources!.slice(0, 3).map((source, index) => (
                  <DocumentPreview key={`${source.filename}-${source.page}`} source={source} index={index} />
                ))}
                {step.metadata!.sources!.length > 3 && (
                  <div className="text-[10px] text-[var(--muted)] pl-1">
                    +{step.metadata!.sources!.length - 3}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ steps }: { steps: ThinkingStep[] }) {
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progress = (completedCount / steps.length) * 100;
  const activeStep = steps.find(s => s.status === 'active');
  const hasError = steps.some(s => s.status === 'error');
  const isComplete = completedCount === steps.length;
  const tSteps = useTranslations('steps');
  const t = useTranslations('chat.thinking');

  const getStatusText = () => {
    if (hasError) return tSteps('error');
    if (isComplete) return tSteps('complete');
    if (activeStep) return tSteps(activeStep.name);
    return t('processing');
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <motion.div
        animate={{ rotate: activeStep ? 360 : 0 }}
        transition={{ duration: 2, repeat: activeStep ? Infinity : 0, ease: 'linear' }}
        className="shrink-0"
      >
        <svg className="w-3.5 h-3.5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </motion.div>
      <span className="text-xs font-medium text-[var(--ink)] truncate">
        {getStatusText()}
      </span>
      <span className="text-[10px] text-[var(--muted)] tabular-nums shrink-0">{completedCount}/{steps.length}</span>
      <div className="flex-1 h-1 bg-[var(--surface-card)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent-amber)] rounded-full"
        />
      </div>
    </div>
  );
}

const ThinkingProcess = memo(function ThinkingProcess({
  steps,
  isComplete,
  className = ''
}: ThinkingProcessProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const hasActive = steps.some(s => s.status === 'active');
    const hasError = steps.some(s => s.status === 'error');
    if (hasActive || hasError) {
      setIsExpanded(true);
    }
  }, [steps]);

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => setIsExpanded(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isComplete]);

  if (steps.length === 0) return null;

  const hasError = steps.some(s => s.status === 'error');

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border overflow-hidden ${
        hasError 
          ? 'border-[var(--error)]/30 bg-[var(--error-subtle)]' 
          : 'border-[var(--hairline)] bg-[var(--surface-soft)]'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[var(--surface-card)] transition-colors"
      >
        <ProgressBar steps={steps} />
        <motion.svg
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-3.5 h-3.5 text-[var(--muted)] shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 pt-1 border-t border-[var(--hairline)]">
              {steps.map((step, index) => (
                <StepItem key={step.id} step={step} isLast={index === steps.length - 1} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.steps === nextProps.steps &&
    prevProps.isComplete === nextProps.isComplete &&
    prevProps.className === nextProps.className
  );
});

export { ThinkingProcess };
