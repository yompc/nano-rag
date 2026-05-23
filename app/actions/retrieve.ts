'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database, Chunk, DocType } from '@/lib/types';
import { getMistralEmbedding } from '@/lib/embedding';
import { parseEmbeddingToFloat32Array, cosineSimilarity } from '@/lib/vector-utils';

const RETRIEVE_CONFIG = {
  maxCandidates: 200,
  topK: 5,
  timeout: 15000
};

interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
}

interface RetrieveInput {
  query: string;
  docType?: DocType;
  keywords?: string[];
}

interface RetrieveResult {
  id: number;
  content: string;
  page: number;
  similarity: number;
  docId: number;
}

interface RetrieveResponse {
  success: boolean;
  results?: RetrieveResult[];
  error?: string;
}

interface ChunkWithScore extends Chunk {
  similarity: number;
}

export async function retrieveChunks(input: RetrieveInput): Promise<RetrieveResponse> {
  const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };

  if (!env.DB) {
    return { success: false, error: 'D1数据库未绑定' };
  }

  if (!env.OPENAI_API_KEY) {
    return { success: false, error: 'OPENAI_API_KEY未配置' };
  }

  if (!input.query || input.query.trim().length === 0) {
    return { success: false, error: '查询文本不能为空' };
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('检索超时')), RETRIEVE_CONFIG.timeout);
    });

    const retrievePromise = async (): Promise<RetrieveResponse> => {
      const queryEmbedding = await getMistralEmbedding(input.query.trim(), env.OPENAI_API_KEY);
      const queryVector = new Float32Array(queryEmbedding);

      const candidates = await fetchCandidates(env.DB, input);

      const scoredCandidates = scoreCandidates(queryVector, candidates);

      const topResults = scoredCandidates
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, RETRIEVE_CONFIG.topK);

      const results: RetrieveResult[] = topResults.map(chunk => ({
        id: chunk.id,
        content: chunk.content,
        page: chunk.page,
        similarity: chunk.similarity,
        docId: chunk.doc_id
      }));

      return { success: true, results };
    };

    return await Promise.race([retrievePromise(), timeoutPromise]);
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return { success: false, error: `检索失败: ${message}` };
  }
}

async function fetchCandidates(
  db: D1Database,
  input: RetrieveInput
): Promise<Chunk[]> {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // 文档类型过滤 - 必须满足
  if (input.docType) {
    conditions.push('doc_type = ?');
    params.push(input.docType);
  }

  // 关键词过滤 - 使用JSON函数优化查询
  if (input.keywords && input.keywords.length > 0) {
    // 构建OR条件：任意一个关键词匹配即可
    const keywordConditions = input.keywords.map(() => 
      'EXISTS (SELECT 1 FROM json_each(keywords_json) WHERE value = ?)'
    );
    conditions.push(`(${keywordConditions.join(' OR ')})`);
    for (const kw of input.keywords) {
      params.push(kw);
    }
  }

  // 所有条件使用AND连接
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT id, doc_id, content, page, embedding_json, keywords_json, char_count, created_at
    FROM chunks
    ${whereClause}
    LIMIT ?
  `;

  params.push(RETRIEVE_CONFIG.maxCandidates);

  const result = await db.prepare(sql).bind(...params).all<Chunk>();
  return result.results;
}

function scoreCandidates(queryVector: Float32Array, candidates: Chunk[]): ChunkWithScore[] {
  const scored: ChunkWithScore[] = [];

  for (const candidate of candidates) {
    try {
      const candidateVector = parseEmbeddingToFloat32Array(candidate.embedding_json);
      const similarity = cosineSimilarity(queryVector, candidateVector);
      scored.push({ ...candidate, similarity });
    } catch {
      continue;
    }
  }

  return scored;
}

export async function retrieveWithKeywordFilter(
  query: string,
  keywords: string[],
  docType?: DocType
): Promise<RetrieveResponse> {
  return retrieveChunks({ query, keywords, docType });
}

export async function retrieveSimple(query: string): Promise<RetrieveResponse> {
  return retrieveChunks({ query });
}
