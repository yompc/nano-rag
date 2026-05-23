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
  const hasFilter = !!selectedDocIds && selectedDocIds.length > 0;
  
  console.log('[Retrieve Node]', {
    status: 'starting',
    hasDocFilter: hasFilter,
    filterDocCount: selectedDocIds?.length ?? 0,
    filterDocIds: hasFilter ? selectedDocIds : []
  });
  
  try {
    let chunks: RetrievedChunk[];
    
    if (hasFilter) {
      console.log('[Retrieve Node]', { status: 'using_filtered_retrieval' });
      chunks = await retrieveWithDocFilter(query, selectedDocIds!, apiKey, db);
    } else {
      console.log('[Retrieve Node]', { status: 'using_full_retrieval' });
      chunks = await retrieve(query, apiKey, db);
    }
    
    console.log('[Retrieve Node]', {
      status: 'completed',
      resultChunkCount: chunks.length,
      usedDocFilter: hasFilter
    });
    
    return { top_chunks: chunks };
  } catch (error) {
    console.error('[Retrieve Node]', { status: 'error', error });
    return { top_chunks: [] };
  }
}
