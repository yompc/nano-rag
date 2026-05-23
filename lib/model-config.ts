/**
 * AI 模型配置
 * 通过环境变量配置，支持不同模型切换
 */

// 从环境变量读取配置，提供默认值
function getEnvVar(key: string, defaultValue: string): string {
  // 在 Cloudflare Workers 环境中，env 会通过绑定传入
  // 这里为本地开发提供默认值
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  return defaultValue;
}

/**
 * 聊天模型配置（用于问答、关键词提取、查询改写、幻觉检测等）
 */
export const CHAT_CONFIG = {
  // 模型名称
  model: getEnvVar('CHAT_MODEL', 'mistral-small-latest'),

  // API 端点
  endpoint: getEnvVar('CHAT_ENDPOINT', 'https://api.mistral.ai/v1/chat/completions'),

  // 生成温度
  temperature: parseFloat(getEnvVar('CHAT_TEMPERATURE', '0.3')),

  // 超时时间（毫秒）
  timeout: parseInt(getEnvVar('CHAT_TIMEOUT', '30000'), 10),
};

/**
 * Embedding 模型配置
 */
export const EMBEDDING_CONFIG = {
  // 模型名称
  model: getEnvVar('EMBEDDING_MODEL', 'mistral-embed'),

  // API 端点
  endpoint: getEnvVar('EMBEDDING_ENDPOINT', 'https://api.mistral.ai/v1/embeddings'),

  // 向量维度
  dimensions: parseInt(getEnvVar('EMBEDDING_DIMENSIONS', '1024'), 10),

  // 超时时间（毫秒）
  timeout: parseInt(getEnvVar('EMBEDDING_TIMEOUT', '10000'), 10),

  // 最大重试次数
  maxRetries: parseInt(getEnvVar('EMBEDDING_MAX_RETRIES', '3'), 10),
};
