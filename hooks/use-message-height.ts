'use client';

import { useMemo, useState } from 'react';
import { prepare, layout } from '@chenglou/pretext';

interface UseMessageHeightOptions {
  content: string;
  maxWidth: number;
  lineHeight?: number;
  font?: string;
}

interface UseMessageHeightReturn {
  height: number | null;
  lineCount: number | null;
  isReady: boolean;
}

export function useMessageHeight({
  content,
  maxWidth,
  lineHeight = 24,
  font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}: UseMessageHeightOptions): UseMessageHeightReturn {
  const [isClient] = useState(() => typeof window !== 'undefined');

  const prepared = useMemo(() => {
    if (!isClient || !content) return null;
    
    try {
      const plainText = content
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`/g, '')
        .replace(/\[|\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/#/g, '')
        .replace(/>/g, '')
        .replace(/-/g, '')
        .trim();
      
      return prepare(plainText || ' ', font, { whiteSpace: 'pre-wrap' });
    } catch {
      return null;
    }
  }, [content, font, isClient]);

  const layoutResult = useMemo(() => {
    if (!prepared || !maxWidth) return null;
    
    try {
      return layout(prepared, maxWidth, lineHeight);
    } catch {
      return null;
    }
  }, [prepared, maxWidth, lineHeight]);

  return {
    height: layoutResult?.height ?? null,
    lineCount: layoutResult?.lineCount ?? null,
    isReady: isClient && layoutResult !== null,
  };
}

export function useMessagesHeights(
  messages: Array<{ content: string; id: string }>,
  maxWidth: number,
  lineHeight = 24
): Map<string, number> {
  const [isClient] = useState(() => typeof window !== 'undefined');

  return useMemo(() => {
    const heights = new Map<string, number>();
    
    if (!isClient) return heights;

    const font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    messages.forEach((msg) => {
      try {
        const plainText = msg.content
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/`/g, '')
          .replace(/\[|\]/g, '')
          .replace(/\(.*?\)/g, '')
          .replace(/#/g, '')
          .replace(/>/g, '')
          .replace(/-/g, '')
          .trim();

        const prepared = prepare(plainText || ' ', font, { whiteSpace: 'pre-wrap' });
        const { height } = layout(prepared, maxWidth, lineHeight);
        heights.set(msg.id, height);
      } catch {
        // 失败时使用预估高度
        const estimatedLines = Math.ceil(msg.content.length / 40);
        heights.set(msg.id, estimatedLines * lineHeight);
      }
    });

    return heights;
  }, [messages, maxWidth, lineHeight, isClient]);
}
