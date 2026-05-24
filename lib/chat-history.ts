/**
 * 对话历史管理
 * 管理用户-助手的多轮对话历史
 */

import type { D1Database } from './types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  userId: string | null;
  title: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 创建新的对话会话
 * @param db - D1数据库
 * @param userId - 用户ID（可选）
 * @param title - 会话标题
 * @returns 会话ID
 */
export async function createChatSession(
  db: D1Database,
  userId: string | null = null,
  title: string = '新对话'
): Promise<string> {
  const sessionId = generateSessionId();
  const now = Date.now();
  
  await db
    .prepare(`INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) 
              VALUES (?, ?, ?, ?, ?)`)
    .bind(sessionId, userId, title, now, now)
    .run();
  
  return sessionId;
}

/**
 * 获取会话的消息历史
 * @param db - D1数据库
 * @param sessionId - 会话ID
 * @returns 消息列表
 */
export async function getChatHistory(
  db: D1Database,
  sessionId: string
): Promise<ChatMessage[]> {
  const result = await db
    .prepare(`SELECT role, content, timestamp 
              FROM chat_messages 
              WHERE session_id = ? 
              ORDER BY timestamp ASC`)
    .bind(sessionId)
    .all<{ role: 'user' | 'assistant'; content: string; timestamp: number }>();
  
  return result.results.map(r => ({
    role: r.role,
    content: r.content,
    timestamp: r.timestamp
  }));
}

/**
 * 添加消息到对话历史
 * @param db - D1数据库
 * @param sessionId - 会话ID
 * @param role - 角色
 * @param content - 内容
 */
export async function addMessage(
  db: D1Database,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {
  const timestamp = Date.now();
  
  await db
    .prepare(`INSERT INTO chat_messages (session_id, role, content, timestamp) 
              VALUES (?, ?, ?, ?)`)
    .bind(sessionId, role, content, timestamp)
    .run();
  
  // 更新会话更新时间
  await db
    .prepare('UPDATE chat_sessions SET updated_at = ? WHERE id = ?')
    .bind(timestamp, sessionId)
    .run();
}

/**
 * 获取最近的消息历史（用于上下文）
 * @param db - D1数据库
 * @param sessionId - 会话ID
 * @param limit - 消息数量限制
 * @returns 最近的消息列表
 */
export async function getRecentMessages(
  db: D1Database,
  sessionId: string,
  limit: number = 6
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const result = await db
    .prepare(`SELECT role, content 
              FROM chat_messages 
              WHERE session_id = ? 
              ORDER BY timestamp DESC 
              LIMIT ?`)
    .bind(sessionId, limit)
    .all<{ role: 'user' | 'assistant'; content: string }>();
  
  return result.results.reverse();
}

/**
 * 获取用户的所有会话
 * @param db - D1数据库
 * @param userId - 用户ID
 * @param limit - 会话数量限制
 * @returns 会话列表
 */
export async function getUserSessions(
  db: D1Database,
  userId: string,
  limit: number = 20
): Promise<ChatSession[]> {
  const result = await db
    .prepare(`SELECT id, user_id, title, created_at, updated_at 
              FROM chat_sessions 
              WHERE user_id = ? 
              ORDER BY updated_at DESC 
              LIMIT ?`)
    .bind(userId, limit)
    .all<{ id: string; user_id: string; title: string; created_at: number; updated_at: number }>();
  
  return result.results.map(r => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

/**
 * 删除会话及其所有消息
 * @param db - D1数据库
 * @param sessionId - 会话ID
 */
export async function deleteChatSession(
  db: D1Database,
  sessionId: string
): Promise<void> {
  // 删除消息
  await db
    .prepare('DELETE FROM chat_messages WHERE session_id = ?')
    .bind(sessionId)
    .run();
  
  // 删除会话
  await db
    .prepare('DELETE FROM chat_sessions WHERE id = ?')
    .bind(sessionId)
    .run();
}

/**
 * 更新会话标题
 * @param db - D1数据库
 * @param sessionId - 会话ID
 * @param title - 新标题
 */
export async function updateSessionTitle(
  db: D1Database,
  sessionId: string,
  title: string
): Promise<void> {
  await db
    .prepare('UPDATE chat_sessions SET title = ? WHERE id = ?')
    .bind(title, sessionId)
    .run();
}

/**
 * 生成会话ID
 * @returns 会话ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 清空会话历史
 * @param db - D1数据库
 * @param sessionId - 会话ID
 */
export async function clearChatHistory(
  db: D1Database,
  sessionId: string
): Promise<void> {
  await db
    .prepare('DELETE FROM chat_messages WHERE session_id = ?')
    .bind(sessionId)
    .run();
}
