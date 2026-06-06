# Nano-RAG Project Guide

RAG application based on Next.js + Cloudflare Workers + LangGraph.

## Core Commands

```bash
# Local development (pure Next.js, no D1 database)
npm run dev                    # http://localhost:3000

# Local preview (Cloudflare Workers runtime, with D1)
npm run preview                # http://localhost:8787

# Production deployment
npm run deploy                 # Build + deploy to Cloudflare Workers

# Code linting
npm run lint                   # ESLint
npx tsc --noEmit               # Type checking

# E2E testing
npm run test:e2e               # Local test
npm run test:e2e:prod https://your-app.workers.dev  # Production environment test
```

## Environment Setup

1. **Required**: Node.js 22.13+
2. **Required**: OpenAI API Key

```bash
# Copy environment variables template
cp .dev.vars.example .dev.vars
# Edit .dev.vars, fill in OPENAI_API_KEY

# Initialize local D1 database
npx wrangler d1 execute nano-rag-db --local --file=./migrations/0001_init.sql
```

## Architecture Overview

```
app/
├── api/chat/          # Chat API (streaming response)
├── actions/           # Server Actions (upload, retrieve, etc.)
├── chat/              # Chat page
├── upload/            # Document upload page
└── library/           # Document library page

lib/
├── graph/             # LangGraph RAG pipeline
│   ├── rag-graph.ts   # Graph definition and execution
│   ├── state.ts       # State types
│   └── nodes/         # Processing nodes
├── db.ts              # D1 database operations
├── embedding.ts       # OpenAI Embedding API
├── retrieve.ts        # Vector similarity retrieval
└── chunking.ts        # Document chunking
```

## RAG Pipeline Flow

```
Question → Relevance Check → Query Rewrite → Document Selection → Vector Retrieval → Generate Answer → Hallucination Check → Quality Check
                                      ↑________Retry (max 2 times)________↓
```

Node order (see `lib/graph/rag-graph.ts`):
1. `relevance_check` - Check if question is suitable for document retrieval
2. `rewrite_query` - Optimize query statement
3. `document_selector` - Select relevant documents
4. `retrieve` - Vector similarity retrieval Top-5
5. `generate` - LLM generate answer
6. `hallucination_check` - Hallucination detection
7. `quality_check` - Quality check and repair

## Key Configuration

| Parameter | Value | Location |
|------|-----|------|
| Embedding dimensions | 1024 | `lib/model-config.ts` |
| Chunk size | 800-1000 characters | `lib/chunking.ts` |
| Top-K retrieval | 5 | `lib/retrieve.ts` |
| Similarity threshold | 0.5 | `lib/retrieve.ts` |
| Max retry count | 2 | `lib/graph/rag-graph.ts` |

## Database Schema

D1 database tables (see `migrations/0001_init.sql`):
- `docs` - Document metadata
- `chunks` - Document chunks (contains embedding_json)
- `chat_logs` - Conversation logs
- `checkpoints` - LangGraph state persistence
- `chat_sessions` / `chat_messages` - Session management

## Deployment Notes

1. **Production database**: Need to create D1 database first and update `database_id` in `wrangler.toml`
2. **Secrets**: Use `npx wrangler secret put OPENAI_API_KEY` to set production environment key
3. **Migration**: Execute `npx wrangler d1 execute <db-name> --remote --file=./migrations/0001_init.sql` before deployment

See `DEPLOYMENT.md` for details.

## Development Notes

- **Local dev mode** (`npm run dev`) doesn't support D1 database, APIs will error. Use `npm run preview` to test full functionality
- **Path alias**: `@/*` maps to project root directory
- **Tailwind 4**: Uses `@tailwindcss/postcss` plugin
- **Streaming response**: Chat API uses SSE, see `lib/streaming/types.ts`
- **Vector storage**: Embeddings are stored as JSON arrays in D1's `embedding_json` field

## Common Issues

- **Database connection failed**: Ensure local migration command was executed
- **Embedding error**: Check if OPENAI_API_KEY is valid
- **Vector retrieval empty**: Check if database has data, if similarity threshold is too high
