'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChatMessage, type Message } from '@/components/chat-message';
import { type ThinkingStep } from '@/components/thinking-process';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const thinkingStepsRef = useRef<ThinkingStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesLengthRef = useRef(0);

  useEffect(() => {
    if (messages.length !== messagesLengthRef.current) {
      messagesLengthRef.current = messages.length;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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
    setThinkingSteps([]);
    thinkingStepsRef.current = [];

    const assistantMessageId = `assistant-${Date.now()}`;
    let streamingContent = '';

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          sessionId,
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
                    const stepMap: Record<string, { id: string; name: string }> = {
                      'relevance_check': { id: 'relevance_check', name: '分析问题' },
                      'rewrite': { id: 'rewrite', name: '改写查询' },
                      'retrieve': { id: 'retrieve', name: '检索文档' },
                      'generate': { id: 'generate', name: '生成回答' },
                      'check': { id: 'check', name: '验证回答' },
                      'quality_check': { id: 'quality_check', name: '质量检测' },
                      'complete': { id: 'complete', name: '完成' },
                    };
                  
                  const stepInfo = stepMap[data.step];
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
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg?.role === 'assistant') {
                      return [...prev.slice(0, -1), { ...lastMsg, content: streamingContent }];
                    }
                    return [...prev, {
                      id: assistantMessageId,
                      role: 'assistant',
                      content: streamingContent,
                      timestamp: new Date(),
                    }];
                  });
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
                              sources: data.sources.map((src: any) => ({
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
                  // 重试时清除之前的流式内容，但保留消息占位符
                  streamingContent = '';
                  // 不删除消息，让新的 chunk 事件更新内容
                  break;
                }

                case 'quality_check': {
                  if (data.fixedAnswer) {
                    streamingContent = data.fixedAnswer;
                    setMessages((prev) => {
                      const lastMsg = prev[prev.length - 1];
                      if (lastMsg?.role === 'assistant') {
                        return [...prev.slice(0, -1), { ...lastMsg, content: data.fixedAnswer }];
                      }
                      return prev;
                    });
                  }
                  break;
                }
                
                case 'error': {
                  throw new Error(data.message);
                }
                
                case 'done': {
                  if (data.sessionId && !sessionId) {
                    setSessionId(data.sessionId);
                  }
                  setThinkingSteps((prev) => {
                    const completedSteps = prev.map(s => ({ ...s, status: 'completed' as const }));
                    thinkingStepsRef.current = completedSteps;
                    return completedSteps;
                  });
                  // 立即清除 loading 状态，避免等待流关闭
                  setLoading(false);
                  break;
                }
              }
            } catch (e) {
              console.error('Failed to parse event data:', e);
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

  const sendMessageFallback = async () => {
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          sessionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: error instanceof Error ? error.message : '发生错误，请重试',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
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

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b px-6 py-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--glass-bg)' }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="返回首页"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <title>返回</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-label="聊天图标"
              >
                <title>聊天图标</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: 'var(--foreground)' }}>
                RAG 助手
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                基于文档的智能问答系统
              </p>
            </div>
          </div>
          <Link
            href="/library"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            文档库
          </Link>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center h-[60vh] text-center"
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--secondary)' }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-10 h-10"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    style={{ color: 'var(--primary)' }}
                    aria-label="对话气泡图标"
                  >
                    <title>对话气泡图标</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                  开始对话
                </h2>
                <p className="text-base max-w-md" style={{ color: 'var(--muted)' }}>
                  上传文档后，向AI助手提问，获取基于文档内容的智能回答
                </p>
              </motion.div>
            )}

            {messages.map((message, index) => {
              const isCurrentStreaming = loading && index === messages.length - 1 && message.role === 'assistant';
              const displayMessage = isCurrentStreaming
                ? { ...message, thinkingSteps: thinkingSteps.length > 0 ? thinkingSteps : message.thinkingSteps }
                : message;
              return (
                <ChatMessage
                  key={message.id}
                  message={displayMessage}
                  isStreaming={isCurrentStreaming}
                />
              );
            })}

            {loading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 mt-4"
              >
                <div className="flex gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--primary)' }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--primary)' }}
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--primary)' }}
                  />
                </div>
                <span className="text-sm" style={{ color: 'var(--muted)' }}>
                  AI 正在思考...
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-t px-6 py-4"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={loading ? "AI 正在思考,请稍候..." : "输入您的问题..."}
                rows={1}
                className="w-full px-5 py-3 rounded-[24px] border resize-none focus:outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: 'var(--secondary)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              />
            </div>
            <motion.button
              type="button"
              onClick={sendStreamingMessage}
              disabled={loading || !input.trim()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 rounded-[24px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'white',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-label="发送"
              >
                <title>发送</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </motion.button>
          </div>
          <p className="text-xs mt-2 text-center" style={{ color: 'var(--muted)' }}>
            按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </motion.div>
    </div>
  );
}
