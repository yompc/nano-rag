'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getSessions,
  getSession,
  createSession,
  upsertSession,
  deleteSessionFromStorage,
  getCurrentSessionId,
  saveCurrentSessionId,
  clearCurrentSessionId,
  type LocalSession,
  type LocalMessage,
} from '@/lib/session-storage';

interface UseSessionsReturn {
  sessions: LocalSession[];
  currentSessionId: string | null;
  currentMessages: LocalMessage[];
  isLoading: boolean;
  switchSession: (sessionId: string) => LocalMessage[];
  saveCurrentSession: (messages: LocalMessage[]) => void;
  createNewSession: () => void;
  deleteSessionById: (sessionId: string) => void;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<LocalSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从 localStorage 加载
  useEffect(() => {
    const savedId = getCurrentSessionId();
    const allSessions = getSessions();
    setSessions(allSessions);

    if (savedId) {
      const session = getSession(savedId);
      if (session) {
        setCurrentSessionId(savedId);
        setCurrentMessages(session.messages);
      }
    }
    setIsLoading(false);
  }, []);

  // 切换会话 - 返回新会话的消息
  const switchSession = useCallback((sessionId: string): LocalMessage[] => {
    const session = getSession(sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setCurrentMessages(session.messages);
      saveCurrentSessionId(sessionId);
      return session.messages;
    } else {
      // 如果找不到会话，创建新的空会话
      setCurrentSessionId(null);
      setCurrentMessages([]);
      clearCurrentSessionId();
      return [];
    }
  }, []);

  // 保存当前会话（消息变化时调用）
  const saveCurrentSession = useCallback((messages: LocalMessage[]) => {
    if (messages.length === 0) return;

    if (!currentSessionId) {
      // 新会话：创建并保存
      const newSession = createSession();
      newSession.title = messages[0]?.content.slice(0, 30) || '新对话';
      newSession.messages = messages;
      newSession.updatedAt = Date.now();
      upsertSession(newSession);
      setCurrentSessionId(newSession.id);
      saveCurrentSessionId(newSession.id);
      setSessions(getSessions());
    } else {
      // 更新现有会话
      const session = getSession(currentSessionId);
      if (session) {
        session.messages = messages;
        session.updatedAt = Date.now();
        if (messages.length > 0 && session.title === '新对话') {
          session.title = messages[0].content.slice(0, 30);
        }
        upsertSession(session);
        setSessions(getSessions());
      }
    }
  }, [currentSessionId]);

  // 创建新会话
  const createNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setCurrentMessages([]);
    clearCurrentSessionId();
  }, []);

  // 删除会话
  const deleteSessionById = useCallback((sessionId: string) => {
    deleteSessionFromStorage(sessionId);
    const remaining = getSessions();
    setSessions(remaining);

    if (currentSessionId === sessionId) {
      createNewSession();
    }
  }, [currentSessionId, createNewSession]);

  return {
    sessions,
    currentSessionId,
    currentMessages,
    isLoading,
    switchSession,
    saveCurrentSession,
    createNewSession,
    deleteSessionById,
  };
}
