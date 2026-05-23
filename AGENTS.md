# Nano-RAG 项目指南

基于 Next.js + Cloudflare Workers + LangGraph 的 RAG 应用。

## 核心命令

```bash
# 本地开发（纯 Next.js，无 D1 数据库）
npm run dev                    # http://localhost:3000

# 本地预览（Cloudflare Workers 运行时，含 D1）
npm run preview                # http://localhost:8787

# 生产部署
npm run deploy                 # 构建 + 部署到 Cloudflare Workers

# 代码检查
npm run lint                   # ESLint
npx tsc --noEmit               # 类型检查

# E2E 测试
npm run test:e2e               # 本地测试
npm run test:e2e:prod https://your-app.workers.dev  # 生产环境测试
```

## 环境设置

1. **必需**: Node.js 22.13+
2. **必需**: Mistral API Key

```bash
# 复制环境变量模板
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，填入 MISTRAL_API_KEY

# 初始化本地 D1 数据库
npx wrangler d1 execute nano-rag-db --local --file=./migrations/0001_init.sql
```

## 架构概览

```
app/
├── api/chat/          # 聊天 API（流式响应）
├── actions/           # Server Actions（上传、检索等）
├── chat/              # 聊天页面
├── upload/            # 文档上传页面
└── library/           # 文档库页面

lib/
├── graph/             # LangGraph RAG 管道
│   ├── rag-graph.ts   # 图定义与执行
│   ├── state.ts       # 状态类型
│   └── nodes/         # 各处理节点
├── db.ts              # D1 数据库操作
├── embedding.ts       # Mistral Embedding API
├── retrieve.ts        # 向量相似度检索
└── chunking.ts        # 文档分片
```

## RAG 管道流程

```
问题 → 相关性检查 → 查询改写 → 文档选择 → 向量检索 → 生成回答 → 幻觉检测 → 质量检查
                                    ↑________重试(最多2次)________↓
```

节点顺序（见 `lib/graph/rag-graph.ts`）：
1. `relevance_check` - 判断问题是否适合文档检索
2. `rewrite_query` - 优化查询语句
3. `document_selector` - 选择相关文档
4. `retrieve` - 向量相似度检索 Top-5
5. `generate` - LLM 生成回答
6. `hallucination_check` - 幻觉检测
7. `quality_check` - 质量检测与修复

## 关键配置

| 参数 | 值 | 位置 |
|------|-----|------|
| Embedding 维度 | 1024 | `lib/model-config.ts` |
| Chunk 大小 | 800-1000 字符 | `lib/chunking.ts` |
| Top-K 检索 | 5 | `lib/retrieve.ts` |
| 相似度阈值 | 0.5 | `lib/retrieve.ts` |
| 最大重试次数 | 2 | `lib/graph/rag-graph.ts` |

## 数据库 Schema

D1 数据库表（见 `migrations/0001_init.sql`）：
- `docs` - 文档元信息
- `chunks` - 文档切片（含 embedding_json）
- `chat_logs` - 对话日志
- `checkpoints` - LangGraph 状态持久化
- `chat_sessions` / `chat_messages` - 会话管理

## 部署注意事项

1. **生产数据库**: 需先创建 D1 数据库并更新 `wrangler.toml` 中的 `database_id`
2. **Secrets**: 使用 `npx wrangler secret put MISTRAL_API_KEY` 设置生产环境密钥
3. **迁移**: 部署前执行 `npx wrangler d1 execute <db-name> --remote --file=./migrations/0001_init.sql`

详见 `DEPLOYMENT.md`。

## 开发注意事项

- **本地开发模式** (`npm run dev`) 不支持 D1 数据库，API 会报错。需要测试完整功能时使用 `npm run preview`
- **路径别名**: `@/*` 映射到项目根目录
- **Tailwind 4**: 使用 `@tailwindcss/postcss` 插件
- **流式响应**: 聊天 API 使用 SSE，见 `lib/streaming/types.ts`
- **向量存储**: Embedding 以 JSON 数组形式存储在 D1 的 `embedding_json` 字段

## 常见问题

- **数据库连接失败**: 确保执行了本地迁移命令
- **Embedding 错误**: 检查 MISTRAL_API_KEY 是否有效
- **向量检索为空**: 检查数据库是否有数据，相似度阈值是否过高
