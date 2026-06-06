/**
 * Generate Node
 * Uses LLM to generate answer with source citations
 */

import type { RAGState, Message } from '../state';
import type { RetrievedChunk } from '@/lib/retrieve';
import { CHAT_CONFIG } from '@/lib/model-config';
import { SYSTEM_PROMPT } from '@/lib/prompts';

/**
 * Truncate history messages to prevent exceeding context window
 * @param messages - Original message array
 * @param maxPerMessage - Max characters per message
 * @param maxCount - Max message count
 * @returns Truncated message array
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

interface OpenAIChatResponse {
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
 * Generate Node - Generate answer based on retrieved chunks
 * @param input - Input containing state and API key
 * @returns State update containing answer
 */
export async function generateNode(
  input: GenerateNodeInput
): Promise<Partial<RAGState>> {
  const { state, apiKey } = input;
  const { question, top_chunks } = state;
  
  if (top_chunks.length === 0) {
    return {
      answer: 'Sorry, no relevant documents found. Please ensure documents have been uploaded.'
    };
  }
  
  try {
    const answer = await generateAnswer({ question, chunks: top_chunks, apiKey, messages: state.messages });
    return { answer };
  } catch (error) {
    console.error('Failed to generate answer:', error);
    return {
      answer: 'Error generating answer. Please try again later.'
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

interface OpenAIStreamResponse {
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
}

/**
 * Generate answer using OpenAI LLM
 * @param input - Input containing question, chunks and API key
 * @returns Generated answer
 */
async function generateAnswer(input: GenerateAnswerInput): Promise<string> {
  const { question, chunks, apiKey, messages } = input;
  
  const context = chunks
    .map(c => `[${c.filename} Page ${c.page}] ${c.content}`)
    .join('\n\n');

  const truncatedHistory = messages ? truncateMessages(messages) : [];
  const messagesArray = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...truncatedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: `Based on the following document fragments, answer my question:\n\n${context}\n\nMy question: ${question}` }
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
        max_tokens: CHAT_CONFIG.maxTokens,
        stream: false
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Generate] OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API ${response.status}: ${errorText}`);
    }
    
    const data = await response.json() as OpenAIChatResponse;
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Stream generate answer - Using OpenAI stream mode
 * @param input - Input containing question, chunks, API key and callback
 * @returns Complete generated answer
 */
async function generateStream(input: GenerateStreamInput): Promise<string> {
  const { question, chunks, apiKey, onChunk, messages } = input;

  const context = chunks
    .map(c => `[${c.filename} Page ${c.page}] ${c.content}`)
    .join('\n\n');

  const truncatedHistory = messages ? truncateMessages(messages) : [];
  const messagesArray = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...truncatedHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: `Based on the following document fragments, answer my question:\n\n${context}\n\nMy question: ${question}` }
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
      max_tokens: CHAT_CONFIG.maxTokens,
      stream: true
    })
  });

  if (!response.ok) {
    throw new Error(`OpenAI API ${response.status}`);
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
          const parsed = JSON.parse(data) as OpenAIStreamResponse;
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
    const noDocAnswer = 'Sorry, no relevant documents found. Please ensure documents have been uploaded.';
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
    const fallbackAnswer = 'Error generating answer. Please try again later.';
    return { answer: fallbackAnswer };
  }
}
