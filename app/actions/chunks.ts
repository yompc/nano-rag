'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@/lib/types';
import { getCachedChunksByFilename } from '@/lib/db';

interface Env {
  DB: D1Database;
}

export interface ChunkPreview {
  id: number;
  content: string;
  page: number;
  char_count: number;
}

export interface GetChunksByFilenameResult {
  success: boolean;
  chunks?: ChunkPreview[];
  error?: string;
}

/**
 * Get all chunks by filename (for PDF preview) with caching
 */
export async function getChunksByFilename(filename: string): Promise<GetChunksByFilenameResult> {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };

    if (!env.DB) {
      return { success: false, error: 'D1 database not bound' };
    }

    const chunks = await getCachedChunksByFilename(env.DB, filename);

    return {
      success: true,
      chunks: chunks.map(c => ({
        id: c.id,
        content: c.content,
        page: c.page,
        char_count: c.char_count,
      })),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to get chunks: ${message}` };
  }
}
