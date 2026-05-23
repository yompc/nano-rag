'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@cloudflare/workers-types';

interface UploadPage {
  pageNumber: number;
  text: string;
}

interface UploadTextData {
  filename: string;
  pages: UploadPage[];
}

interface Env {
  DB: D1Database;
}

export async function uploadText(data: UploadTextData) {
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    
    if (!env.DB) {
      return { success: false, error: 'D1数据库未绑定' };
    }

    const documentId = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO documents (id, filename, created_at)
      VALUES (?, ?, ?)
    `).bind(documentId, data.filename, now).run();

    const stmt = env.DB.prepare(`
      INSERT INTO document_pages (id, document_id, page_number, text, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const batchStatements = data.pages.map((page) => 
      stmt.bind(
        crypto.randomUUID(),
        documentId,
        page.pageNumber,
        page.text,
        now
      )
    );

    await env.DB.batch(batchStatements);

    return { 
      success: true, 
      documentId,
      totalPages: data.pages.length 
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return { success: false, error: `上传失败: ${message}` };
  }
}
