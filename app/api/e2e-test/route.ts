import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { D1Database } from '@/lib/types';
import { getMistralEmbedding } from '@/lib/embedding';
import { retrieveChunks } from '@/app/actions/retrieve';

export const dynamic = 'force-dynamic';

interface Env {
  DB: D1Database;
  OPENAI_API_KEY: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
  details?: unknown;
}

export async function GET() {
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  try {
    const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
    
    // 测试 1: 数据库连接
    const dbTestStart = Date.now();
    try {
      const dbTest = await env.DB.prepare('SELECT 1 as test').first<{ test: number }>();
      results.push({
        name: '数据库连接',
        passed: dbTest?.test === 1,
        message: dbTest?.test === 1 ? '数据库连接正常' : '数据库连接异常',
        duration: Date.now() - dbTestStart,
        details: dbTest
      });
    } catch (error) {
      results.push({
        name: '数据库连接',
        passed: false,
        message: `数据库连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
        duration: Date.now() - dbTestStart
      });
    }

    // 测试 2: 表结构验证
    const schemaTestStart = Date.now();
    try {
      const tables = await env.DB.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('docs', 'chunks', 'chat_sessions', 'chat_messages')
        ORDER BY name
      `).all<{ name: string }>();
      
      const expectedTables = ['chat_messages', 'chat_sessions', 'chunks', 'docs'];
      const actualTables = tables.results.map(t => t.name).sort();
      const tablesMatch = JSON.stringify(expectedTables) === JSON.stringify(actualTables);
      
      results.push({
        name: '表结构验证',
        passed: tablesMatch,
        message: tablesMatch 
          ? '所有必需表存在' 
          : `缺少表: ${expectedTables.filter(t => !actualTables.includes(t)).join(', ')}`,
        duration: Date.now() - schemaTestStart,
        details: { expected: expectedTables, actual: actualTables }
      });
    } catch (error) {
      results.push({
        name: '表结构验证',
        passed: false,
        message: `表结构验证失败: ${error instanceof Error ? error.message : '未知错误'}`,
        duration: Date.now() - schemaTestStart
      });
    }

    // 测试 3: 数据统计
    const statsTestStart = Date.now();
    try {
      const docCount = await env.DB.prepare('SELECT COUNT(*) as count FROM docs').first<{ count: number }>();
      const chunkCount = await env.DB.prepare('SELECT COUNT(*) as count FROM chunks').first<{ count: number }>();
      
      results.push({
        name: '数据统计',
        passed: true,
        message: `文档数: ${docCount?.count || 0}, 片段数: ${chunkCount?.count || 0}`,
        duration: Date.now() - statsTestStart,
        details: {
          documents: docCount?.count || 0,
          chunks: chunkCount?.count || 0
        }
      });
    } catch (error) {
      results.push({
        name: '数据统计',
        passed: false,
        message: `数据统计失败: ${error instanceof Error ? error.message : '未知错误'}`,
        duration: Date.now() - statsTestStart
      });
    }

    // 测试 4: API Key 配置
    const apiKeyTestStart = Date.now();
    const hasApiKey = !!env.OPENAI_API_KEY;
    results.push({
      name: 'API Key 配置',
      passed: hasApiKey,
      message: hasApiKey ? 'OPENAI_API_KEY 已配置' : 'OPENAI_API_KEY 未配置',
      duration: Date.now() - apiKeyTestStart
    });

    // 测试 5: Embedding 生成（仅在 API Key 存在时）
    if (hasApiKey) {
      const embeddingTestStart = Date.now();
      try {
        const testText = '这是一个测试文本';
        const embedding = await getMistralEmbedding(testText, env.OPENAI_API_KEY);
        
        results.push({
          name: 'Embedding 生成',
          passed: embedding.length === 1024,
          message: embedding.length === 1024 
            ? 'Embedding 维度正确 (1024)' 
            : `Embedding 维度异常: ${embedding.length}`,
          duration: Date.now() - embeddingTestStart,
          details: { dimension: embedding.length }
        });
      } catch (error) {
        results.push({
          name: 'Embedding 生成',
          passed: false,
          message: `Embedding 生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
          duration: Date.now() - embeddingTestStart
        });
      }
    }

    // 测试 6: 检索功能（仅在 API Key 存在且有数据时）
    if (hasApiKey) {
      const retrieveTestStart = Date.now();
      try {
        const retrieveResult = await retrieveChunks({ query: '测试查询' });
        
        results.push({
          name: '检索功能',
          passed: retrieveResult.success,
          message: retrieveResult.success 
            ? `检索成功，返回 ${retrieveResult.results?.length || 0} 个结果`
            : `检索失败: ${retrieveResult.error}`,
          duration: Date.now() - retrieveTestStart,
          details: {
            success: retrieveResult.success,
            resultCount: retrieveResult.results?.length || 0,
            error: retrieveResult.error
          }
        });
      } catch (error) {
        results.push({
          name: '检索功能',
          passed: false,
          message: `检索功能测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
          duration: Date.now() - retrieveTestStart
        });
      }
    }

    // 测试 7: 关键词过滤功能
    if (hasApiKey) {
      const keywordTestStart = Date.now();
      try {
        const keywordResult = await retrieveChunks({ 
          query: '测试查询',
          keywords: ['关键词1', '关键词2']
        });
        
        results.push({
          name: '关键词过滤',
          passed: keywordResult.success,
          message: keywordResult.success 
            ? '关键词过滤功能正常'
            : `关键词过滤失败: ${keywordResult.error}`,
          duration: Date.now() - keywordTestStart,
          details: {
            success: keywordResult.success,
            resultCount: keywordResult.results?.length || 0
          }
        });
      } catch (error) {
        results.push({
          name: '关键词过滤',
          passed: false,
          message: `关键词过滤测试失败: ${error instanceof Error ? error.message : '未知错误'}`,
          duration: Date.now() - keywordTestStart
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;

    return NextResponse.json({
      success: failedCount === 0,
      summary: {
        total: results.length,
        passed: passedCount,
        failed: failedCount,
        duration: totalDuration
      },
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length + 1,
        duration: Date.now() - startTime
      },
      results,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
