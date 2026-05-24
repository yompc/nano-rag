'use client';

import { useMemo, useEffect, useState } from 'react';
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

/**
 * 使用 Pretext 预计算消息高度
 * 
 * 避免 DOM 测量导致的 layout thrashing
 * 相比 getBoundingClientRect，性能提升 200x+
 */
export function useMessageHeight({
  content,
  maxWidth,
  lineHeight = 24,
  font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}: UseMessageHeightOptions): UseMessageHeightReturn {
  const [isClient, setIsClient] = useState(false);

  // 确保只在客户端执行（Pretext 需要 Canvas）
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 缓存 prepare 结果（expensive）
  const prepared = useMemo(() => {
    if (!isClient || !content) return null;
    
    try {
      // 移除 Markdown 标记，只计算纯文本高度
      const plainText = content
        .replace(/\*\*/g, '') // bold
        .replace(/\*/g, '')   // italic
        .replace(/`/g, '')    // code
        .replace(/\[|\]/g, '') // links
        .replace(/\(.*?\)/g, '') // link urls
        .replace(/#/g, '')    // headers
        .replace(/>/g, '')    // quotes
        .replace(/-/g, '')    // lists
        .trim();
      
      return prepare(plainText || ' ', font, { whiteSpace: 'pre-wrap' });
    } catch {
      return null;
    }
  }, [content, font, isClient]);

  // 计算布局（cheap，可频繁调用）
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

/**
 * 批量计算多条消息的高度
 * 用于虚拟滚动或初始布局
 */
export function useMessagesHeights(
  messages: Array<{ content: string; id: string }>,
  maxWidth: number,
  lineHeight = 24
): Map<string, number> {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
