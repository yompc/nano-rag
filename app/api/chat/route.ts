import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { runRAG } from '@/lib/graph/rag-graph';
import { addMessage, getRecentMessages, createChatSession } from '@/lib/chat-history';
import type { D1Database } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface Env {
  DB: D1Database;
  OPENAI_API_KEY?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    
    if (!env.DB) {
      return NextResponse.json(
        { error: '数据库未绑定' },
        { status: 500 }
      );
    }
    
    const body = await request.json();
    const { question, sessionId } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: '问题不能为空' },
        { status: 400 }
      );
    }

    const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API密钥未配置' },
        { status: 500 }
      );
    }

    const db = env.DB;
    const currentSessionId = sessionId || await createChatSession(db, null, question.slice(0, 50));

    const recentMessages = await getRecentMessages(db, currentSessionId, 6);
    
    await addMessage(db, currentSessionId, 'user', question);

    const result = await runRAG({
      question,
      messages: recentMessages,
      apiKey,
      db,
    });

    await addMessage(db, currentSessionId, 'assistant', result.answer);

    return NextResponse.json({
      success: true,
      sessionId: currentSessionId,
      answer: result.answer,
      sources: result.sources,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '处理请求时出错',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
