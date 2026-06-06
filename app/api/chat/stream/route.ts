import { NextRequest } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { runRAGStream } from '@/lib/graph/rag-graph';
import { encodeEvent, createTimestamp, type StreamController, type SourceWithSimilarity, type StatusEvent, type QualityCheckEvent, type ThinkingEvent } from '@/lib/streaming/types';
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
      return new Response('Database not bound', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const body = await request.json();
    const { question, messages: historyMessages } = body;

    if (!question || typeof question !== 'string') {
      return new Response('Question cannot be empty', {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const apiKey = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return new Response('API key not configured', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const encoder = new TextEncoder();
    const db = env.DB;

    // Use history messages from frontend (retrieved from localStorage)
    const recentMessages = historyMessages || [];
    
    const stream = new ReadableStream({
      async start(controller) {
        request.signal.addEventListener('abort', () => {
          controller.close();
        });
        
        try {
          const sendEvent = (eventType: string, data: object) => {
            const message = encodeEvent(eventType, { ...data, timestamp: createTimestamp() });
            controller.enqueue(encoder.encode(message));
          };
          
          const streamController: StreamController = {
            sendStatus: (step: StatusEvent['step'], message: string, metadata?: StatusEvent['metadata']) =>
              sendEvent('status', { step, message, metadata }),
            sendChunk: (content: string) =>
              sendEvent('chunk', { content }),
            sendSources: (sources: SourceWithSimilarity[]) =>
              sendEvent('sources', { count: sources.length, sources }),
            sendError: (message: string, code?: string) =>
              sendEvent('error', { message, code }),
            sendDone: () =>
              sendEvent('done', {}),
            sendQualityCheck: (hasIssues: boolean, issues: QualityCheckEvent['issues'], fixedAnswer?: string) =>
              sendEvent('quality_check', { hasIssues, issues, fixedAnswer }),
            sendRetry: (retryCount: number, reason: string) =>
              sendEvent('retry', { retryCount, reason }),
            sendThinking: (step: ThinkingEvent['step'], content: string, metadata?: ThinkingEvent['metadata']) =>
              sendEvent('thinking', { step, content, metadata })
          };
          
          await runRAGStream({
            question,
            messages: recentMessages,
            apiKey,
            db,
            controller: streamController
          });

          // Explicitly close stream
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error processing request';
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
      `event: error\ndata: {"message":"${error instanceof Error ? error.message : 'Error processing request'}"}\n\n`,
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