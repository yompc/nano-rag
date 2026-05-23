import type { 
  D1Database, 
  Doc, 
  Chunk, 
  ChatLog, 
  Checkpoint,
  CreateDocInput,
  CreateChunkInput,
  CreateChatLogInput 
} from './types';

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

export async function createChatLog(db: D1Database, input: CreateChatLogInput): Promise<number> {
  const result = await db
    .prepare(`INSERT INTO chat_logs (question, rewritten_question, retrieved_chunk_ids, answer, grade) 
              VALUES (?, ?, ?, ?, ?)`)
    .bind(
      input.question,
      input.rewritten_question || null,
      input.retrieved_chunk_ids ? JSON.stringify(input.retrieved_chunk_ids) : null,
      input.answer,
      input.grade || null
    )
    .run();
  
  return result.meta.last_row_id;
}

export async function getChatLogs(db: D1Database, limit = 50): Promise<ChatLog[]> {
  const result = await db
    .prepare('SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT ?')
    .bind(limit)
    .all<ChatLog>();
  
  return result.results;
}

export async function updateChatLogGrade(
  db: D1Database, 
  id: number, 
  grade: 'pass' | 'fail' | 'insufficient'
): Promise<boolean> {
  const result = await db
    .prepare('UPDATE chat_logs SET grade = ? WHERE id = ?')
    .bind(grade, id)
    .run();
  
  return result.meta.changes > 0;
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
