/**
 * Retrieval Module - Brute-force retrieval implementation
 * Calculate similarity between query vector and all chunks
 */

import type { D1Database, Doc } from './types';
import { getOpenAIEmbedding } from './embedding';
import { cosineSimilarity, parseEmbeddingToFloat32Array, toFloat32Array } from './vector-utils';
import { getCachedAllChunks, getCachedAllDocs, getCachedChunksByDocIds } from './db';

/**
 * Retrieval result item
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
 * Retrieval configuration
 */
const RETRIEVE_CONFIG = {
  topK: 5,  // Return Top-5 chunks
  minSimilarity: 0.8  // Minimum similarity threshold
};

/**
 * Brute-force retrieval: Find most relevant document fragments
 * @param question - User question
 * @param apiKey - OpenAI API key
 * @param db - D1 database instance
 * @returns Top-K most relevant chunks
 */
export async function retrieve(
  question: string,
  apiKey: string,
  db: D1Database
): Promise<RetrievedChunk[]> {
  // 1. Generate query vector
  const queryEmbedding = await getOpenAIEmbedding(question, apiKey);
  const queryVector = toFloat32Array(queryEmbedding);

  // 2. Get all chunks
  const allChunks = await getCachedAllChunks(db);

  if (allChunks.length === 0) {
    return [];
  }

  // 3. Batch get document info
  const allDocs = await getCachedAllDocs(db);
  const docMap = new Map(allDocs.map(d => [d.id, d.filename]));

  // 4. Calculate similarity for each chunk
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

  // 5. Sort by similarity descending
  scored.sort((a, b) => b.similarity - a.similarity);

  // 6. Filter low similarity results and return Top-K
  return scored
    .filter(item => item.similarity >= RETRIEVE_CONFIG.minSimilarity)
    .slice(0, RETRIEVE_CONFIG.topK);
}

/**
 * Retrieve and format as context string
 * @param question - User question
 * @param apiKey - OpenAI API key
 * @param db - D1 database instance
 * @returns Formatted context string and chunk list
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
    .map(c => `[${c.filename} Page ${c.page}] ${c.content}`)
    .join('\n\n');

  return { context, chunks };
}

export { RETRIEVE_CONFIG };

/**
 * Retrieve with document ID filter: Only retrieve chunks from specified documents
 * @param question - User question
 * @param docIds - Document ID list to retrieve
 * @param apiKey - OpenAI API key
 * @param db - D1 database instance
 * @returns Top-K most relevant chunks
 */
export async function retrieveWithDocFilter(
  question: string,
  docIds: number[],
  apiKey: string,
  db: D1Database
): Promise<RetrievedChunk[]> {
  // Empty array returns directly
  if (docIds.length === 0) {
    return [];
  }

  // 1. Generate query vector
  const queryEmbedding = await getOpenAIEmbedding(question, apiKey);
  const queryVector = toFloat32Array(queryEmbedding);

  // 2. Get chunks from specified documents
  const chunks = await getCachedChunksByDocIds(db, docIds);

  if (chunks.length === 0) {
    return [];
  }

  // 3. Batch get document info
  const allDocs = await getCachedAllDocs(db);
  const docMap = new Map(allDocs.map(d => [d.id, d.filename]));

  // 4. Calculate similarity for each chunk
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

  // 5. Sort by similarity descending
  scored.sort((a, b) => b.similarity - a.similarity);

  // 6. Filter low similarity results and return Top-K
  return scored
    .filter(item => item.similarity >= RETRIEVE_CONFIG.minSimilarity)
    .slice(0, RETRIEVE_CONFIG.topK);
}
