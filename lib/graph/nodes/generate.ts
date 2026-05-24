/**
 * 生成节点
 * 使用 LLM 生成带来源标注的回答
 */

import type { RAGState, Message } from '../state';
import type { RetrievedChunk } from '@/lib/retrieve';
import { CHAT_CONFIG } from '@/lib/model-config';
import { SYSTEM_PROMPT } from '@/lib/prompts';

/**
 * 截断历史消息，防止超出上下文窗口
 * @param messages - 原始消息数组
 * @param maxPerMessage - 单条消息最大字符数
 * @param maxCount - 最大消息数量
 * @returns 截断后的消息数组
 */
function truncateMessages(
  messages: Message[], 
  maxPerMessage: number = 100000, 
  maxCount: number = 100
): Message[] {
  return messages.slice(-maxCount).map(m => ({
    role: m.role,
    content: m.content.slice(0, maxPerMessage)
  }));
}

interface MistralChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface GenerateNodeInput {
  state: RAGState;
  apiKey: string;
}

interface GenerateStreamNodeInput {
  state: RAGState;
  apiKey: string;
  onChunk: (content: string) => void;
}

/**
 * 生成节点 - 基于检索到的chunks生成回答
 * @param input - 包含状态和API密钥的输入
 * @returns 包含answer的状态更新
 */
export async function generateNode(
  input: GenerateNodeInput
): Promise<Partial<RAGState>> {
  const { state, apiKey } = input;
  const { question, top_chunks } = state;
  
  if (top_chunks.length === 0) {
    return { 
      answer: '抱歉，没有找到相关的文档内容。请确保已上传相关文档。' 
    };
  }
  
  try {
    const answer = await generateAnswer({ question, chunks: top_chunks, apiKey, messages: state.messages });
    return { answer };
  } catch (error) {
    console.error('生成回答失败:', error);
    return { 
      answer: '生成回答时出现错误，请稍后重试。' 
    };
  }
}

interface GenerateAnswerInput {
  question: string;
  chunks: RetrievedChunk[];
  apiKey: string;
  messages?: Message[];
}

interface GenerateStreamInput {
  question: string;
  chunks: RetrievedChunk[];
  apiKey: string;
  onChunk: (content: string) => void;
  messages?: Message[];
}

interface MistralStreamResponse {
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
}

/**
 * 使用Mistral LLM生成回答
 * @param input - 包含问题、chunks和API密钥的输入
 * @returns 生成的回答
 */
async function generateAnswer(input: GenerateAnswerInput): Promise<string> {
  const { question, chunks, apiKey, messages } = input;
  
  const context = chunks
    .map(c => `[${c.filename} 第${c.page}页] ${c.content}`)
    .join('\n\n');
  
  const truncatedHistory = messages ? truncateMessages(messages) : [];
  const messagesArray = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...truncatedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: `基于以下文档片段回答我的问题：\n\n${context}\n\n我的问题：${question}` }
  ];
  
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
        messages: messagesArray,
        temperature: CHAT_CONFIG.temperature,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Generate] Mistral API error:', response.status, errorText);
      throw new Error(`Mistral API ${response.status}: ${errorText}`);
    }
    
    const data = await response.json() as MistralChatResponse;
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Mistral');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 流式生成回答 - 使用 Mistral stream 模式
 * @param input - 包含问题、chunks、API密钥和回调的输入
 * @returns 完整生成的回答
 */
async function generateStream(input: GenerateStreamInput): Promise<string> {
  const { question, chunks, apiKey, onChunk, messages } = input;

  const context = chunks
    .map(c => `[${c.filename} 第${c.page}页] ${c.content}`)
    .join('\n\n');

  const truncatedHistory = messages ? truncateMessages(messages) : [];
  const messagesArray = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...truncatedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: `基于以下文档片段回答我的问题：\n\n${context}\n\n我的问题：${question}` }
  ];

  const response = await fetch(CHAT_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: CHAT_CONFIG.model,
      messages: messagesArray,
      temperature: CHAT_CONFIG.temperature,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`Mistral API ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullAnswer = '';
  let buffer = '';
  let chunkCount = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const decoded = decoder.decode(value, { stream: true });
    buffer += decoded;
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data) as MistralStreamResponse;
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            chunkCount++;
            fullAnswer += content;
            onChunk(content);
          }
        } catch (e) {
          console.error('[Generate] JSON parse error:', e, 'data:', data.substring(0, 100));
        }
      }
    }
  }

  console.log('[Generate] Stream completed. Total chunks:', chunkCount, 'Total length:', fullAnswer.length);

  return fullAnswer;
}

export async function generateStreamNode(
  input: GenerateStreamNodeInput
): Promise<Partial<RAGState>> {
  const { state, apiKey, onChunk } = input;
  const { question, top_chunks } = state;

  if (top_chunks.length === 0) {
    const noDocAnswer = '抱歉，没有找到相关的文档内容。请确保已上传相关文档。';
    onChunk(noDocAnswer);
    return {
      answer: noDocAnswer
    };
  }

  try {
    console.log('[Generate] Starting stream generation...');
    const answer = await generateStream({ question, chunks: top_chunks, apiKey, onChunk, messages: state.messages });
    console.log('[Generate] Stream generation completed, answer length:', answer.length);
    return { answer };
  } catch (error) {
    console.error('[Generate] Stream generation failed:', error);
    const fallbackAnswer = '生成回答时出现错误，请稍后重试。';
    return { answer: fallbackAnswer };
  }
}
