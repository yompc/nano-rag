-- D1 Database Schema for Nano RAG
-- Initial migration: Core tables for document processing and chat logging

-- docs table: Document metadata
CREATE TABLE IF NOT EXISTS docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'manual',
  uploaded_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- chunks table: Document chunks
CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  page INTEGER NOT NULL,
  embedding_json TEXT NOT NULL,  -- JSON array storing vectors (1536-dim OpenAI embedding)
  keywords_json TEXT NOT NULL,   -- JSON array storing keywords
  char_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (doc_id) REFERENCES docs(id)
);

-- checkpoints table: LangGraph state persistence
CREATE TABLE IF NOT EXISTS checkpoints (
  thread_id TEXT PRIMARY KEY,
  checkpoint TEXT NOT NULL,  -- JSON serialized state
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Indexes for query performance optimization
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_docs_uploaded ON docs(uploaded_at);
