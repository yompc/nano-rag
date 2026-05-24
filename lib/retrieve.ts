/**
 * 检索模块 - 暴力检索实现
 * 将查询向量与所有chunks进行相似度计算
 */

import type { D1Database, Doc } from './types';
import { getMistralEmbedding } from './embedding';
import { cosineSimilarity, parseEmbeddingToFloat32Array, toFloat32Array } from './vector-utils';
import { getAllChunks, getChunksByDocIds } from './db';

/**
 * 检索结果项
 */
export interface RetrievedChunk {
  id: number;
  doc_id: number;
  content: string;
  page: number;
  filename: string;
  similarity: number;
}

/**
 * 检索配置
 */
const RETRIEVE_CONFIG = {
  topK: 5,  // 返回Top-5 chunks
  minSimilarity: 0.8  // 最低相似度阈值
};

/**
 * 暴力检索：查询最相关的文档片段
 * @param question - 用户问题
 * @param apiKey - Mistral API密钥
 * @param db - D1数据库实例
 * @returns Top-K个最相关的chunks
 */
export async function retrieve(
  question: string,
  apiKey: string,
  db: D1Database
): Promise<RetrievedChunk[]> {
  // 1. 生成查询向量
  const queryEmbedding = await getMistralEmbedding(question, apiKey);
  const queryVector = toFloat32Array(queryEmbedding);

  // 2. 获取所有chunks
  const allChunks = await getAllChunks(db);

  if (allChunks.length === 0) {
    return [];
  }

  // 3. 批量获取文档信息（用于获取filename）
  const docIds = [...new Set(allChunks.map(c => c.doc_id))];
  const docMap = new Map<number, string>();

  for (const docId of docIds) {
    const doc = await db
      .prepare('SELECT filename FROM docs WHERE id = ?')
      .bind(docId)
      .first<Pick<Doc, 'filename'>>();
    
    if (doc) {
      docMap.set(docId, doc.filename);
    }
  }

  // 4. 计算每个chunk的相似度
  const scored = allChunks.map(chunk => {
    const chunkVector = parseEmbeddingToFloat32Array(chunk.embedding_json);
    const similarity = cosineSimilarity(queryVector, chunkVector);
    
    return {
      id: chunk.id,
      doc_id: chunk.doc_id,
      content: chunk.content,
      page: chunk.page,
      filename: docMap.get(chunk.doc_id) || 'unknown',
      similarity
    };
  });

  // 5. 按相似度降序排序
  scored.sort((a, b) => b.similarity - a.similarity);

  // 6. 过滤低相似度结果并返回Top-K
  return scored
    .filter(item => item.similarity >= RETRIEVE_CONFIG.minSimilarity)
    .slice(0, RETRIEVE_CONFIG.topK);
}

/**
 * 检索并格式化为上下文字符串
 * @param question - 用户问题
 * @param apiKey - Mistral API密钥
 * @param db - D1数据库实例
 * @returns 格式化的上下文字符串和chunk列表
 */
export async function retrieveWithContext(
  question: string,
  apiKey: string,
  db: D1Database
): Promise<{ context: string; chunks: RetrievedChunk[] }> {
  const chunks = await retrieve(question, apiKey, db);

  if (chunks.length === 0) {
    return { context: '', chunks: [] };
  }

  const context = chunks
    .map(c => `[${c.filename} 第${c.page}页] ${c.content}`)
    .join('\n\n');

  return { context, chunks };
}

export { RETRIEVE_CONFIG };

/**
 * 按文档ID过滤的检索：只检索指定文档的chunks
 * @param question - 用户问题
 * @param docIds - 要检索的文档ID列表
 * @param apiKey - Mistral API密钥
 * @param db - D1数据库实例
 * @returns Top-K个最相关的chunks
 */
export async function retrieveWithDocFilter(
  question: string,
  docIds: number[],
  apiKey: string,
  db: D1Database
): Promise<RetrievedChunk[]> {
  // 空数组直接返回
  if (docIds.length === 0) {
    return [];
  }

  // 1. 生成查询向量
  const queryEmbedding = await getMistralEmbedding(question, apiKey);
  const queryVector = toFloat32Array(queryEmbedding);

  // 2. 获取指定文档的chunks
  const chunks = await getChunksByDocIds(db, docIds);

  if (chunks.length === 0) {
    return [];
  }

  // 3. 批量获取文档信息（用于获取filename）
  const uniqueDocIds = [...new Set(chunks.map(c => c.doc_id))];
  const docMap = new Map<number, string>();

  for (const docId of uniqueDocIds) {
    const doc = await db
      .prepare('SELECT filename FROM docs WHERE id = ?')
      .bind(docId)
      .first<Pick<Doc, 'filename'>>();
    
    if (doc) {
      docMap.set(docId, doc.filename);
    }
  }

  // 4. 计算每个chunk的相似度
  const scored = chunks.map(chunk => {
    const chunkVector = parseEmbeddingToFloat32Array(chunk.embedding_json);
    const similarity = cosineSimilarity(queryVector, chunkVector);
    
    return {
      id: chunk.id,
      doc_id: chunk.doc_id,
      content: chunk.content,
      page: chunk.page,
      filename: docMap.get(chunk.doc_id) || 'unknown',
      similarity
    };
  });

  // 5. 按相似度降序排序
  scored.sort((a, b) => b.similarity - a.similarity);

  // 6. 过滤低相似度结果并返回Top-K
  return scored
    .filter(item => item.similarity >= RETRIEVE_CONFIG.minSimilarity)
    .slice(0, RETRIEVE_CONFIG.topK);
}
