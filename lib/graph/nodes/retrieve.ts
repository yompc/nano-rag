/**
 * 检索节点
 * 使用lib/retrieve.ts中的retrieve函数获取Top-5 chunks
 * 支持按 selected_doc_ids 过滤文档
 */

import type { D1Database } from '@/lib/types';
import { retrieve, retrieveWithDocFilter, type RetrievedChunk } from '@/lib/retrieve';
import type { RAGState } from '../state';

interface RetrieveNodeInput {
  state: RAGState;
  apiKey: string;
  db: D1Database;
}

/**
 * 检索节点 - 根据改写后的问题检索相关文档片段
 * @param input - 包含状态、API密钥和数据库的输入
 * @returns 包含top_chunks的状态更新
 */
export async function retrieveNode(
  input: RetrieveNodeInput
): Promise<Partial<RAGState>> {
  const { state, apiKey, db } = input;
  
  const query = state.rewritten_question || state.question;
  const selectedDocIds = state.selected_doc_ids;
  
  console.log('[Retrieve Node]', {
    status: 'starting',
    selectedDocIdsType: selectedDocIds === undefined ? 'undefined' : 'array',
    filterDocCount: selectedDocIds?.length ?? 0
  });
  
  try {
    let chunks: RetrievedChunk[];
    
    // 情况1: selected_doc_ids === undefined → 全库检索（回退）
    // 情况2: selected_doc_ids === [] → 返回空（明确无相关文档）
    // 情况3: selected_doc_ids 非空数组 → 过滤检索
    if (selectedDocIds === undefined) {
      console.log('[Retrieve Node]', { status: 'using_full_retrieval', reason: 'no_selector_result' });
      chunks = await retrieve(query, apiKey, db);
    } else if (selectedDocIds.length === 0) {
      console.log('[Retrieve Node]', { status: 'no_relevant_docs', reason: 'selector_returned_empty' });
      chunks = [];
    } else {
      console.log('[Retrieve Node]', { status: 'using_filtered_retrieval', docCount: selectedDocIds.length });
      chunks = await retrieveWithDocFilter(query, selectedDocIds, apiKey, db);
    }
    
    console.log('[Retrieve Node]', {
      status: 'completed',
      resultChunkCount: chunks.length,
      usedDocFilter: selectedDocIds !== undefined && selectedDocIds.length > 0
    });
    
    return { top_chunks: chunks };
  } catch (error) {
    console.error('[Retrieve Node]', { status: 'error', error });
    return { top_chunks: [] };
  }
}
