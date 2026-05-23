/**
 * 关键词提取模块
 * 使用 LLM 提取3-5个关键词
 */

import { CHAT_CONFIG } from './model-config';

export interface KeywordExtractionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
}

const KEYWORD_PROMPT = `Extract 3-5 most important keywords from the following text. 
Return ONLY a JSON array of keywords, nothing else.
Example: ["keyword1", "keyword2", "keyword3"]

Text:
`;

/**
 * 从文本中提取关键词
 * @param text - 要提取关键词的文本
 * @param apiKey - Mistral API密钥
 * @returns 关键词数组（3-5个）
 */
export async function extractKeywords(text: string, apiKey: string): Promise<string[]> {
  // 如果文本太长，截取前2000字符
  const truncatedText = text.length > 2000 ? text.slice(0, 2000) : text;

  const maxRetries = 2;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CHAT_CONFIG.timeout);

      const response = await fetch(CHAT_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: CHAT_CONFIG.model,
          messages: [
            {
              role: 'user',
              content: KEYWORD_PROMPT + truncatedText
            }
          ],
          temperature: CHAT_CONFIG.temperature,
          max_tokens: 100
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral Chat API ${response.status}: ${errorText}`);
      }
      
      const data = await response.json() as KeywordExtractionResponse;
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Mistral Chat API');
      }
      
      const content = data.choices[0].message.content.trim();
      
      // 尝试解析JSON数组
      try {
        const keywords = JSON.parse(content);
        
        if (!Array.isArray(keywords)) {
          throw new Error('Response is not an array');
        }
        
        // 验证关键词格式并限制数量
        return keywords
          .filter((k): k is string => typeof k === 'string')
          .map(k => k.trim())
          .filter(k => k.length > 0)
          .slice(0, 5);
      } catch {
        // JSON解析失败，尝试从文本中提取关键词
        return extractKeywordsFromText(content);
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        // 最后一次重试失败，返回空数组而不是抛出错误
        console.error('Keyword extraction failed:', error);
        return [];
      }
      
      // 简单退避
      const delay = 1000 * (attempt + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return [];
}

/**
 * 从文本内容中提取关键词（备用方案）
 */
function extractKeywordsFromText(content: string): string[] {
  // 匹配引号中的内容或逗号分隔的词
  const patterns = [
    /"([^"]+)"/g,
    /'([^']+)'/g,
    /「([^」]+)」/g
  ];
  
  const keywords: string[] = [];
  
  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const matchedKeyword = match[1];
      if (matchedKeyword && matchedKeyword.trim().length > 0) {
        keywords.push(matchedKeyword.trim());
      }
    }
  }
  
  // 如果没有找到引号内容，尝试按逗号分割
  if (keywords.length === 0) {
    const parts = content.split(/[,，、\n]/);
    keywords.push(...parts
      .map(p => p.trim())
      .filter(p => p.length > 0 && p.length < 50)
    );
  }
  
  return keywords.slice(0, 5);
}
