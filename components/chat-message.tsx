'use client';

import { motion } from 'framer-motion';
import { memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ThinkingProcess, type ThinkingStep } from './thinking-process';

/**
 * 检测消息是否为"无法回答"类型
 * @param content 消息内容
 * @returns 是否是无法回答类型
 */
function isUnableToAnswer(content: string): boolean {
  const patterns = [
    '无法回答',
    '抱歉',
    '没有找到',
    '未找到相关',
    '根据提供的资料，无法',
    '未能找到',
    '没有相关信息',
    '无法提供答案',
  ];
  return patterns.some(pattern => content.includes(pattern));
}

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
                  className="px-1.5 py-0.5 rounded text-sm font-mono bg-[var(--surface-dark)] text-[var(--on-dark)]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className={`${className} font-mono`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre
              className="rounded-lg p-4 overflow-x-auto text-sm my-2 bg-[var(--surface-dark)] text-[var(--on-dark)] font-mono"
            >
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80 text-[var(--primary)]"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="font-display text-2xl font-semibold mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="font-display text-xl font-semibold mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="font-display text-lg font-semibold mt-3 mb-1">{children}</h3>,
          h4: ({ children }) => <h4 className="font-display text-base font-semibold mt-2 mb-1">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc pl-6 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 my-2">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 pl-4 my-2 italic border-[var(--primary)] text-[var(--muted)]">
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

const ChatMessage = memo(function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === 'user';
  const hasSources = message.sources && message.sources.length > 0;
  const hasThinking = message.thinkingSteps && message.thinkingSteps.length > 0;
  const skipEntrance = isStreaming && !isUser;
  const unableToAnswer = !isUser && !isStreaming && isUnableToAnswer(message.content);

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
          className="max-w-[80%] mb-2"
        >
          <ThinkingProcess 
            steps={message.thinkingSteps!} 
            isComplete={!isStreaming} 
          />
        </motion.div>
      )}

      <motion.div
        className={`rounded-lg max-w-[80%] ${
          isUser
            ? 'bg-[var(--primary)] text-white px-4 py-3'
            : unableToAnswer
              ? 'bg-[var(--surface-card)] text-[var(--ink)] overflow-hidden'
              : 'bg-[var(--surface-card)] text-[var(--ink)] px-4 py-3'
        }`}
      >
        {unableToAnswer && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="mb-0"
          >
            <div className="px-5 py-4 bg-gradient-to-r from-[var(--surface-soft)] via-[var(--surface-cream-strong)]/30 to-[var(--surface-soft)] border-b border-[var(--hairline-soft)]">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--canvas)] border border-[var(--hairline)] flex items-center justify-center shadow-sm">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="w-5 h-5 text-[var(--muted)]" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    aria-label="搜索图标"
                  >
                    <title>搜索图标</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--ink)] tracking-tight">
                    未找到相关文档
                  </h4>
                  <p className="text-xs text-[var(--muted)] mt-0.5">
                    当前文档库中暂无匹配内容
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div className={`text-base leading-relaxed ${unableToAnswer ? 'px-5 pt-4 pb-3' : ''}`}>
          <TypewriterText text={message.content} isStreaming={isStreaming && !isUser} />
        </div>
        
        {unableToAnswer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="px-5 pb-5"
          >
            <div className="mt-3 p-4 rounded-xl bg-[var(--canvas)] border border-[var(--hairline-soft)]">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--accent-amber)]/10 flex items-center justify-center">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="w-4 h-4 text-[var(--accent-amber)]" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                    aria-label="灯泡图标"
                  >
                    <title>灯泡图标</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--body-strong)] mb-2">
                    建议尝试
                  </p>
                  <ul className="space-y-1.5 text-xs text-[var(--body)]">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1 h-1 rounded-full bg-[var(--muted)] mt-1.5" />
                      <span>上传相关文档到文档库</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1 h-1 rounded-full bg-[var(--muted)] mt-1.5" />
                      <span>使用更具体的关键词或专业术语</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-1 h-1 rounded-full bg-[var(--muted)] mt-1.5" />
                      <span>尝试更通用的描述方式</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}

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
              className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80 text-[var(--primary)]"
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
                    className="rounded-lg p-2.5 text-xs bg-[var(--surface-soft)] border border-[var(--hairline)] text-[var(--ink)]"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[var(--primary)]">
                        {source.filename}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        第 {source.page} 页
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[var(--muted)]">
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
}, (prevProps, nextProps) => {
  // 只在关键属性变化时重新渲染
  return (
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.thinkingSteps === nextProps.message.thinkingSteps &&
    prevProps.isStreaming === nextProps.isStreaming
  );
});

export { ChatMessage };
