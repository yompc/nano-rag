'use server';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@/lib/types';
import { chunkText, type TextChunk } from '@/lib/chunking';
import { getMistralEmbedding, validateEmbedding } from '@/lib/embedding';
import { extractKeywords } from '@/lib/keywords';
import { createDoc, deleteDoc, deleteChunksByDocId, invalidateCache } from '@/lib/db';
import { verifyAdminPassword } from '@/lib/auth/password';

const INGEST_CONFIG = {
  maxChunksPerDoc: 100,
  batchSize: 50,
  timeout: 30000,
  maxRetries: 2
};

/**
 * 解析后的PDF页面数据
 */
interface ParsedPage {
  pageNumber: number;
  text: string;
}

/**
 * 入库输入数据
 */
interface IngestInput {
  filename: string;
  doc_type?: 'manual' | 'faq' | 'api_doc';
  pages: ParsedPage[];
}

/**
 * 入库结果
 */
interface IngestResult {
  success: boolean;
  docId?: number;
  chunkCount?: number;
  error?: string;
}

/**
 * 准备写入的chunk数据
 */
interface PreparedChunk {
  content: string;
  page: number;
  embedding: number[];
  keywords: string[];
  char_count: number;
}

/**
 * Cloudflare环境变量类型
 */
interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
}

