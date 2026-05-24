/**
 * 缓存工具模块 - 底层 Cache API 封装
 * 提供通用的缓存读写能力，不依赖具体的数据访问实现
 */

const CACHE_NAMESPACE = 'https://nano-rag.internal/cache/';
const DEFAULT_TTL = 3600; // 1 小时

/**
 * 构建缓存键
 */
export function buildCacheKey(type: string, key: string): Request {
  return new Request(`${CACHE_NAMESPACE}${type}/${key}`);
}

/**
 * 获取 Cache 实例
 * 在 OpenNext for Cloudflare 中，需要使用 globalThis.caches
 */
function getCache(): Cache | undefined {
  const cacheApi = (globalThis as any).caches;
  return cacheApi?.default;
}

/**
 * 从缓存读取数据
 * @returns 缓存数据，未命中返回 undefined
 */
export async function getFromCache<T>(cacheKey: Request): Promise<T | undefined> {
  const cache = getCache();
  if (!cache) return undefined;

  try {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const data = await cached.json();
      console.log(`[Cache] HIT: ${cacheKey.url}`);
      return data as T;
    }
  } catch {
    console.log(`[Cache] CORRUPT: ${cacheKey.url}, deleting`);
    await cache.delete(cacheKey);
  }

  console.log(`[Cache] MISS: ${cacheKey.url}`);
  return undefined;
}

/**
 * 写入缓存
 */
export async function setToCache<T>(cacheKey: Request, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
  const cache = getCache();
  if (!cache) return;

  try {
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `s-maxage=${ttl}`,
      },
    });
    await cache.put(cacheKey, response);
  } catch (error) {
    console.log(`[Cache] WRITE FAILED: ${cacheKey.url}`);
  }
}

/**
 * 删除缓存
 */
export async function deleteFromCache(cacheKey: Request): Promise<void> {
  const cache = getCache();
  if (!cache) return;

  await cache.delete(cacheKey);
  console.log(`[Cache] Cleared: ${cacheKey.url}`);
}

/**
 * 缓存类型常量
 */
export const CACHE_TYPES = {
  CHUNKS: 'chunks',
  DOCS: 'docs',
  KEYWORDS: 'keywords',
} as const;

/**
 * TTL 常量
 */
export const CACHE_TTL = {
  DEFAULT: DEFAULT_TTL,
} as const;
