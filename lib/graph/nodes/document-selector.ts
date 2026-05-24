/**
 * 文档选择器节点
 * 使用 LLM 根据用户问题选择最相关的文档
 */

import type { RAGState } from '../state';
import { CHAT_CONFIG } from '@/lib/model-config';
import { getCachedAllDocs, getCachedDocKeywords } from '@/lib/db';
import type { Doc, D1Database } from '@/lib/types';

const SELECTOR_SYSTEM_PROMPT = `你是文档选择专家。分析用户问题，从候选文档列表中选择最相关的文档。

选择标准：
1. 文档关键词与问题主题高度相关
2. 文件名暗示文档内容可能与问题相关
3. 如果关键词和文件名都不匹配，不要选择该文档

只返回文档 ID 的 JSON 数组，如 [1, 5, 10]。如果没有相关文档，返回 []。`;

interface MistralChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface DocumentSelectorInput {
  state: RAGState;
  apiKey: string;
  db: D1Database;
}

function buildUserPrompt(
  question: string,
  docs: Doc[],
  keywordsMap: Map<number, string[]>
): string {
  const docList = docs
    .map((d) => {
      const keywords = keywordsMap.get(d.id) || [];
      const keywordsStr = keywords.length > 0 ? keywords.join(', ') : '无';
      return `- ID: ${d.id}, 文件名: ${d.filename}, 关键词: ${keywordsStr}`;
    })
    .join('\n');

  return `候选文档：\n${docList}\n\n问题：${question}\n\n请根据文件名和关键词，选择可能包含答案的文档。返回相关文档 ID 的 JSON 数组，如 [1, 5, 10]。如果没有相关文档，返回 []。`;
}

async function selectDocsWithLLM(
  question: string,
  docs: Doc[],
  keywordsMap: Map<number, string[]>,
  apiKey: string
): Promise<number[] | undefined> {
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
            { role: 'system', content: SELECTOR_SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(question, docs, keywordsMap) }
          ],
          temperature: CHAT_CONFIG.temperature,
          max_tokens: 100
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mistral API ${response.status}: ${errorText}`);
      }

      const data = await response.json() as MistralChatResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Mistral API');
      }

      const content = data.choices[0].message.content.trim();
      console.log('[Document Selector]', {
        status: 'llm_response',
        rawContent: content.substring(0, 200) // 限制日志长度
      });

      // 尝试解析 JSON 数组
      try {
        const docIds = JSON.parse(content);

        if (!Array.isArray(docIds)) {
          throw new Error('Response is not an array');
        }

        // 验证并过滤有效的文档 ID
        const validDocIds = docIds
          .filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)
          .filter(id => docs.some(d => d.id === id)); // 确保 ID 在候选列表中

        // 如果过滤后为空数组，返回 undefined 触发回退
        if (validDocIds.length === 0) {
          return undefined;
        }

        return validDocIds;
      } catch {
        // JSON 解析失败，尝试从文本中提取数字
        const extractedIds = extractDocIdsFromText(content, docs);
        if (extractedIds.length === 0) {
          return undefined;
        }
        return extractedIds;
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        // 最后一次重试失败，返回 undefined
        console.error('Document selection failed:', error);
        return undefined;
      }

      // 简单退避
      const delay = 1000 * (attempt + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return undefined;
}

/**
 * 从文本内容中提取文档 ID（备用方案）
 * @param content - LLM 返回的文本
 * @param docs - 候选文档列表（用于验证 ID 有效性）
 * @returns 有效的文档 ID 数组
 */
function extractDocIdsFromText(content: string, docs: Doc[]): number[] {
  // 匹配数字（包括方括号内的）
  const numberPattern = /\b\d+\b/g;
  const matches = content.matchAll(numberPattern);
  const validDocIds: number[] = [];

  for (const match of matches) {
    const id = parseInt(match[0], 10);
    // 验证 ID 是正整数且在候选列表中
    if (id > 0 && docs.some(d => d.id === id)) {
      validDocIds.push(id);
    }
  }

  // 去重
  return [...new Set(validDocIds)];
}

/**
 * 文档选择器节点
 * 根据用户问题从所有文档中选择最相关的文档
 * @param input - 包含 state, apiKey 和 db 的输入
 * @returns 包含 selected_doc_ids 的状态更新
 */
export async function documentSelectorNode(
  input: DocumentSelectorInput
): Promise<Partial<RAGState>> {
  const { state, apiKey, db } = input;
  const startTime = Date.now();

  try {
    // 获取所有文档
    const allDocs = await getCachedAllDocs(db);

    // 如果没有文档，返回 undefined
    if (allDocs.length === 0) {
      console.log('[Document Selector]', { status: 'no_documents', totalDocs: 0 });
      return { selected_doc_ids: undefined };
    }

    // 限制候选集大小为 50
    const candidateDocs = allDocs.slice(0, 50);
    console.log('[Document Selector]', {
      status: 'candidates_prepared',
      totalDocs: allDocs.length,
      candidateCount: candidateDocs.length
    });

    const docIds = candidateDocs.map((d) => d.id);
    const keywordsMap = await getCachedDocKeywords(db, docIds);

    const selectedIds = await selectDocsWithLLM(
      state.rewritten_question || state.question,
      candidateDocs,
      keywordsMap,
      apiKey
    );

    const duration = Date.now() - startTime;
    console.log('[Document Selector]', {
      status: 'selection_complete',
      selectedCount: selectedIds?.length ?? 0,
      selectedIds: selectedIds ?? [],
      durationMs: duration
    });

    return { selected_doc_ids: selectedIds };
  } catch (error) {
    // 捕获任何异常，返回 undefined 触发回退
    console.error('Document selector node error:', error);
    return { selected_doc_ids: undefined };
  }
}
