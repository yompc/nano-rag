# Nano-RAG - Lightweight Edge RAG Framework

<p align="center">
  <strong>Lightweight Edge RAG Framework - Intelligent Document Q&A System based on LangGraph</strong>
  <br>
  <sub>Next.js + Cloudflare Workers + D1</sub>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <a href="https://nano-rag.yomigi.com" target="_blank"><strong>Live Demo →</strong></a>
</p>

---

## Introduction

Nano-RAG is a lightweight Retrieval-Augmented Generation (RAG) application designed for individuals and small teams. It enables PDF document upload and generates high-quality Q&A responses through intelligent retrieval and LLM.

**Core Features:**

- 🚀 **Edge Deployment** - Based on Cloudflare Workers, low latency globally
- 🧠 **Intelligent Retrieval** - Multi-stage RAG pipeline orchestrated by LangGraph
- 💾 **Serverless Storage** - D1 database + vector retrieval, no extra services needed
- 🎯 **Quality Assurance** - Built-in hallucination detection, quality check and auto-repair

## Features

### Document Management

- PDF document upload and parsing
- Automatic chunking (800-1000 characters/chunk)
- Keyword extraction and document classification

### Intelligent Q&A

- Multi-turn conversation support
- Streaming response output
- Source citation tracing

### RAG Pipeline

```
Question → Relevance Check → Query Rewrite → Document Selection → Vector Retrieval → Generate Answer → Hallucination Check → Quality Check
                                      ↑________________Retry (max 2 times)________________↓
```

| Node | Function |
|------|------|
| `relevance_check` | Check if question is suitable for document retrieval |
| `rewrite_query` | Optimize query statement |
| `document_selector` | Select relevant documents |
| `retrieve` | Vector similarity retrieval Top-5 |
| `generate` | LLM generate answer |
| `hallucination_check` | Hallucination detection |
| `quality_check` | Quality check and repair |

## Tech Stack

| Category | Technology |
|------|------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Cloudflare Workers, OpenNext |
| Database | Cloudflare D1 (SQLite) |
| Orchestration | LangGraph |

## Quick Start

### Requirements

- Node.js 22.13+

### Installation

```bash
# Clone project
git clone https://github.com/your-username/nano-rag.git
cd nano-rag

# Install dependencies
npm install

# Configure environment variables
cp .dev.vars.example .dev.vars
# Edit .dev.vars, fill in OPENAI_API_KEY

# Initialize local database
npx wrangler d1 execute nano-rag-db --local --file=./migrations/0001_init.sql
```

### Development

```bash
# Local preview (Cloudflare Workers runtime, with D1)
npm run preview
# Visit http://localhost:8787

# Pure dev mode (frontend only, no database)
npm run dev
# Visit http://localhost:3000
```

### Deployment

```bash
# Create production database
npx wrangler d1 create nano-rag-production-db

# Update database_id in wrangler.toml

# Execute database migration
npx wrangler d1 execute nano-rag-production-db --remote --file=./migrations/0001_init.sql

# Configure Secrets
npx wrangler secret put OPENAI_API_KEY

# Deploy
npm run deploy
```

For detailed deployment guide, see [DEPLOYMENT.md](./DEPLOYMENT.md).

<p align="center">
  <sub>Built with ❤️ using Next.js, Cloudflare Workers, and LangGraph</sub>
</p>
