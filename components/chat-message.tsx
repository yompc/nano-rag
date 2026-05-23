'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ThinkingProcess, type ThinkingStep } from './thinking-process';

export interface Source {
  filename: string;
  page: number;
  content: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  thinkingSteps?: ThinkingStep[];
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

function TypewriterText({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded text-sm font-mono"
                  style={{ backgroundColor: 'var(--secondary)' }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre
              className="rounded-lg p-4 overflow-x-auto text-sm my-2"
              style={{ backgroundColor: 'var(--secondary)' }}
            >
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80"
              style={{ color: 'var(--primary)' }}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-6 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 my-2">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote
              className="border-l-4 pl-4 my-2 italic"
              style={{ borderColor: 'var(--primary)', color: 'var(--muted)' }}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
      {isStreaming && <span className="cursor-blink">▌</span>}
    </div>
  );
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';
  const hasSources = message.sources && message.sources.length > 0;
  const hasThinking = message.thinkingSteps && message.thinkingSteps.length > 0;
  const skipEntrance = isStreaming && !isUser;

  return (
    <motion.div
      initial={skipEntrance ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`}
    >
      {hasThinking && !isUser && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[80%] w-full mb-2"
        >
          <ThinkingProcess 
            steps={message.thinkingSteps!} 
            isComplete={!isStreaming} 
          />
        </motion.div>
      )}

      <motion.div
        className={`max-w-[80%] ${
          isUser
            ? 'rounded-[20px] px-4 py-3 text-white'
            : 'rounded-[20px] px-4 py-3'
        }`}
        style={{
          backgroundColor: isUser ? 'var(--user-bubble)' : 'var(--assistant-bubble)',
          color: isUser ? 'var(--user-text)' : 'var(--assistant-text)',
        }}
      >
        <div className="text-base leading-relaxed">
          <TypewriterText text={message.content} isStreaming={isStreaming && !isUser} />
        </div>

        {hasSources && !isUser && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.2 }}
            className="mt-3"
          >
            <button
              type="button"
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--primary)' }}
            >
              <motion.svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                animate={{ rotate: showSources ? 90 : 0 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </motion.svg>
              来源 ({message.sources!.length})
            </button>

            {showSources && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 space-y-2"
              >
                {message.sources!.map((source, index) => (
                  <motion.div
                    key={`${source.filename}-${source.page}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-lg p-2.5 text-xs"
                    style={{
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium" style={{ color: 'var(--primary)' }}>
                        {source.filename}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>
                        第 {source.page} 页
                      </span>
                    </div>
                    <p className="line-clamp-2" style={{ color: 'var(--muted)' }}>
                      {source.content}
                    </p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
