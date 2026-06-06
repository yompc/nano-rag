'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ChatMessage, type Message } from '@/components/chat-message';
import { type ThinkingStep } from '@/components/thinking-process';
import { DocumentSidebar } from '@/components/document-sidebar';
import { SessionSidebar } from '@/components/session-sidebar';
import { AppShell } from '@/components/app-shell';
import { OnboardingCard } from '@/components/onboarding-card';
import { useSessions } from '@/hooks/use-sessions';
import { useMessagesHeights } from '@/hooks/use-message-height';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { STEP_METADATA } from '@/lib/constants';
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
  const t = useTranslations('home');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const tChat = useTranslations('chat');
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
  const [historySidebarOpen, setHistorySidebarOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(768);
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

  useKeyboardShortcuts({
    newChat: handleNewSession,
    upload: () => { window.location.href = '/upload'; },
    library: () => { window.location.href = '/library'; },
  });

  const handleDeleteSession = useCallback((sessionId: string) => {
    deleteSessionById(sessionId);
    if (currentSessionId === sessionId) {
      setMessages([]);
    }
  }, [deleteSessionById, currentSessionId]);

  useEffect(() => {
    if (!isHydrated) {
      setMessages(convertLocalToMessage(currentMessages));
      setIsHydrated(true);
    }
  }, [isHydrated, currentMessages]);

  useEffect(() => {
    if (messages.length > 0 && !sessionsLoading && isHydrated) {
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
    setThinkingSteps([]);
    thinkingStepsRef.current = [];

    const assistantMessageId = `assistant-${Date.now()}`;
    setStreamingMessageId(assistantMessageId);
    setStreamingContent('');
    let streamingContent = '';
    let collectedSources: { filename: string; page: number; content: string }[] = [];

    try {
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
        if (done) break;

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
                  const stepMeta = STEP_METADATA[data.step];
                  if (stepMeta) {
                    setThinkingSteps((prev) => {
                      const existing = prev.find(s => s.id === stepMeta.id);
                      let newSteps: ThinkingStep[];
                      if (existing) {
                        newSteps = prev.map(s =>
                          s.id === stepMeta.id
                            ? { ...s, status: 'completed', duration: data.metadata?.duration }
                            : s
                        );
                      } else {
                        newSteps = [...prev, {
                          id: stepMeta.id,
                          name: stepMeta.id,
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
                  collectedSources = data.sources.map((src: { filename: string; page: number; preview: string }) => ({
                    filename: src.filename,
                    page: src.page,
                    content: src.preview,
                  }));

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
                        name: 'retry',
                        description: data.reason || tChat('retry.reason'),
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
                      name: step,
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
                  const errorCode = data.code || data.message;
                  let errorMessage: string;
                  try {
                    errorMessage = tErrors(errorCode);
                  } catch {
                    errorMessage = data.message || tCommon('error');
                  }
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantMessageId!,
                      role: 'assistant',
                      content: errorMessage,
                      timestamp: new Date(),
                      thinkingSteps: thinkingStepsRef.current,
                    },
                  ]);
                  setStreamingMessageId(null);
                  setStreamingContent('');
                  setLoading(false);
                  return;
                }

                case 'done': {
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: assistantMessageId!,
                      role: 'assistant',
                      content: streamingContent,
                      sources: collectedSources.length > 0 ? collectedSources : undefined,
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
                  break;
                }
              }
            } catch (parseError) {
              if (dataStr.trim()) {
                console.error('Failed to parse event data:', dataStr.substring(0, 100), parseError);
              }
            }
            currentEvent = '';
          }
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error ? error.message : tCommon('error'),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setThinkingSteps((prev) =>
        prev.map(s => ({ ...s, status: 'error' as const }))
      );
    } finally {
      setLoading(false);
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
    <AppShell hideMobileMenu>
      <div className="flex flex-1 min-h-0 bg-[var(--canvas)]">
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          isOpen={historySidebarOpen}
          onClose={() => setHistorySidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col min-w-0" ref={containerRef}>
          {/* Mobile session toggle button (stays inside page content) */}
          <div className="md:hidden flex items-center px-4 py-2 border-b border-[var(--hairline)] bg-[var(--canvas)]">
            <button
              type="button"
              onClick={() => setHistorySidebarOpen(true)}
              className="p-2 rounded-full hover:bg-[var(--surface-soft)] transition-colors"
              aria-label={t('openHistory')}
            >
              <svg className="w-5 h-5 text-[var(--muted-soft)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-[var(--canvas)]">
            <div className="max-w-3xl mx-auto">
              {!hasMessages ? (
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4 py-8 overflow-y-auto">
                  <img src="/logo.svg" alt="Nano RAG" className="w-16 h-16 mb-6" />
                  <h1 className="text-xl md:text-2xl font-semibold text-[var(--ink)] mb-2">
                    {t('title')}
                  </h1>
                  <p className="text-sm text-[var(--muted-soft)] mb-8">
                    {t('subtitle')}
                  </p>

                  <div className="w-full max-w-2xl mb-6">
                    <OnboardingCard />
                  </div>

                  <div className="w-full max-w-2xl">
                    <div className="relative">
                      <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('placeholder')}
                        rows={3}
                        className="input-textarea w-full px-6 py-4 pr-14 rounded-2xl shadow-sm focus:shadow-md transition-shadow duration-200"
                      />
                      <button
                        type="button"
                        onClick={sendStreamingMessage}
                        disabled={loading || !input.trim()}
                        className="btn-primary absolute right-3 bottom-3 w-10 h-10 !p-0 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 disabled:hover:scale-100"
                        aria-label={tCommon('submit')}
                      >
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-center text-[var(--muted)] mt-3">
                      {t('sendHint')}
                    </p>
                  </div>
                </div>
              ) : (
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
                          {t('thinking')}
                        </span>
                      </div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

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
                      placeholder={loading ? t('thinking') : t('placeholder')}
                      rows={1}
                      className="input-textarea w-full px-5 py-3.5 rounded-2xl shadow-sm focus:shadow-md transition-shadow duration-200"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={sendStreamingMessage}
                    disabled={loading || !input.trim()}
                    className="btn-primary !p-3 rounded-[24px] flex-shrink-0 flex items-center justify-center transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
                    aria-label={tCommon('submit')}
                  >
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-center text-[var(--muted-soft)] mt-2">
                  {t('sendHint')}
                </p>
              </div>
            </div>
          )}

          <DocumentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        </div>
      </div>
    </AppShell>
  );
}