export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
  
  if (!env.DB) {
    return { success: false, error: 'D1数据库未绑定' };
  }
  
  if (!env.OPENAI_API_KEY) {
    return { success: false, error: 'OPENAI_API_KEY未配置' };
  }

  if (!input.filename || !input.pages || input.pages.length === 0) {
    return { success: false, error: '无效的输入数据' };
  }

  let docId: number | null = null;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('入库超时')), INGEST_CONFIG.timeout);
    });

    const ingestPromise = async (): Promise<IngestResult> => {
      docId = await createDoc(env.DB, {
        filename: input.filename,
        doc_type: input.doc_type || 'manual'
      });

      if (!docId) {
        throw new Error('创建文档记录失败');
      }

      const allChunks: TextChunk[] = [];
      for (const page of input.pages) {
        const pageChunks = chunkText(page.text, page.pageNumber);
        allChunks.push(...pageChunks);
      }

      if (allChunks.length > INGEST_CONFIG.maxChunksPerDoc) {
        await deleteDoc(env.DB, docId);
        return { 
          success: false, 
          error: `文档chunks数量超过限制（${allChunks.length} > ${INGEST_CONFIG.maxChunksPerDoc}）` 
        };
      }

      const preparedChunks: PreparedChunk[] = [];
      
      for (let i = 0; i < allChunks.length; i++) {
        const chunk = allChunks[i];
        const embedding = await getMistralEmbedding(chunk.content, env.OPENAI_API_KEY);

        if (!validateEmbedding(embedding)) {
          throw new Error(`Chunk ${i + 1} embedding验证失败`);
        }

        const keywords = await extractKeywords(chunk.content, env.OPENAI_API_KEY);
        
        preparedChunks.push({
          content: chunk.content,
          page: chunk.pageIndex,
          embedding,
          keywords,
          char_count: chunk.charCount
        });
      }

      const batches: PreparedChunk[][] = [];
      for (let i = 0; i < preparedChunks.length; i += INGEST_CONFIG.batchSize) {
        batches.push(preparedChunks.slice(i, i + INGEST_CONFIG.batchSize));
      }

      for (const batch of batches) {
        const stmt = env.DB.prepare(`
          INSERT INTO chunks (doc_id, content, page, embedding_json, keywords_json, char_count)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const batchStatements = batch.map(chunk => 
          stmt.bind(
            docId,
            chunk.content,
            chunk.page,
            JSON.stringify(chunk.embedding),
            JSON.stringify(chunk.keywords),
            chunk.char_count
          )
        );

        await env.DB.batch(batchStatements);
      }

      await invalidateCache('all');
      
      return {
        success: true,
        docId,
        chunkCount: preparedChunks.length
      };
    };

    return await Promise.race([ingestPromise(), timeoutPromise]);

  } catch (error) {
    if (docId) {
      try {
        await deleteChunksByDocId(env.DB, docId);
        await deleteDoc(env.DB, docId);
      } catch (rollbackError) {
        console.error('回滚失败:', rollbackError);
      }
    }

    const message = error instanceof Error ? error.message : '未知错误';
    return { success: false, error: `入库失败: ${message}` };
  }
}

/**
 * 批量入库多个文档
 * @param inputs - 文档输入数组
 * @returns 每个文档的入库结果
 */
/**
 * 创建文档记录（不处理内容）
 * @param input - 文档基本信息
 * @returns 创建结果
 */
export async function createDocument(input: {
  filename: string;
  doc_type: 'manual' | 'faq' | 'api_doc';
  password?: string;
}): Promise<{
  success: boolean;
  docId?: number;
  error?: string;
}> {
  const verification = await verifyAdminPassword(input.password);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }
  
  const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
  
  if (!env.DB) {
    return { success: false, error: 'D1数据库未绑定' };
  }
  
  if (!input.filename || input.filename.trim() === '') {
    return { success: false, error: '文件名不能为空' };
  }
  
  try {
    const docId = await createDoc(env.DB, {
      filename: input.filename.trim(),
      doc_type: input.doc_type
    });
    
    if (!docId) {
      return { success: false, error: '创建文档记录失败' };
    }
    
    return {
      success: true,
      docId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return { success: false, error: `创建文档失败: ${message}` };
  }
}

export async function ingestDocuments(inputs: IngestInput[]): Promise<IngestResult[]> {
  const results: IngestResult[] = [];
  
  for (const input of inputs) {
    const result = await ingestDocument(input);
    results.push(result);
  }
  
  return results;
}

/**
 * 单页PDF入库
 * 处理单页PDF的分块、embedding、关键词提取和数据库写入
 * 
 * @param input - 单页入库输入
 * @returns 入库结果及进度信息
 */
export async function ingestPage(input: {
  docId: number;
  filename: string;
  doc_type: string;
  page: { pageNumber: number; text: string };
  pageIndex: number;
  totalPages: number;
}): Promise<{
  success: boolean;
  docId: number;
  chunksInPage: number;
  isComplete: boolean;
  progress: number;
  error?: string;
}> {
  const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
  
  if (!env.DB) {
    return { 
      success: false, 
      docId: input.docId, 
      chunksInPage: 0, 
      isComplete: false, 
      progress: 0, 
      error: 'D1数据库未绑定' 
    };
  }
  
  if (!env.OPENAI_API_KEY) {
    return {
      success: false,
      docId: input.docId,
      chunksInPage: 0,
      isComplete: false,
      progress: 0,
      error: 'OPENAI_API_KEY未配置'
    };
  }

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('单页入库超时')), 60000);
    });

    const ingestPromise = async () => {
      const pageChunks = chunkText(input.page.text, input.page.pageNumber);

      const preparedChunks = await Promise.all(
        pageChunks.map(async (chunk) => {
          const [embedding, keywords] = await Promise.all([
            getMistralEmbedding(chunk.content, env.OPENAI_API_KEY),
            extractKeywords(chunk.content, env.OPENAI_API_KEY)
          ]);
          
          return { 
            content: chunk.content, 
            page: chunk.pageIndex, 
            embedding, 
            keywords, 
            char_count: chunk.charCount 
          };
        })
      );

      if (preparedChunks.length > 0) {
        const stmt = env.DB.prepare(`
          INSERT INTO chunks (doc_id, content, page, embedding_json, keywords_json, char_count)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const batchStatements = preparedChunks.map(chunk => 
          stmt.bind(
            input.docId,
            chunk.content,
            chunk.page,
            JSON.stringify(chunk.embedding),
            JSON.stringify(chunk.keywords),
            chunk.char_count
          )
        );

        await env.DB.batch(batchStatements);
      }

      const progress = Math.round(((input.pageIndex + 1) / input.totalPages) * 100);
      const isComplete = input.pageIndex === input.totalPages - 1;

      if (isComplete) {
        await invalidateCache('all');
      }

      return {
        success: true,
        docId: input.docId,
        chunksInPage: preparedChunks.length,
        isComplete,
        progress
      };
    };

    return await Promise.race([ingestPromise(), timeoutPromise]);

  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return { 
      success: false, 
      docId: input.docId, 
      chunksInPage: 0, 
      isComplete: false, 
      progress: 0, 
      error: `单页入库失败: ${message}` 
    };
  }
}
