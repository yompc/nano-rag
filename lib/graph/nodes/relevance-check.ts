/**
 * 问题相关性判断节点
 * 使用 LLM 判断用户问题是否适合进行文档检索
 */

import type { RAGState } from '../state';
import { CHAT_CONFIG } from '@/lib/model-config';

const RELEVANCE_CHECK_PROMPT = `你是一个问题分类专家。请判断用户的问题是否适合在文档库中查找答案。

适合文档检索的问题类型：
- 询问文档中的具体内容、数据、规定、流程等
- 需要从文档中查找、总结、分析信息
- 关于文档主题的相关问题

不适合文档检索的问题类型：
- 闲聊、问候（如"你好"、"请介绍你自己"）
- 与文档主题完全无关的问题
- 要求 AI 进行创意写作、编程等任务
- 询问 AI 自身能力或身份

请只回复 "true" 或 "false"：
- "true" 表示适合文档检索
- "false" 表示不适合文档检索`;

interface MistralChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface RelevanceCheckInput {
  state: RAGState;
  apiKey: string;
}

/**
 * 问题相关性判断节点
 * @param input - 包含状态和API密钥的输入
 * @returns 包含is_relevant的状态更新
 */
export async function relevanceCheckNode(
  input: RelevanceCheckInput
): Promise<Partial<RAGState> & { is_relevant: boolean }> {
  const { state, apiKey } = input;
  const { question } = state;

  console.log('[Relevance Check] Checking question:', question.slice(0, 50));

  try {
    const isRelevant = await checkRelevance({ question, apiKey });
    console.log('[Relevance Check] Result:', isRelevant ? 'relevant' : 'not relevant');
    return { is_relevant: isRelevant };
  } catch (error) {
    console.error('[Relevance Check] Error:', error);
    // 出错时默认认为相关，继续检索
    return { is_relevant: true };
  }
}

interface CheckRelevanceInput {
  question: string;
  apiKey: string;
}

/**
 * 使用 LLM 判断问题相关性
 */
async function checkRelevance(input: CheckRelevanceInput): Promise<boolean> {
  const { question, apiKey } = input;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

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
          { role: 'system', content: RELEVANCE_CHECK_PROMPT },
          { role: 'user', content: `问题：${question}` }
        ],
        temperature: 0.1,
        max_tokens: 10
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

    const result = data.choices[0].message.content.trim().toLowerCase();
    console.log('[Relevance Check] LLM Response:', result);

    // 检查是否包含 true/false 或相关关键词
    if (result.includes('true') || result.includes('是') || result.includes('适合') || result.includes('相关')) {
      return true;
    }
    if (result.includes('false') || result.includes('否') || result.includes('不适合') || result.includes('无关')) {
      return false;
    }

    // 默认认为相关
    return true;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
