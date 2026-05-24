'use client';

import { useState, useCallback } from 'react';
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

function getInitialState(): {
  sessions: LocalSession[];
  currentSessionId: string | null;
  currentMessages: LocalMessage[];
} {
  const savedId = getCurrentSessionId();
  const allSessions = getSessions();

  if (savedId) {
    const session = getSession(savedId);
    if (session) {
      return {
        sessions: allSessions,
        currentSessionId: savedId,
        currentMessages: session.messages,
      };
    }
  }

  return {
    sessions: allSessions,
    currentSessionId: null,
    currentMessages: [],
  };
}

export function useSessions(): UseSessionsReturn {
  const [state, setState] = useState(getInitialState);

  const switchSession = useCallback((sessionId: string): LocalMessage[] => {
    const session = getSession(sessionId);
    if (session) {
      saveCurrentSessionId(sessionId);
      setState(prev => ({
        ...prev,
        currentSessionId: sessionId,
        currentMessages: session.messages,
      }));
      return session.messages;
    }
    clearCurrentSessionId();
    setState(prev => ({
      ...prev,
      currentSessionId: null,
      currentMessages: [],
    }));
    return [];
  }, []);

  const saveCurrentSession = useCallback((messages: LocalMessage[]) => {
    if (messages.length === 0) return;

    if (!state.currentSessionId) {
      const newSession = createSession();
      newSession.title = messages[0]?.content.slice(0, 30) || '新对话';
      newSession.messages = messages;
      newSession.updatedAt = Date.now();
      upsertSession(newSession);
      saveCurrentSessionId(newSession.id);
      setState(prev => ({
        sessions: getSessions(),
        currentSessionId: newSession.id,
        currentMessages: prev.currentMessages,
      }));
    } else {
      const session = getSession(state.currentSessionId);
      if (session) {
        session.messages = messages;
        session.updatedAt = Date.now();
        if (messages.length > 0 && session.title === '新对话') {
          session.title = messages[0].content.slice(0, 30);
        }
        upsertSession(session);
        setState(prev => ({
          ...prev,
          sessions: getSessions(),
        }));
      }
    }
  }, [state.currentSessionId]);

  const createNewSession = useCallback(() => {
    clearCurrentSessionId();
    setState(prev => ({
      ...prev,
      currentSessionId: null,
      currentMessages: [],
    }));
  }, []);

  const deleteSessionById = useCallback((sessionId: string) => {
    deleteSessionFromStorage(sessionId);
    const remaining = getSessions();
    setState(prev => ({
      ...prev,
      sessions: remaining,
    }));

    if (state.currentSessionId === sessionId) {
      createNewSession();
    }
  }, [state.currentSessionId, createNewSession]);

  return {
    sessions: state.sessions,
    currentSessionId: state.currentSessionId,
    currentMessages: state.currentMessages,
    isLoading: false,
    switchSession,
    saveCurrentSession,
    createNewSession,
    deleteSessionById,
  };
}
