/**
 * 向量工具函数
 * 提供embedding向量的解析和相似度计算功能
 */

/**
 * 计算两个Float32Array向量的余弦相似度
 * @param a - 第一个向量 (Float32Array)
 * @param b - 第二个向量 (Float32Array)
 * @returns 余弦相似度 (-1 到 1)
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`向量维度不匹配: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  // 处理零向量情况
  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 将JSON字符串解析为Float32Array
 * @param jsonStr - JSON格式的向量字符串
 * @returns Float32Array
 */
export function parseEmbeddingToFloat32Array(jsonStr: string): Float32Array {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      throw new Error('Parsed embedding is not an array');
    }
    return new Float32Array(parsed);
  } catch (error) {
    throw new Error(`Failed to parse embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 将number[]转换为Float32Array
 * @param arr - 普通数字数组
 * @returns Float32Array
 */
export function toFloat32Array(arr: number[]): Float32Array {
  return new Float32Array(arr);
}

/**
 * 计算查询向量与候选向量列表的相似度并排序
 * @param queryVector - 查询向量 (Float32Array)
 * @param candidates - 候选向量列表，每个包含id和向量数据
 * @param topK - 返回前K个结果
 * @returns 排序后的Top-K结果
 */
export function rankBySimilarity(
  queryVector: Float32Array,
  candidates: Array<{ id: number; vector: Float32Array; metadata?: unknown }>,
  topK: number
): Array<{ id: number; similarity: number; metadata?: unknown }> {
  // 计算所有相似度
  const scored = candidates.map(candidate => ({
    id: candidate.id,
    similarity: cosineSimilarity(queryVector, candidate.vector),
    metadata: candidate.metadata
  }));

  // 按相似度降序排序
  scored.sort((a, b) => b.similarity - a.similarity);

  // 返回Top-K
  return scored.slice(0, topK);
}

/**
 * 估算内存使用量
 * 200条 × 1024维 × 4字节 = ~0.8MB
 * @param count - 向量数量
 * @param dimensions - 向量维度
 * @returns 内存使用量（字节）
 */
export function estimateMemoryUsage(count: number, dimensions: number = 1024): number {
  return count * dimensions * 4; // Float32 = 4 bytes
}
