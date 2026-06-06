/**
 * Retrieve Node
 * Uses retrieve function from lib/retrieve.ts to get Top-5 chunks
 * Supports filtering by selected_doc_ids
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
 * Retrieve Node - Retrieve relevant document fragments based on rewritten question
 * @param input - Input containing state, API key and database
 * @returns State update containing top_chunks
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

    // Case 1: selected_doc_ids === undefined → full retrieval (fallback)
    // Case 2: selected_doc_ids === [] → return empty (explicitly no relevant docs)
    // Case 3: selected_doc_ids non-empty array → filtered retrieval
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
