'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, memo } from 'react';

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
  if (similarity >= 0.8) return '#10b981';
  if (similarity >= 0.6) return '#f59e0b';
  return '#9ca3af';
}

function StepIcon({ status }: { status: ThinkingStep['status'] }) {
  switch (status) {
    case 'completed':
      return (
        <motion.svg
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-3.5 h-3.5"
          style={{ color: '#10b981' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </motion.svg>
      );
    case 'active':
      return (
        <motion.svg
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-3.5 h-3.5"
          style={{ color: 'var(--primary)' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </motion.svg>
      );
    case 'error':
      return (
        <svg className="w-3.5 h-3.5" style={{ color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="错误">
          <title>错误</title>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    default:
      return (
        <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: 'var(--muted)' }} />
      );
  }
}

function DocumentPreview({ source, index }: { source: SourceWithSimilarity; index: number }) {
  const similarityPercent = Math.round(source.similarity * 100);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-1.5 py-1 px-1.5 rounded text-[10px]"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <svg className="w-3 h-3 shrink-0" style={{ color: 'var(--muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-label="文档">
        <title>文档</title>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="font-medium truncate" style={{ color: 'var(--foreground)' }}>
        {source.filename}
      </span>
      <span style={{ color: 'var(--muted)' }}>第{source.page}页</span>
      <span 
        className="ml-auto font-medium"
        style={{ color: getSimilarityColor(source.similarity) }}
      >
        {similarityPercent}%
      </span>
    </motion.div>
  );
}

function StepItem({ step, isExpanded }: { step: ThinkingStep; isExpanded: boolean }) {
  const hasSources = step.metadata?.sources && step.metadata.sources.length > 0;
  const hasQueryRewrite = step.metadata?.originalQuery && step.metadata?.rewrittenQuery && 
    step.metadata.originalQuery !== step.metadata.rewrittenQuery;

  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-1"
    >
      <div className="flex items-center gap-1.5">
        <StepIcon status={step.status} />
        <span 
          className="font-medium text-xs"
          style={{ color: step.status === 'error' ? '#ef4444' : 'var(--foreground)' }}
        >
          {step.name}
        </span>
        {step.duration !== undefined && (
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
            ({step.duration}ms)
          </span>
        )}
        {step.metadata?.count !== undefined && step.status === 'completed' && (
          <span className="text-[10px]" style={{ color: 'var(--primary)' }}>
            - 找到 {step.metadata.count} 篇
          </span>
        )}
      </div>

      {step.description && step.status === 'active' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] mt-0.5 ml-5"
          style={{ color: 'var(--muted)' }}
        >
          {step.description}
        </motion.p>
      )}

      <AnimatePresence>
        {isExpanded && hasQueryRewrite && step.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-5 mt-1 space-y-0.5"
          >
            <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
              <span>原始: </span>
              <span style={{ color: 'var(--foreground)' }}>{step.metadata!.originalQuery}</span>
            </div>
            <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
              <span>改写: </span>
              <span style={{ color: 'var(--primary)' }}>{step.metadata!.rewrittenQuery}</span>
            </div>
          </motion.div>
        )}

        {isExpanded && hasSources && step.status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-5 mt-1 space-y-0.5"
          >
            {step.metadata!.sources!.map((source, index) => (
              <DocumentPreview key={`${source.filename}-${source.page}`} source={source} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const ThinkingProcess = memo(function ThinkingProcess({ 
  steps, 
  isComplete, 
  className = '' 
}: ThinkingProcessProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (steps.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--glass-bg)',
        borderColor: 'var(--border)',
      }}
    >
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 flex items-center justify-between transition-colors hover:opacity-80"
        style={{ backgroundColor: 'var(--secondary)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🧠</span>
          <span className="font-medium text-xs" style={{ color: 'var(--foreground)' }}>
            思考过程
          </span>
          {isComplete && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#10b981', color: 'white' }}
            >
              完成
            </motion.span>
          )}
        </div>
        <motion.svg
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-3.5 h-3.5"
          style={{ color: 'var(--muted)' }}
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
            transition={{ duration: 0.2 }}
            className="px-3 overflow-hidden"
            style={{ backgroundColor: 'var(--background)' }}
          >
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {steps.map((step) => (
                <StepItem key={step.id} step={step} isExpanded={isExpanded} />
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
