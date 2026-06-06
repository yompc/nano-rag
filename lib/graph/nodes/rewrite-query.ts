/**
 * Query Rewrite Node
 * Uses LLM to rewrite queries, handling coreference resolution
 */

import type { RAGState } from '../state';
import { CHAT_CONFIG } from '@/lib/model-config';

const REWRITE_SYSTEM_PROMPT = `You are a query rewriting expert.
Rewrite the user's current question into a standalone, complete query based on conversation history (if any).
Rewriting rules:
1. Resolve references to specific entities from conversation history (e.g., "it", "this", "that")
2. Maintain the core intent of the question
3. Ensure the rewritten question can be understood without previous context
4. Return the original question if no reference resolution is needed

Only return the rewritten question without any explanation`;

interface OpenAIChatResponse {
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
 * Query rewrite node
 * @param state - Current state
 * @param apiKey - OpenAI API key
 * @returns State update containing rewritten_question
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
    console.error('Query rewrite failed:', error);
    // Fall back to original question if rewrite fails
    return { rewritten_question: question };
  }
}

/**
 * Rewrite query using OpenAI LLM
 * @param input - Input containing question, message history, and API key
 * @returns Rewritten question
 */
export async function rewriteQuery(input: RewriteQueryInput): Promise<string> {
  const { question, messages, apiKey } = input;

  // Build conversation history prompt
  let historyPrompt = '';
  if (messages.length > 0) {
    const recentMessages = messages.slice(-6); // Only take the last 6 messages
    historyPrompt = 'Conversation history:\n' +
      recentMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n') +
      '\n\n';
  }

  const userPrompt = `${historyPrompt}Current question: ${question}\n\nPlease rewrite the above question into a standalone, complete query`;

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
      throw new Error(`OpenAI API ${response.status}`);
    }
    
    const data = await response.json() as OpenAIChatResponse;
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }
    
    const rewritten = data.choices[0].message.content.trim();
    
    // If rewrite result is empty, return original question
    if (!rewritten || rewritten.length === 0) {
      return question;
    }
    
    return rewritten;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
