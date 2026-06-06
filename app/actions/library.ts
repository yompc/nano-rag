'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database, Doc } from '@/lib/types';
import { listDocs, deleteDoc, deleteChunksByDocId, getChunksByDocId, invalidateCache } from '@/lib/db';
import { verifyAdminPassword } from '@/lib/auth/password';

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
 * Get document list (including chunk count for each document)
 */
export async function listDocuments(): Promise<ListDocsResult> {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    
    if (!env.DB) {
      return { success: false, error: 'D1 database not bound' };
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
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to get document list: ${message}` };
  }
}

/**
 * Delete document and all its chunks
 */
export async function deleteDocument(docId: number, password?: string): Promise<DeleteDocResult> {
  // Verify admin password
  const verification = await verifyAdminPassword(password);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    
    if (!env.DB) {
      return { success: false, error: 'D1 database not bound' };
    }

    await deleteChunksByDocId(env.DB, docId);
    const deleted = await deleteDoc(env.DB, docId);

    if (!deleted) {
      return { success: false, error: 'Document does not exist or has been deleted' };
    }

    await invalidateCache('all');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Failed to delete document: ${message}` };
  }
}
