-- D1 Database Schema for Nano RAG
-- Initial migration: Core tables for document processing and chat logging

-- docs表：文档元信息
CREATE TABLE IF NOT EXISTS docs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  doc_type TEXT NOT NULL DEFAULT 'manual',
  uploaded_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- chunks表：文档切片
CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  page INTEGER NOT NULL,
  embedding_json TEXT NOT NULL,  -- JSON数组存储向量 (1024维 Mistral embedding)
  keywords_json TEXT NOT NULL,   -- JSON数组存储关键词
  char_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (doc_id) REFERENCES docs(id)
);

-- checkpoints表：LangGraph状态持久化
CREATE TABLE IF NOT EXISTS checkpoints (
  thread_id TEXT PRIMARY KEY,
  checkpoint TEXT NOT NULL,  -- JSON序列化状态
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- 索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_docs_uploaded ON docs(uploaded_at);
