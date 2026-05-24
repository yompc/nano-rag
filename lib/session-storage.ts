/**
 * localStorage 会话管理工具
 * 在浏览器本地存储聊天历史
 */

const STORAGE_KEYS = {
  SESSIONS: 'chat_sessions',
  CURRENT_SESSION_ID: 'chat_current_session_id',
};

export interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number; // 使用时间戳而非 Date 对象，便于序列化
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
 * 获取所有会话
 */
export function getSessions(): LocalSession[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  return data ? JSON.parse(data) : [];
}

/**
 * 保存所有会话
 */
export function saveSessions(sessions: LocalSession[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

/**
 * 获取当前会话 ID
 */
export function getCurrentSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION_ID);
}

/**
 * 保存当前会话 ID
 */
export function saveCurrentSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION_ID, sessionId);
}

/**
 * 清除当前会话 ID
 */
export function clearCurrentSessionId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION_ID);
}

/**
 * 创建新会话
 */
export function createSession(): LocalSession {
  return {
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    title: '新对话',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * 添加或更新会话
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
 * 删除会话
 */
export function deleteSessionFromStorage(sessionId: string): void {
  const sessions = getSessions().filter(s => s.id !== sessionId);
  saveSessions(sessions);
}

/**
 * 获取单个会话
 */
export function getSession(sessionId: string): LocalSession | null {
  const sessions = getSessions();
  return sessions.find(s => s.id === sessionId) || null;
}
