'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@/lib/types';
import { retrieve, type RetrievedChunk } from '@/lib/retrieve';
import { createChatLog } from '@/lib/db';
import { CHAT_CONFIG } from '@/lib/model-config';
import { SYSTEM_PROMPT } from '@/lib/prompts';

interface ChatInput {
  question: string;
}

interface ChatResult {
  success: boolean;
  answer?: string;
  sources?: RetrievedChunk[];
  error?: string;
}

interface MistralChatResponse {
  id: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
    completion_tokens: number;
  };
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
  }>;
}

interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
}

export async function askQuestion(input: ChatInput): Promise<ChatResult> {
  const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
  
  if (!env.DB) {
    return { success: false, error: 'D1数据库未绑定' };
  }
  
  if (!env.OPENAI_API_KEY) {
    return { success: false, error: 'OPENAI_API_KEY未配置' };
  }

  if (!input.question || input.question.trim().length === 0) {
    return { success: false, error: '问题不能为空' };
  }

  try {
    const chunks = await retrieve(input.question, env.OPENAI_API_KEY, env.DB);

    if (chunks.length === 0) {
      return { 
        success: true, 
        answer: '抱歉，没有找到相关的文档内容。请确保已上传相关文档。',
        sources: []
      };
    }

    const userPrompt = `文档片段：
${chunks.map(c => `[${c.filename} 第${c.page}页] ${c.content}`).join('\n\n')}

问题：${input.question}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHAT_CONFIG.timeout);

    const response = await fetch(CHAT_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
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
      const errorText = await response.text();
      throw new Error(`Mistral API ${response.status}: ${errorText}`);
    }

    const data = await response.json() as MistralChatResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Mistral Chat API');
    }

    const answer = data.choices[0].message.content;

    await createChatLog(env.DB, {
      question: input.question,
      retrieved_chunk_ids: chunks.map(c => c.id),
      answer
    });

    return {
      success: true,
      answer,
      sources: chunks
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return { success: false, error: `问答失败: ${message}` };
  }
}


