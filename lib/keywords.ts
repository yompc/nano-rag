/**
 * Keyword Extraction Module
 * Use LLM to extract 3-5 keywords
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
 * Extract keywords from text
 * @param text - Text to extract keywords from
 * @param apiKey - OpenAI API key
 * @returns Keyword array (3-5 keywords)
 */
export async function extractKeywords(text: string, apiKey: string): Promise<string[]> {
  // If text is too long, truncate to first 2000 characters
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
        throw new Error(`OpenAI Chat API ${response.status}: ${errorText}`);
      }
      
      const data = await response.json() as KeywordExtractionResponse;
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI Chat API');
      }
      
      const content = data.choices[0].message.content.trim();

      // Try to parse JSON array
      try {
        const keywords = JSON.parse(content);

        if (!Array.isArray(keywords)) {
          throw new Error('Response is not an array');
        }

        // Validate keyword format and limit count
        return keywords
          .filter((k): k is string => typeof k === 'string')
          .map(k => k.trim())
          .filter(k => k.length > 0)
          .slice(0, 5);
      } catch {
        // JSON parse failed, try to extract keywords from text
        return extractKeywordsFromText(content);
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        // Last retry failed, return empty array instead of throwing error
        console.error('Keyword extraction failed:', error);
        return [];
      }

      // Simple backoff
      const delay = 1000 * (attempt + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return [];
}

/**
 * Extract keywords from text content (fallback)
 */
function extractKeywordsFromText(content: string): string[] {
  // Match content in quotes or comma-separated words
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

  // If no quoted content found, try splitting by comma
  if (keywords.length === 0) {
    const parts = content.split(/[,，、\n]/);
    keywords.push(...parts
      .map(p => p.trim())
      .filter(p => p.length > 0 && p.length < 50)
    );
  }
  
  return keywords.slice(0, 5);
}
