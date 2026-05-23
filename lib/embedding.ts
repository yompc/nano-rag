/**
 * Mistral Embedding API客户端
 * 使用可配置的embedding模型生成向量
 */

import { EMBEDDING_CONFIG } from './model-config';

export interface MistralEmbeddingResponse {
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
 * 获取单个文本的embedding向量
 * @param text - 要生成embedding的文本
 * @param apiKey - Mistral API密钥
 * @param retries - 重试次数（默认3次）
 * @returns 1024维的embedding向量
 */
export async function getMistralEmbedding(
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
        throw new Error(`Mistral API ${response.status}: ${errorText}`);
      }
      
      const data = await response.json() as MistralEmbeddingResponse;
      
      if (!data.data || data.data.length === 0) {
        throw new Error('No embedding data returned from Mistral API');
      }
      
      return data.data[0].embedding;
    } catch (error) {
      // 最后一次重试失败，抛出错误
      if (attempt === retries - 1) {
        throw error;
      }
      
      // 指数退避：等待时间随重试次数增加
      const delay = 1000 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Mistral Embedding API failed after all retries');
}

/**
 * 批量获取多个文本的embedding向量
 * @param texts - 文本数组
 * @param apiKey - Mistral API密钥
 * @returns embedding向量数组
 */
export async function getMistralEmbeddings(
  texts: string[], 
  apiKey: string
): Promise<number[][]> {
  const embeddings: number[][] = [];
  
  // Mistral API支持批量请求，但为了稳定性，我们逐个处理
  for (const text of texts) {
    const embedding = await getMistralEmbedding(text, apiKey);
    embeddings.push(embedding);
  }
  
  return embeddings;
}

/**
 * 验证embedding向量维度
 * @param embedding - embedding向量
 * @returns 是否为有效的向量
 */
export function validateEmbedding(embedding: number[]): boolean {
  return Array.isArray(embedding) &&
         embedding.length === EMBEDDING_CONFIG.dimensions &&
         embedding.every(v => typeof v === 'number' && !isNaN(v));
}
