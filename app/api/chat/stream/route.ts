import { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { runRAGStream } from '@/lib/graph/rag-graph';
import { encodeEvent, createTimestamp } from '@/lib/streaming/types';
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
      return new Response('数据库未绑定', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    const body = await request.json();
    const { question, sessionId } = body;

    if (!question || typeof question !== 'string') {
      return new Response('问题不能为空', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response('API密钥未配置', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const encoder = new TextEncoder();
    const db = env.DB;
    const currentSessionId = sessionId || await createChatSession(db, null, question.slice(0, 50));
    
    const stream = new ReadableStream({
      async start(controller) {
        request.signal.addEventListener('abort', () => {
          controller.close();
        });
        
        try {
          const recentMessages = await getRecentMessages(db, currentSessionId, 6);
          await addMessage(db, currentSessionId, 'user', question);
          
          const sendEvent = (eventType: string, data: object) => {
            const message = encodeEvent(eventType, { ...data, timestamp: createTimestamp() });
            controller.enqueue(encoder.encode(message));
          };
          
          const streamController = {
            sendStatus: (step: string, message: string, metadata?: any) =>
              sendEvent('status', { step, message, metadata }),
            sendChunk: (content: string) =>
              sendEvent('chunk', { content }),
            sendSources: (sources: any[]) =>
              sendEvent('sources', { count: sources.length, sources }),
            sendError: (message: string, code?: string) =>
              sendEvent('error', { message, code }),
            sendDone: (sessionId: string) =>
              sendEvent('done', { sessionId }),
            sendQualityCheck: (hasIssues: boolean, issues: any[], fixedAnswer?: string) =>
              sendEvent('quality_check', { hasIssues, issues, fixedAnswer }),
            sendRetry: (retryCount: number, reason: string) =>
              sendEvent('retry', { retryCount, reason }),
            sendThinking: (step: string, content: string, metadata?: any) =>
              sendEvent('thinking', { step, content, metadata })
          };
          
          const result = await runRAGStream({
            question,
            messages: recentMessages,
            apiKey,
            db,
            controller: streamController,
            sessionId: currentSessionId
          });
          
          await addMessage(db, currentSessionId, 'assistant', result.answer);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '处理请求时出错';
          const errorEvent = encoder.encode(
            encodeEvent('error', { message: errorMessage })
          );
          controller.enqueue(errorEvent);
          controller.close();
        }
      }
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat Stream API error:', error);
    return new Response(
      `event: error\ndata: {"message":"${error instanceof Error ? error.message : '处理请求时出错'}"}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        }
      }
    );
  }
}