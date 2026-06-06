import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const content = `# Nano-RAG

Nano-RAG 是一个轻量化边缘 RAG 框架。

## 核心定位
轻量化边缘 RAG 框架

## 主要功能
- PDF 文档上传与解析
- 智能向量检索
- 多轮对话
- 流式响应
- 幻觉检测与质量控制
- LangGraph 工作流编排

## 技术栈
- Next.js 16 (App Router)
- Cloudflare Workers
- D1 (SQLite)
- LangGraph
- OpenAI (Embedding + LLM)

## 快速开始

1. 克隆项目：
   git clone https://github.com/your-username/nano-rag

2. 安装依赖：
   npm install

3. 配置环境变量：
   cp .dev.vars.example .dev.vars
   # 编辑 .dev.vars，填入 OPENAI_API_KEY

4. 初始化本地数据库：
   npx wrangler d1 execute nano-rag-db --local --file=./migrations/0001_init.sql

5. 启动开发服务器：
   npm run dev

## 文档
官网: https://nano-rag.yomigi.com
GitHub: https://github.com/your-username/nano-rag

## 架构

RAG 管道流程：
问题 → 相关性检查 → 查询改写 → 文档选择 → 向量检索 → 生成回答 → 幻觉检测 → 质量检查

节点顺序：
1. relevance_check - 判断问题是否适合文档检索
2. rewrite_query - 优化查询语句
3. document_selector - 选择相关文档
4. retrieve - 向量相似度检索 Top-5
5. generate - LLM 生成回答
6. hallucination_check - 幻觉检测
7. quality_check - 质量检测与修复

## 配置参数
- Embedding 维度: 1024
- Chunk 大小: 800-1000 字符
- Top-K 检索: 5
- 相似度阈值: 0.5
- 最大重试次数: 2
`

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
