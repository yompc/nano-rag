'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChatMessage, type Message } from '@/components/chat-message';
import { type ThinkingStep } from '@/components/thinking-process';
import { DocumentSidebar } from '@/components/document-sidebar';
import { SessionSidebar } from '@/components/session-sidebar';
import { useSessions } from '@/hooks/use-sessions';
import { useMessagesHeights } from '@/hooks/use-message-height';
import { STEP_MAP } from '@/lib/constants';
import type { LocalMessage } from '@/lib/session-storage';

function convertLocalToMessage(messages: LocalMessage[]): Message[] {
  return messages.map((msg) => ({
    id: msg.id || crypto.randomUUID(),
    role: msg.role,
    content: msg.content,
    timestamp: new Date(msg.timestamp),
    sources: msg.sources,
    thinkingSteps: msg.thinkingSteps,
  }));
}

export default function HomePage() {
  const {
    sessions,
    currentSessionId,
    currentMessages,
    isLoading: sessionsLoading,
    switchSession,
    saveCurrentSession,
    createNewSession,
    deleteSessionById,
  } = useSessions();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(768);
  const [showLibraryBubble, setShowLibraryBubble] = useState(false);
  const thinkingStepsRef = useRef<ThinkingStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesLengthRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelectSession = useCallback((id: string) => {
    const newMessages = switchSession(id);
    setMessages(convertLocalToMessage(newMessages));
  }, [switchSession]);

  const handleNewSession = useCallback(() => {
    createNewSession();
    setMessages([]);
  }, [createNewSession]);

  // 删除会话并清空消息
  const handleDeleteSession = useCallback((sessionId: string) => {
    deleteSessionById(sessionId);
    // 如果删除的是当前会话，清空消息
    if (currentSessionId === sessionId) {
      setMessages([]);
    }
  }, [deleteSessionById, currentSessionId]);

  // 初始化：客户端 hydration 后读取 localStorage
  useEffect(() => {
    if (!isHydrated) {
      setMessages(convertLocalToMessage(currentMessages));
      setIsHydrated(true);
    }
  }, [isHydrated, currentMessages]);

  // 文档库气泡提示 - 首次进入时显示10秒
  useEffect(() => {
    if (isHydrated) {
      const hasSeenBubble = localStorage.getItem('hasSeenLibraryBubble');
      if (!hasSeenBubble) {
        setShowLibraryBubble(true);
        const timer = setTimeout(() => {
          setShowLibraryBubble(false);
          localStorage.setItem('hasSeenLibraryBubble', 'true');
        }, 10000);
        return () => clearTimeout(timer);
      }
    }
  }, [isHydrated]);

  // 消息变化时保存到 localStorage
  useEffect(() => {
    if (messages.length > 0 && !sessionsLoading && isHydrated) {
      // 将 Message 转换为 LocalMessage
      const localMessages: LocalMessage[] = messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : msg.timestamp,
        sources: msg.sources,
        thinkingSteps: msg.thinkingSteps,
      }));
      saveCurrentSession(localMessages);
    }
  }, [messages, sessionsLoading, saveCurrentSession, isHydrated]);

  useEffect(() => {
    if (messages.length !== messagesLengthRef.current) {
      messagesLengthRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    if (loading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  useEffect(() => {
    if (streamingContent) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [streamingContent]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width - 64);
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const messageHeights = useMessagesHeights(
    messages.map(m => ({ id: m.id, content: m.content })),
    containerWidth
  );

  const displayMessages = useMemo<Message[]>(() => {
    if (streamingMessageId && streamingContent) {
      return [
        ...messages,
        {
          id: streamingMessageId,
          role: 'assistant',
          content: streamingContent,
          timestamp: new Date(),
          thinkingSteps: thinkingSteps.length > 0 ? thinkingSteps : undefined,
        },
      ];
    }
    return messages;
  }, [messages, streamingContent, streamingMessageId, thinkingSteps]);

  const sendStreamingMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setTimeout(() => inputRef.current?.focus(), 0);
    console.log('[Chat] Loading set to true', { question: userMessage.content });
    setThinkingSteps([]);
    thinkingStepsRef.current = [];

    const assistantMessageId = `assistant-${Date.now()}`;
    setStreamingMessageId(assistantMessageId);
    setStreamingContent('');
    let streamingContent = '';

    try {
      // 准备历史消息用于上下文
      const historyMessages = messages.slice(-6).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          messages: historyMessages,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is null');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        console.log('[Chat] Stream read', { done, hasValue: !!value });
        if (done) {
          console.log('[Chat] Stream done');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              switch (currentEvent) {
                case 'status': {
                  const stepInfo = STEP_MAP[data.step];
                  if (stepInfo) {
                    setThinkingSteps((prev) => {
                      const existing = prev.find(s => s.id === stepInfo.id);
                      let newSteps: ThinkingStep[];
                      if (existing) {
                        newSteps = prev.map(s =>
                          s.id === stepInfo.id
                            ? { ...s, status: 'completed', duration: data.metadata?.duration }
                            : s
                        );
                      } else {
                        newSteps = [...prev, {
                          id: stepInfo.id,
                          name: stepInfo.name,
                          description: data.message,
                          status: 'active',
                          metadata: data.metadata,
                        }];
                      }
                      thinkingStepsRef.current = newSteps;
                      return newSteps;
                    });
                  }
                  break;
                }

                case 'chunk': {
                  streamingContent += data.content;
                  setStreamingContent(streamingContent);
                  break;
                }

                case 'sources': {
                  setThinkingSteps((prev) => {
                    const newSteps = prev.map(s =>
                      s.id === 'retrieve'
                        ? {
                            ...s,
                            metadata: {
                              ...s.metadata,
                              count: data.count,
                              sources: data.sources.map((src: { filename: string; page: number; similarity: number }) => ({
                                filename: src.filename,
                                page: src.page,
                                similarity: src.similarity,
                              })),
                            }
                          }
                        : s
                    );
                    thinkingStepsRef.current = newSteps;
                    return newSteps;
                  });
                  break;
                }

                case 'retry': {
                  streamingContent = '';
                  setStreamingContent('');
                  const retryCount = data.retryCount ?? Date.now();
                  setThinkingSteps((prev) => {
                    const newSteps = [
                      ...prev,
                      {
                        id: `retry-${retryCount}`,
                        name: `重新生成 (第${retryCount}次)`,
                        description: data.reason || '检测到问题，正在重新生成',
                        status: 'active' as const,
                      },
                    ];
                    thinkingStepsRef.current = newSteps;
                    return newSteps;
                  });
                  break;
                }

                case 'thinking': {
                  const { step, content, metadata } = data;
                  if (!step) break;
                  const stepInfo = STEP_MAP[step];
                  setThinkingSteps((prev) => {
                    const existingIndex = prev.findIndex(s => s.id === step);
                    if (existingIndex >= 0) {
                      const newSteps = [...prev];
                      newSteps[existingIndex] = {
                        ...newSteps[existingIndex],
                        description: content,
                        metadata: {
                          ...newSteps[existingIndex].metadata,
                          originalQuery: metadata?.query,
                          rewrittenQuery: metadata?.query,
                        },
                        status: 'completed'
                      };
                      thinkingStepsRef.current = newSteps;
                      return newSteps;
                    }
                    const newSteps = [...prev, {
                      id: step,
                      name: stepInfo?.name || step,
                      description: content,
                      metadata: {
                        originalQuery: metadata?.query,
                        rewrittenQuery: metadata?.query,
                      },
                      status: 'completed' as const
                    }];
                    thinkingStepsRef.current = newSteps;
                    return newSteps;
                  });
                  break;
                }

                case 'quality_check': {
                  if (data.fixedAnswer) {
                    streamingContent = data.fixedAnswer;
                    setStreamingContent(data.fixedAnswer);
                  }
                  break;
                }

                case 'error': {
                  throw new Error(data.message);
                }

                case 'done': {
                  console.log('[Chat] Received done event', { 
                    timestamp: new Date().toISOString(),
                    data 
                  });
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: streamingMessageId!,
                      role: 'assistant',
                      content: streamingContent,
                      timestamp: new Date(),
                      thinkingSteps: thinkingStepsRef.current,
                    },
                  ]);
                  setStreamingMessageId(null);
                  setStreamingContent('');
                  setThinkingSteps((prev) => {
                    const completedSteps = prev.map(s => ({ ...s, status: 'completed' as const }));
                    thinkingStepsRef.current = completedSteps;
                    return completedSteps;
                  });
                  setLoading(false);
                  console.log('[Chat] Loading set to false after done event');
                  break;
                }
              }
            } catch {
              console.error('Failed to parse event data');
            }
            currentEvent = '';
          }
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error ? error.message : '发生错误，请重试',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setThinkingSteps((prev) =>
        prev.map(s => ({ ...s, status: 'error' as const }))
      );
    } finally {
      setLoading(false);
      console.log('[Chat] Loading set to false in finally block');
      const completedSteps = thinkingStepsRef.current.map(s => ({ ...s, status: 'completed' as const }));
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg?.role === 'assistant' && completedSteps.length > 0) {
          return [...prev.slice(0, -1), { ...lastMsg, thinkingSteps: completedSteps }];
        }
        return prev;
      });
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) {
        sendStreamingMessage();
      }
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex h-screen bg-[var(--canvas)]">
      <div className="hidden md:block">
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 md:ml-0" ref={containerRef}>
        {/* 顶部导航栏 */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--hairline)] bg-[var(--canvas)]">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Nano RAG" className="w-8 h-8" />
            <span className="font-display font-semibold text-base md:text-lg text-[var(--ink)]">Nano RAG</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/upload"
              className="p-2 rounded-full hover:bg-[var(--surface-soft)] transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--muted-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-full hover:bg-[var(--surface-soft)] transition-colors relative"
              aria-label="打开文档库"
            >
              <svg className="w-5 h-5 text-[var(--muted-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {showLibraryBubble && (
                <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[var(--ink)] text-white text-sm px-3 py-1.5 rounded-lg shadow-lg animate-bounce-in">
                  文档库
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[var(--ink)] rotate-45" />
                </span>
              )}
            </button>
          </div>
        </header>

        {/* 主内容区 */}
        <div className="flex-1 overflow-y-auto bg-[var(--canvas)]">
          <div className="max-w-3xl mx-auto">
            {!hasMessages ? (
              /* 空状态 - 居中大输入框 */
              <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] px-4">
                <img src="/logo.svg" alt="Nano RAG" className="w-16 h-16 mb-6" />
                <h1 className="text-xl md:text-2xl font-semibold text-[var(--ink)] mb-2">
                  有什么可以帮你的？
                </h1>
                <p className="text-sm text-[var(--muted-soft)] mb-8">
                  基于文档的智能问答系统
                </p>

                {/* 大输入框 */}
                <div className="w-full max-w-2xl">
                  <div className="relative">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="输入你的问题..."
                      rows={3}
                      className="input-textarea w-full px-6 py-4 pr-14 rounded-3xl"
                    />
                    <button
                      type="button"
                      onClick={sendStreamingMessage}
                      disabled={loading || !input.trim()}
                      className="btn-primary absolute right-3 bottom-3 w-10 h-10 !p-0 rounded-full flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95"
                    >
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-center text-[var(--muted-soft)] mt-3">
                    按 Enter 发送，Shift + Enter 换行
                  </p>
                </div>
              </div>
            ) : (
              /* 有消息时的聊天界面 */
              <div className="px-4 py-6">
                <AnimatePresence>
                  {displayMessages.map((message, index) => {
                    const isCurrentStreaming = loading && 
                      index === displayMessages.length - 1 && 
                      message.role === 'assistant' &&
                      message.id === streamingMessageId;
                    
                    const height = messageHeights.get(message.id);
                    
                    return (
                      <div 
                        key={message.id || `message-${index}`}
                        style={{ minHeight: height || undefined }}
                      >
                        <ChatMessage
                          message={message}
                          isStreaming={isCurrentStreaming}
                        />
                      </div>
                    );
                  })}

                  {loading && displayMessages[displayMessages.length - 1]?.role === 'user' && (
                    <div className="flex items-center gap-2 mt-4">
                      <div className="flex gap-1">
<div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse animation-delay-200" />
                  <div className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse animation-delay-400" />
                      </div>
                      <span className="text-sm text-[var(--muted-soft)]">
                        AI 正在思考...
                      </span>
                    </div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* 底部输入框 - 有消息时显示 */}
        {hasMessages && (
          <div className="border-t border-[var(--hairline)] bg-[var(--surface-soft)] px-4 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={loading ? "AI 正在思考..." : "输入你的问题..."}
                    rows={1}
                    className="input-textarea w-full px-5 py-3 rounded-[24px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={sendStreamingMessage}
                  disabled={loading || !input.trim()}
                  className="btn-primary !p-3 rounded-[24px] flex-shrink-0 flex items-center justify-center transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-center text-[var(--muted-soft)] mt-2">
                按 Enter 发送，Shift + Enter 换行
              </p>
            </div>
          </div>
        )}

        {/* 文档侧边栏 */}
        <DocumentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
    </div>
  );
}
