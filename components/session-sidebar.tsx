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

  useEffect(() => {
    setRelativeTime(formatRelativeTime(timestamp));
    
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp));
    }, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

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
    <button
      type="button"
      className={`w-full text-left p-3 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
        isSelected ? 'bg-zinc-100 dark:bg-zinc-800' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-white truncate">
            {session.title}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {session.messages.length} 条消息 · {relativeTime}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="删除"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </button>
  );
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
}: SessionSidebarProps) {
  return (
    <div className="flex flex-col h-full w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          历史对话
        </h2>
      </div>

      {/* 新建会话按钮 */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={onNewSession}
          className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-[#007AFF] dark:bg-[#0A84FF] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建对话
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              暂无历史对话
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              开始新对话后，历史记录将保存在这里
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
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
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            共 {sessions.length} 个对话
          </p>
        </div>
      )}
    </div>
  );
}
