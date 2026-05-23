/**
 * 幻觉检测节点
 * 使用LLM检测回答是否有幻觉（与检索到的资料不符）
 */

import type { RAGState } from '../state';
import type { RetrievedChunk } from '@/lib/retrieve';
import { CHAT_CONFIG } from '@/lib/model-config';

const SYSTEM_PROMPT = `你是一个幻觉检测专家。
请判断给定的回答是否基于提供的文档片段。
检测规则：
1. 回答中包含的任何事实性陈述必须在文档片段中有依据
2. 回答中出现文档片段中没有的信息视为幻觉
3. 回答中进行合理的推理和总结不视为幻觉
4. 如果回答承认"无法回答"或"资料不足"，不视为幻觉

输出要求：只回复"true"（有幻觉）或"false"（无幻觉），不要其他内容。`;

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
    const hasHallucination = await checkHallucination({ 
      question, 
      answer, 
      chunks: top_chunks, 
      apiKey 
    });
    return { hallucination: hasHallucination };
  } catch (error) {
    console.error('幻觉检测失败:', error);
    // 检测失败时，保守起见假设无幻觉
    return { hallucination: false };
  }
}

interface CheckHallucinationInput {
  question: string;
  answer: string;
  chunks: RetrievedChunk[];
  apiKey: string;
}

/**
 * 使用LLM检测幻觉
 * @param input - 包含问题、回答、chunks和API密钥的输入
 * @returns 是否有幻觉
 */
async function checkHallucination(input: CheckHallucinationInput): Promise<boolean> {
  const { question, answer, chunks, apiKey } = input;
  
  const context = chunks
    .map(c => `[${c.filename} 第${c.page}页] ${c.content}`)
    .join('\n\n');
  
  const userPrompt = `文档片段：\n${context}\n\n问题：${question}\n\n回答：${answer}\n\n请判断此回答是否有幻觉（即包含文档片段中没有的信息）。`;

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
        temperature: CHAT_CONFIG.temperature
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
    
    console.log('[Hallucination Check] LLM Response:', result);
    
    // 1. 检查是否是"无法回答"类回复（这是合法拒绝，不是幻觉）
    if (result.includes('无法回答') || result.includes('资料不足') || 
        result.includes('无法') || result.includes('不能回答')) {
      return false; // 不是幻觉
    }
    
    // 2. 检查中文否定词
    if (result.includes('否') || result.includes('不是') || result.includes('无幻觉') ||
        result.includes('没有') || result.includes('不包含') || result.includes('不存在')) {
      return false; // 不是幻觉
    }
    
    // 3. 检查明确的 true/false
    if (result.includes('true') || result.includes('是幻觉') || result.includes('有幻觉') ||
        result.includes('包含幻觉') || result.includes('存在幻觉')) {
      return true; // 是幻觉
    }
    
    // 4. 默认不是幻觉（宁可放过，也不要误杀）
    console.log('[Hallucination Check] Parsed Result:', { 
      isHallucination: false,
      result 
    });
    return false;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
