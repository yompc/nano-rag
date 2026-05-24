/**
 * 幻觉检测节点
 * 使用LLM检测回答是否有幻觉（与检索到的资料不符）
 */

import type { RAGState } from '../state';
import type { RetrievedChunk } from '@/lib/retrieve';
import { CHAT_CONFIG } from '@/lib/model-config';

const SYSTEM_PROMPT = `你是一个回答质量评估专家。
请对给定的回答进行综合评分（0-100分）。

评分标准：
1. **事实准确性**（40分）：回答中的核心事实是否在文档中有依据
2. **相关性**（30分）：回答是否针对用户问题
3. **完整性**（20分）：回答是否完整，是否遗漏重要信息
4. **表达质量**（10分）：回答是否清晰、流畅

评分规则：
- 80分以上：回答质量良好，可以使用
- 60-79分：回答基本可用，但有小问题
- 60分以下：回答质量较差，建议重新生成

特殊说明：
- 合理的推理和总结不扣分
- 承认"无法回答"时，如果确实没有相关文档，给高分

输出格式：只输出一个0-100的数字，不要其他内容。`;

interface MistralChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface HallucinationCheckInput {
  state: RAGState;
  apiKey: string;
}

const QUALITY_THRESHOLD = 90;

/**
 * 幻觉检测节点
 * @param input - 包含状态和API密钥的输入
 * @returns 包含hallucination检测结果的状态更新
 */
export async function hallucinationCheckNode(
  input: HallucinationCheckInput
): Promise<Partial<RAGState>> {
  const { state, apiKey } = input;
  const { question, answer, top_chunks } = state;
  
  // 如果没有回答或没有chunks，不进行幻觉检测
  if (!answer || top_chunks.length === 0) {
    return { hallucination: false };
  }
  
  console.log('[Hallucination Check] Input:', {
    answerLength: answer?.length,
    chunksCount: top_chunks?.length
  });
  
  try {
    const score = await checkAnswerQuality({ 
      question, 
      answer, 
      chunks: top_chunks, 
      apiKey 
    });
    
    // 低于阈值视为"幻觉"（需要重试）
    const hasHallucination = score < QUALITY_THRESHOLD;
    
    console.log('[Hallucination Check] Result:', { 
      score, 
      threshold: QUALITY_THRESHOLD,
      hasHallucination 
    });
    
    return { hallucination: hasHallucination };
  } catch (error) {
    console.error('幻觉检测失败:', error);
    // 检测失败时，保守起见假设无幻觉
    return { hallucination: false };
  }
}

interface CheckAnswerQualityInput {
  question: string;
  answer: string;
  chunks: RetrievedChunk[];
  apiKey: string;
}

/**
 * 使用LLM评估回答质量
 * @param input - 包含问题、回答、chunks和API密钥的输入
 * @returns 质量分数（0-100）
 */
async function checkAnswerQuality(input: CheckAnswerQualityInput): Promise<number> {
  const { question, answer, chunks, apiKey } = input;
  
  const context = chunks
    .map(c => `[${c.filename} 第${c.page}页] ${c.content}`)
    .join('\n\n');
  
  const userPrompt = `文档片段：\n${context}\n\n问题：${question}\n\n回答：${answer}\n\n请对上述回答进行评分（0-100分）。`;

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1
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
    
    const result = data.choices[0].message.content.trim();
    console.log('[Hallucination Check] LLM Response:', result);
    
    // 提取数字
    const scoreMatch = result.match(/\d+/);
    if (scoreMatch) {
      const score = parseInt(scoreMatch[0], 10);
      return Math.min(100, Math.max(0, score));
    }
    
    // 无法解析时，默认给高分（宁可放过）
    console.log('[Hallucination Check] Failed to parse score, defaulting to 85');
    return 85;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
