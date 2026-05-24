/**
 * 查询改写节点
 * 使用 LLM 改写查询，处理指代消解
 */

import type { RAGState } from '../state';
import { CHAT_CONFIG } from '@/lib/model-config';

const REWRITE_SYSTEM_PROMPT = `你是一个查询改写专家。
请根据对话历史（如果有），将用户的当前问题改写为一个独立、完整的查询。
改写规则：
1. 如果有对话历史，将指代消解为具体实体（如"它"、"这个"等指代物）
2. 保持问题的核心意图不变
3. 使改写后的问题不依赖于之前的上下文也能被理解
4. 如果没有需要消解的指代，直接返回原问题

只返回改写后的问题，不要添加任何解释。`;

interface MistralChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface RewriteQueryInput {
  question: string;
  messages: { role: string; content: string }[];
  apiKey: string;
}

/**
 * 查询改写节点
 * @param state - 当前状态
 * @param apiKey - Mistral API密钥
 * @returns 包含rewritten_question的状态更新
 */
export async function rewriteQueryNode(
  state: RAGState,
  apiKey: string
): Promise<Partial<RAGState>> {
  const { question, messages } = state;
  
  try {
    const rewritten = await rewriteQuery({ question, messages, apiKey });
    return { rewritten_question: rewritten };
  } catch (error) {
    console.error('查询改写失败:', error);
    // 如果改写失败，使用原问题
    return { rewritten_question: question };
  }
}

/**
 * 使用Mistral LLM改写查询
 * @param input - 包含问题、消息历史和API密钥的输入
 * @returns 改写后的问题
 */
export async function rewriteQuery(input: RewriteQueryInput): Promise<string> {
  const { question, messages, apiKey } = input;
  
  // 构建对话历史提示
  let historyPrompt = '';
  if (messages.length > 0) {
    const recentMessages = messages.slice(-6); // 只取最近6条
    historyPrompt = '对话历史：\n' + 
      recentMessages.map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`).join('\n') +
      '\n\n';
  }
  
  const userPrompt = `${historyPrompt}当前问题：${question}\n\n请改写上述问题，使其成为一个独立、完整的查询。`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_CONFIG.timeout);

  try {
    const response = await fetch(CHAT_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: CHAT_CONFIG.model,
        messages: [
          { role: 'system', content: REWRITE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: CHAT_CONFIG.temperature,
        max_tokens: 256
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Mistral API ${response.status}`);
    }
    
    const data = await response.json() as MistralChatResponse;
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Mistral');
    }
    
    const rewritten = data.choices[0].message.content.trim();
    
    // 如果改写结果为空，返回原问题
    if (!rewritten || rewritten.length === 0) {
      return question;
    }
    
    return rewritten;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
