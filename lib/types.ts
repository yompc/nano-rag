export interface Doc {
  id: number;
  filename: string;
  doc_type: string;
  uploaded_at: number;
}

export interface Chunk {
  id: number;
  doc_id: number;
  content: string;
  page: number;
  embedding_json: string;
  keywords_json: string;
  char_count: number;
  created_at: number;
}

export interface ChatLog {
  id: number;
  question: string;
  rewritten_question: string | null;
  retrieved_chunk_ids: string | null;
  answer: string;
  grade: 'pass' | 'fail' | 'insufficient' | null;
  created_at: number;
}

export interface Checkpoint {
  thread_id: string;
  checkpoint: string;
  updated_at: number;
}

export type DocType = 'manual' | 'faq' | 'api_doc';

export type Grade = 'pass' | 'fail' | 'insufficient';

export interface EmbeddingVector {
  data: number[];
}

export interface ChunkKeywords {
  keywords: string[];
}

export interface RetrievedChunks {
  chunk_ids: number[];
}

export interface CreateDocInput {
  filename: string;
  doc_type?: DocType;
}

export interface CreateChunkInput {
  doc_id: number;
  content: string;
  page: number;
  embedding: number[];
  keywords: string[];
  char_count: number;
}

export interface CreateChatLogInput {
  question: string;
  rewritten_question?: string;
  retrieved_chunk_ids?: number[];
  answer: string;
  grade?: Grade;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1Result>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}
