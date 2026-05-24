# Nano-RAG

<p align="center">
  <strong>基于 LangGraph 的智能文档问答系统</strong>
  <br>
  <sub>Next.js + Cloudflare Workers + D1 + Mistral AI</sub>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#架构设计">架构设计</a> •
  <a href="#部署">部署</a>
</p>

---

## 简介

Nano-RAG 是一个轻量级的检索增强生成（RAG）应用，专为个人和小型团队设计。它能够上传 PDF 文档，通过智能检索和 LLM 生成高质量的问答响应。

**核心特点：**

- 🚀 **边缘部署** - 基于 Cloudflare Workers，全球低延迟
- 🧠 **智能检索** - LangGraph 编排的多阶段 RAG 管道
- 💾 **Serverless 存储** - D1 数据库 + 向量检索，无需额外服务
- 🎯 **质量保障** - 内置幻觉检测、质量检测与自动修复

## 功能特性

### 文档管理

- PDF 文档上传与解析
- 自动分片（800-1000 字符/片）
- 关键词提取与文档分类

### 智能问答

- 多轮对话支持
- 流式响应输出
- 来源标注溯源

### RAG 管道

```
问题 → 相关性检查 → 查询改写 → 文档选择 → 向量检索 → 生成回答 → 幻觉检测 → 质量检查
                                    ↑________________重试(最多2次)________________↓
```

| 节点 | 功能 |
|------|------|
| `relevance_check` | 判断问题是否适合文档检索 |
| `rewrite_query` | 优化查询语句 |
| `document_selector` | 选择相关文档 |
| `retrieve` | 向量相似度检索 Top-5 |
| `generate` | LLM 生成回答 |
| `hallucination_check` | 幻觉检测 |
| `quality_check` | 质量检测与修复 |

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | Next.js 16, React 19, Tailwind CSS 4 |
| 后端 | Cloudflare Workers, OpenNext |
| 数据库 | Cloudflare D1 (SQLite) |
| 向量 | Mistral Embedding API (1024维) |
| LLM | Mistral AI |
| 编排 | LangGraph |

## 快速开始

### 环境要求

- Node.js 22.13+
- Mistral API Key

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/nano-rag.git
cd nano-rag

# 安装依赖
npm install

# 配置环境变量
cp .dev.vars.example .dev.vars
# 编辑 .dev.vars，填入 MISTRAL_API_KEY

# 初始化本地数据库
npx wrangler d1 execute nano-rag-db --local --file=./migrations/0001_init.sql
```

### 开发

```bash
# 本地预览（Cloudflare Workers 运行时，含 D1）
npm run preview
# 访问 http://localhost:8787

# 纯开发模式（仅前端，无数据库）
npm run dev
# 访问 http://localhost:3000
```

### 部署

```bash
# 创建生产数据库
npx wrangler d1 create nano-rag-production-db

# 更新 wrangler.toml 中的 database_id

# 执行数据库迁移
npx wrangler d1 execute nano-rag-production-db --remote --file=./migrations/0001_init.sql

# 配置 Secrets
npx wrangler secret put MISTRAL_API_KEY

# 部署
npm run deploy
```

详细部署指南请参阅 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 架构设计

### 目录结构

```
app/
├── api/chat/          # 聊天 API（流式响应）
├── actions/           # Server Actions
├── chat/              # 聊天页面
├── upload/            # 文档上传页面
└── library/           # 文档库页面

lib/
├── graph/             # LangGraph RAG 管道
│   ├── rag-graph.ts   # 图定义与执行
│   ├── state.ts       # 状态类型
│   └── nodes/         # 各处理节点
├── db.ts              # D1 数据库操作
├── embedding.ts       # Mistral Embedding
├── retrieve.ts        # 向量相似度检索
└── chunking.ts        # 文档分片
```

### 数据库 Schema

| 表 | 用途 |
|----|------|
| `docs` | 文档元信息 |
| `chunks` | 文档切片（含 embedding） |
| `chat_sessions` | 会话管理 |
| `chat_messages` | 消息记录 |
| `checkpoints` | LangGraph 状态持久化 |

### 关键配置

| 参数 | 值 | 位置 |
|------|-----|------|
| Embedding 维度 | 1024 | `lib/model-config.ts` |
| Chunk 大小 | 800-1000 字符 | `lib/chunking.ts` |
| Top-K 检索 | 5 | `lib/retrieve.ts` |
| 相似度阈值 | 0.5 | `lib/retrieve.ts` |
| 最大重试次数 | 2 | `lib/graph/rag-graph.ts` |

## 路线图

- [ ] 支持更多文档格式（Word、Markdown）
- [ ] 多语言支持
- [ ] 对话历史导出
- [ ] API Key 管理
- [ ] 向量数据库迁移（Cloudflare Vectorize）

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT

---

<p align="center">
  <a href="https://nano-rag.yomigi.com"><strong>在线体验 →</strong></a>
</p>

<p align="center">
  <sub>构建 with ❤️ using Next.js, Cloudflare Workers, and LangGraph</sub>
</p>
