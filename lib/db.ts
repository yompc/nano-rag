import type { 
  D1Database, 
  Doc, 
  Chunk, 
  Checkpoint,
  CreateDocInput,
  CreateChunkInput 
} from './types';
import { 
  buildCacheKey, 
  getFromCache, 
  setToCache, 
  deleteFromCache,
  CACHE_TYPES 
} from './cache';

export async function createDoc(db: D1Database, input: CreateDocInput): Promise<number> {
  const result = await db
    .prepare('INSERT INTO docs (filename, doc_type) VALUES (?, ?)')
    .bind(input.filename, input.doc_type || 'manual')
    .run();
  
  return result.meta.last_row_id;
}

export async function getDoc(db: D1Database, id: number): Promise<Doc | null> {
  return await db
    .prepare('SELECT * FROM docs WHERE id = ?')
    .bind(id)
    .first<Doc>();
}

export async function listDocs(db: D1Database, limit = 50): Promise<Doc[]> {
  const result = await db
    .prepare('SELECT * FROM docs ORDER BY uploaded_at DESC LIMIT ?')
    .bind(limit)
    .all<Doc>();
  
  return result.results;
}

export async function createChunk(db: D1Database, input: CreateChunkInput): Promise<number> {
  const result = await db
    .prepare(`INSERT INTO chunks (doc_id, content, page, embedding_json, keywords_json, char_count) 
              VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(
      input.doc_id,
      input.content,
      input.page,
      JSON.stringify(input.embedding),
      JSON.stringify(input.keywords),
      input.char_count
    )
    .run();
  
  return result.meta.last_row_id;
}

export async function getChunksByDocId(db: D1Database, docId: number): Promise<Chunk[]> {
  const result = await db
    .prepare('SELECT * FROM chunks WHERE doc_id = ? ORDER BY page, id')
    .bind(docId)
    .all<Chunk>();
  
  return result.results;
}

export async function getChunk(db: D1Database, id: number): Promise<Chunk | null> {
  return await db
    .prepare('SELECT * FROM chunks WHERE id = ?')
    .bind(id)
    .first<Chunk>();
}

export async function getAllChunks(db: D1Database): Promise<Chunk[]> {
  const result = await db
    .prepare('SELECT * FROM chunks ORDER BY doc_id, page, id')
    .all<Chunk>();
  
  return result.results;
}

export async function saveCheckpoint(
  db: D1Database, 
  threadId: string, 
  checkpoint: string
): Promise<void> {
  await db
    .prepare(`INSERT INTO checkpoints (thread_id, checkpoint, updated_at) 
              VALUES (?, ?, strftime('%s', 'now'))
              ON CONFLICT(thread_id) DO UPDATE SET 
                checkpoint = excluded.checkpoint,
                updated_at = excluded.updated_at`)
    .bind(threadId, checkpoint)
    .run();
}

export async function getCheckpoint(db: D1Database, threadId: string): Promise<Checkpoint | null> {
  return await db
    .prepare('SELECT * FROM checkpoints WHERE thread_id = ?')
    .bind(threadId)
    .first<Checkpoint>();
}

export async function deleteDoc(db: D1Database, id: number): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM docs WHERE id = ?')
    .bind(id)
    .run();
  
  return result.meta.changes > 0;
}

export async function deleteChunksByDocId(db: D1Database, docId: number): Promise<number> {
  const result = await db
    .prepare('DELETE FROM chunks WHERE doc_id = ?')
    .bind(docId)
    .run();
  
  return result.meta.changes;
}

export async function getAllDocs(db: D1Database): Promise<Doc[]> {
  const result = await db
    .prepare('SELECT id, filename, doc_type FROM docs')
    .all<Doc>();
  
  return result.results;
}

export async function getDocKeywords(
  db: D1Database,
  docIds: number[]
): Promise<Map<number, string[]>> {
  const keywordsMap = new Map<number, string[]>();

  for (const docId of docIds) {
    const chunks = await db
      .prepare('SELECT keywords_json FROM chunks WHERE doc_id = ?')
      .bind(docId)
      .all<{ keywords_json: string }>();

    const allKeywords = new Set<string>();
    for (const chunk of chunks.results) {
      try {
        const keywords = JSON.parse(chunk.keywords_json) as string[];
        for (const k of keywords) {
          allKeywords.add(k);
        }
      } catch {
        // skip invalid JSON
      }
    }

    keywordsMap.set(docId, Array.from(allKeywords).slice(0, 10));
  }

  return keywordsMap;
}

export async function getChunksByDocIds(db: D1Database, docIds: number[]): Promise<Chunk[]> {
  if (docIds.length === 0) {
    return [];
  }
  
  const placeholders = docIds.map(() => '?').join(', ');
  const result = await db
    .prepare(`SELECT * FROM chunks WHERE doc_id IN (${placeholders}) ORDER BY doc_id, page, id`)
    .bind(...docIds)
    .all<Chunk>();
  
  return result.results;
}

export async function getCachedAllChunks(db: D1Database): Promise<Chunk[]> {
  const cacheKey = buildCacheKey(CACHE_TYPES.CHUNKS, 'all');
  
  const cached = await getFromCache<Chunk[]>(cacheKey);
  if (cached) return cached;
  
  const data = await getAllChunks(db);
  await setToCache(cacheKey, data);
  return data;
}

export async function getCachedAllDocs(db: D1Database): Promise<Doc[]> {
  const cacheKey = buildCacheKey(CACHE_TYPES.DOCS, 'all');
  
  const cached = await getFromCache<Doc[]>(cacheKey);
  if (cached) return cached;
  
  const data = await getAllDocs(db);
  await setToCache(cacheKey, data);
  return data;
}

export async function getCachedDoc(db: D1Database, id: number): Promise<Doc | null> {
  const cacheKey = buildCacheKey(CACHE_TYPES.DOCS, String(id));
  
  const cached = await getFromCache<Doc>(cacheKey);
  if (cached) return cached;
  
  const data = await getDoc(db, id);
  if (data) {
    await setToCache(cacheKey, data);
  }
  return data;
}

export async function getCachedDocKeywords(
  db: D1Database,
  docIds: number[]
): Promise<Map<number, string[]>> {
  const result = new Map<number, string[]>();

  for (const docId of docIds) {
    const cacheKey = buildCacheKey(CACHE_TYPES.KEYWORDS, String(docId));
    
    const cached = await getFromCache<string[]>(cacheKey);
    if (cached) {
      result.set(docId, cached);
      continue;
    }

    const chunks = await db
      .prepare('SELECT keywords_json FROM chunks WHERE doc_id = ?')
      .bind(docId)
      .all<{ keywords_json: string }>();

    const allKeywords = new Set<string>();
    for (const chunk of chunks.results) {
      try {
        const keywords = JSON.parse(chunk.keywords_json) as string[];
        for (const k of keywords) {
          allKeywords.add(k);
        }
      } catch {
        // skip invalid JSON
      }
    }

    const keywords = Array.from(allKeywords).slice(0, 10);
    result.set(docId, keywords);
    await setToCache(cacheKey, keywords);
  }

  return result;
}

export async function getCachedChunksByDocIds(db: D1Database, docIds: number[]): Promise<Chunk[]> {
  if (docIds.length === 0) return [];

  const sortedIds = [...docIds].sort((a, b) => a - b).join(',');
  const cacheKey = buildCacheKey(CACHE_TYPES.CHUNKS, `by-docs/${sortedIds}`);
  
  const cached = await getFromCache<Chunk[]>(cacheKey);
  if (cached) return cached;
  
  const data = await getChunksByDocIds(db, docIds);
  await setToCache(cacheKey, data);
  return data;
}

export async function invalidateCache(type: 'all' | 'chunks' | 'docs' | 'keywords'): Promise<void> {
  if (type === 'all' || type === 'chunks') {
    await deleteFromCache(buildCacheKey(CACHE_TYPES.CHUNKS, 'all'));
  }
  
  if (type === 'all' || type === 'docs') {
    await deleteFromCache(buildCacheKey(CACHE_TYPES.DOCS, 'all'));
  }
  
  if (type === 'all') {
    console.log('[Cache] Note: keywords/* and chunks/by-docs/* caches will expire by TTL');
  }
}
