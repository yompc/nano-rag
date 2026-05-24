'use client';

import { useState, useEffect } from 'react';
import type { LocalSession } from '@/lib/session-storage';

interface SessionSidebarProps {
  sessions: LocalSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function useRelativeTime(timestamp: number): string {
  const [relativeTime, setRelativeTime] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRelativeTime(formatRelativeTime(timestamp));
    
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp));
    }, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  if (!mounted) return '';
  return relativeTime;
}

function SessionItem({
  session,
  isSelected,
  onSelect,
  onDelete,
}: {
  session: LocalSession;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const relativeTime = useRelativeTime(session.updatedAt);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`w-full text-left p-3 cursor-pointer transition-colors bg-[var(--canvas)] hover:bg-[var(--surface-soft)] ${
        isSelected ? 'bg-[var(--surface-card)] border-l-4 border-[var(--primary)]' : 'border-l-4 border-transparent'
      }`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[var(--body-strong)] truncate">
            {session.title}
          </h3>
          <p className="text-xs text-[var(--muted-soft)] mt-0.5">
            {session.messages.length} 条消息 · {relativeTime}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-[var(--muted-soft)] hover:text-[var(--primary)] transition-colors rounded hover:bg-[var(--surface-soft)]"
          aria-label="删除"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionSidebarProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col h-full w-full md:w-56 lg:w-64 bg-[var(--canvas)] border-r border-[var(--hairline)]">
        <div className="flex items-center justify-between p-4 border-b border-[var(--hairline)]">
          <h2 className="text-lg font-semibold text-[var(--body-strong)]">
            历史对话
          </h2>
        </div>
        <div className="p-3 border-b border-[var(--hairline)]">
          <button
            type="button"
            onClick={onNewSession}
            className="btn-primary flex items-center justify-center gap-2 w-full"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新建对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-soft)] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[var(--muted-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--body)] mb-2">
              暂无历史对话
            </p>
            <p className="text-xs text-[var(--muted-soft)]">
              开始新对话后，历史记录将保存在这里
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full md:w-56 lg:w-64 bg-[var(--canvas)] border-r border-[var(--hairline)]">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--hairline)]">
        <h2 className="text-lg font-semibold text-[var(--body-strong)]">
          历史对话
        </h2>
      </div>

      {/* 新建会话按钮 */}
      <div className="p-3 border-b border-[var(--hairline)]">
        <button
          type="button"
          onClick={onNewSession}
          className="btn-primary flex items-center justify-center gap-2 w-full"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建对话
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-soft)] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[var(--muted-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--body)] mb-2">
              暂无历史对话
            </p>
            <p className="text-xs text-[var(--muted-soft)]">
              开始新对话后，历史记录将保存在这里
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--hairline)]">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isSelected={currentSessionId === session.id}
                onSelect={() => onSelectSession(session.id)}
                onDelete={() => onDeleteSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      {sessions.length > 0 && (
        <div className="p-3 border-t border-[var(--hairline)] text-center">
          <p className="text-xs text-[var(--muted-soft)]">
            共 {sessions.length} 个对话
          </p>
        </div>
      )}
    </div>
  );
}
