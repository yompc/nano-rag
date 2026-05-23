/**
 * Embedding功能测试脚本
 * 测试Mistral Embedding、文本分片、关键词提取功能
 */

import { getMistralEmbedding, validateEmbedding } from '../lib/embedding';
import { EMBEDDING_CONFIG } from '../lib/model-config';
import { chunkText, CHUNK_CONFIG } from '../lib/chunking';
import { extractKeywords } from '../lib/keywords';

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

if (!MISTRAL_API_KEY) {
  console.error('❌ 错误: 请设置环境变量 MISTRAL_API_KEY');
  console.error('   示例: MISTRAL_API_KEY=your_key npx tsx scripts/test-embedding.ts');
  process.exit(1);
}

async function testEmbedding() {
  console.log('\n=== 测试1: Embedding生成 ===');
  
  const testText = '这是一个测试文本，用于验证Mistral Embedding API是否正常工作。';
  
  try {
    console.log(`📝 输入文本: "${testText}"`);
    console.log('⏳ 正在生成embedding...');
    
    const startTime = Date.now();
    const embedding = await getMistralEmbedding(testText, MISTRAL_API_KEY!);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Embedding生成成功 (耗时: ${duration}ms)`);
    console.log(`   维度: ${embedding.length}`);
    console.log(`   前5个值: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    const isValid = validateEmbedding(embedding);
    console.log(`   验证: ${isValid ? '✅ 通过' : '❌ 失败'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Embedding测试失败:', error);
    return false;
  }
}

async function testChunking() {
  console.log('\n=== 测试2: 文本分片 ===');
  
  const testText = `
这是第一段文字。它包含了一些内容，用于测试文本分片功能。我们需要确保分片算法能够正确处理各种长度的文本。

这是第二段文字。这段文字稍微长一些，包含了更多的信息。我们希望看到分片算法如何在段落边界进行切分，同时保持内容的完整性。这是非常重要的功能，因为它直接影响到后续的embedding生成和检索效果。

这是第三段文字。这段文字的长度适中，应该能够与前一段文字合并成一个合适的chunk。我们期待看到分片结果符合预期的800-1000字符范围。
  `.trim();
  
  try {
    console.log(`📝 输入文本长度: ${testText.length} 字符`);
    console.log('⏳ 正在分片...');
    
    const chunks = chunkText(testText);
    
    console.log(`✅ 分片完成，共 ${chunks.length} 个片段`);
    chunks.forEach((chunk, i) => {
      console.log(`   片段${i + 1}: ${chunk.charCount} 字符, 页码: ${chunk.pageIndex}`);
      console.log(`      预览: "${chunk.content.slice(0, 50)}..."`);
    });
    
    const allInRange = chunks.every(c => 
      c.charCount >= CHUNK_CONFIG.minSize || chunks.length === 1
    );
    console.log(`   长度验证: ${allInRange ? '✅ 通过' : '⚠️ 有片段过短'}`);
    
    return true;
  } catch (error) {
    console.error('❌ 分片测试失败:', error);
    return false;
  }
}

async function testKeywords() {
  console.log('\n=== 测试3: 关键词提取 ===');
  
  const testText = `
机器学习是人工智能的一个分支，它使用统计技术让计算机系统能够从数据中"学习"。
深度学习是机器学习的一种方法，使用多层神经网络来处理复杂的模式。
自然语言处理（NLP）是人工智能的另一个重要领域，专注于让计算机理解和生成人类语言。
  `.trim();
  
  try {
    console.log(`📝 输入文本: "${testText.slice(0, 100)}..."`);
    console.log('⏳ 正在提取关键词...');
    
    const startTime = Date.now();
    const keywords = await extractKeywords(testText, MISTRAL_API_KEY!);
    const duration = Date.now() - startTime;
    
    console.log(`✅ 关键词提取成功 (耗时: ${duration}ms)`);
    console.log(`   关键词: [${keywords.map(k => `"${k}"`).join(', ')}]`);
    console.log(`   数量: ${keywords.length} 个`);
    
    const validCount = keywords.length >= 3 && keywords.length <= 5;
    console.log(`   数量验证: ${validCount ? '✅ 通过' : '⚠️ 不在3-5范围内'}`);
    
    return true;
  } catch (error) {
    console.error('❌ 关键词提取测试失败:', error);
    return false;
  }
}

async function testIntegration() {
  console.log('\n=== 测试4: 集成测试 ===');
  
  const testText = `
Next.js是一个流行的React框架，用于构建服务器端渲染和静态网站。
它提供了自动代码分割、优化的性能和简单的部署流程。
Cloudflare Workers是一个serverless平台，可以在边缘节点运行JavaScript代码。
将Next.js与Cloudflare Workers结合，可以实现高性能的边缘计算应用。
  `.trim();
  
  try {
    console.log('⏳ 执行完整流程: 分片 → Embedding → 关键词提取');
    
    const startTime = Date.now();
    
    // 分片
    const chunks = chunkText(testText);
    console.log(`   1. 分片: ${chunks.length} 个片段`);
    
    // Embedding（只测试第一个片段）
    const embedding = await getMistralEmbedding(chunks[0].content, MISTRAL_API_KEY!);
    console.log(`   2. Embedding: ${embedding.length} 维向量`);
    
    // 关键词提取
    const keywords = await extractKeywords(chunks[0].content, MISTRAL_API_KEY!);
    console.log(`   3. 关键词: [${keywords.join(', ')}]`);
    
    const duration = Date.now() - startTime;
    console.log(`✅ 集成测试完成 (总耗时: ${duration}ms)`);
    
    return true;
  } catch (error) {
    console.error('❌ 集成测试失败:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 开始测试 Embedding 生成脚本');
  console.log(`📋 配置信息:`);
  console.log(`   - Embedding模型: ${EMBEDDING_CONFIG.model}`);
  console.log(`   - Embedding维度: ${EMBEDDING_CONFIG.dimensions}`);
  console.log(`   - 分片范围: ${CHUNK_CONFIG.minSize}-${CHUNK_CONFIG.maxSize} 字符`);
  
  const results = await Promise.all([
    testEmbedding(),
    testChunking(),
    testKeywords(),
    testIntegration()
  ]);
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n=== 测试总结 ===');
  console.log(`总计: ${passed}/${total} 通过`);
  
  if (passed === total) {
    console.log('✅ 所有测试通过！');
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ 测试脚本执行失败:', error);
  process.exit(1);
});
