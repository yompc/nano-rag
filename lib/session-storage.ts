/**
 * localStorage Session Management Utility
 * Store chat history in browser local storage
 */

const STORAGE_KEYS = {
  SESSIONS: 'chat_sessions',
  CURRENT_SESSION_ID: 'chat_current_session_id',
};

export interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // Use timestamp instead of Date object for easier serialization
  sources?: Array<{
    filename: string;
    page: number;
    content: string;
  }>;
  thinkingSteps?: Array<{
    id: string;
    name: string;
    description?: string;
    status: 'pending' | 'active' | 'completed' | 'error';
    duration?: number;
    metadata?: {
      count?: number;
      sources?: Array<{
        filename: string;
        page: number;
        similarity: number;
      }>;
      originalQuery?: string;
      rewrittenQuery?: string;
    };
  }>;
}

export interface LocalSession {
  id: string;
  title: string;
  messages: LocalMessage[];
  createdAt: number;
  updatedAt: number;
}

/**
 * Get all sessions
 */
export function getSessions(): LocalSession[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  return data ? JSON.parse(data) : [];
}

/**
 * Save all sessions
 */
export function saveSessions(sessions: LocalSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

/**
 * Get current session ID
 */
export function getCurrentSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
}

/**
 * Save current session ID
 */
export function saveCurrentSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, sessionId);
}

/**
 * Clear current session ID
 */
export function clearCurrentSessionId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
}

/**
 * Create new session
 */
export function createSession(): LocalSession {
  return {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Add or update session
 */
export function upsertSession(session: LocalSession): void {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }
  saveSessions(sessions);
}

/**
 * Delete session
 */
export function deleteSessionFromStorage(sessionId: string): void {
  const sessions = getSessions().filter(s => s.id !== sessionId);
  saveSessions(sessions);
}

/**
 * Get single session
 */
export function getSession(sessionId: string): LocalSession | null {
  const sessions = getSessions();
  return sessions.find(s => s.id === sessionId) || null;
}
