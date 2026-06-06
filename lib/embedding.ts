/**
 * OpenAI Embedding API Client
 * Generate vectors using configurable embedding model
 */

import { EMBEDDING_CONFIG } from './model-config';

export interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * Get embedding vector for single text
 * @param text - Text to generate embedding for
 * @param apiKey - OpenAI API key
 * @param retries - Number of retries (default 3)
 * @returns Embedding vector
 */
export async function getOpenAIEmbedding(
  text: string,
  apiKey: string,
  retries = EMBEDDING_CONFIG.maxRetries
): Promise<number[]> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), EMBEDDING_CONFIG.timeout);

      const response = await fetch(EMBEDDING_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: EMBEDDING_CONFIG.model,
          input: text
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API ${response.status}: ${errorText}`);
      }
      
      const data = await response.json() as OpenAIEmbeddingResponse;
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No embedding data returned from OpenAI API');
      }
      
      return data.data[0].embedding;
    } catch (error) {
      // Last retry failed, throw error
      if (attempt === retries - 1) {
        throw error;
      }

      // Exponential backoff: wait time increases with retry count
      const delay = 1000 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('OpenAI Embedding API failed after all retries');
}

/**
 * Batch get embedding vectors for multiple texts
 * @param texts - Text array
 * @param apiKey - OpenAI API key
 * @returns Embedding vector array
 */
export async function getOpenAIEmbeddings(
  texts: string[], 
  apiKey: string
): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // Process individually for stability
  for (const text of texts) {
    const embedding = await getOpenAIEmbedding(text, apiKey);
    embeddings.push(embedding);
  }

  return embeddings;
}

/**
 * Validate embedding vector dimensions
 * @param embedding - Embedding vector
 * @returns Whether vector is valid
 */
export function validateEmbedding(embedding: number[]): boolean {
  return Array.isArray(embedding) &&
         embedding.length === EMBEDDING_CONFIG.dimensions &&
         embedding.every(v => typeof v === 'number' && !isNaN(v));
}
