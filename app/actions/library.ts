'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database, Doc } from '@/lib/types';
import { listDocs, deleteDoc, deleteChunksByDocId, getChunksByDocId } from '@/lib/db';

interface Env {
  DB: D1Database;
}

export interface DocWithChunks extends Doc {
  chunk_count: number;
}

export interface ListDocsResult {
  success: boolean;
  docs?: DocWithChunks[];
  error?: string;
}

export interface DeleteDocResult {
  success: boolean;
  error?: string;
}

/**
 * 获取文档列表（包含每个文档的 chunk 数量）
 */
export async function listDocuments(): Promise<ListDocsResult> {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    
    if (!env.DB) {
      return { success: false, error: 'D1数据库未绑定' };
    }

    const docs = await listDocs(env.DB, 100);
    
    const docsWithChunks = await Promise.all(
      docs.map(async (doc) => {
        const chunks = await getChunksByDocId(env.DB, doc.id);
        return {
          ...doc,
          chunk_count: chunks.length,
        };
      })
    );

    return {
      success: true,
      docs: docsWithChunks,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return { success: false, error: `获取文档列表失败: ${message}` };
  }
}

/**
 * 删除文档及其所有 chunks
 */
export async function deleteDocument(docId: number): Promise<DeleteDocResult> {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    
    if (!env.DB) {
      return { success: false, error: 'D1数据库未绑定' };
    }

    await deleteChunksByDocId(env.DB, docId);
    const deleted = await deleteDoc(env.DB, docId);
    
    if (!deleted) {
      return { success: false, error: '文档不存在或已被删除' };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return { success: false, error: `删除文档失败: ${message}` };
  }
}
