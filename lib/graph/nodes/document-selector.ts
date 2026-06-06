/**
 * Document Selector Node
 * Uses LLM to select the most relevant documents based on user question
 */

import type { RAGState } from '../state';
import { CHAT_CONFIG } from '@/lib/model-config';
import { getCachedAllDocs, getCachedDocKeywords } from '@/lib/db';
import type { Doc, D1Database } from '@/lib/types';

const SELECTOR_SYSTEM_PROMPT = `You are a document selection expert. Analyze the user's question and select the most relevant documents from the candidate list.

Selection criteria:
1. Document keywords are highly relevant to the question topic
2. Filename suggests the document content might be related to the question
3. If neither keywords nor filename match, do not select the document

Only return a JSON array of document IDs, e.g., [1, 5, 10]. Return [] if no relevant documents.`;

interface OpenAIChatResponse {
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
      const keywordsStr = keywords.length > 0 ? keywords.join(', ') : 'None';
      return `- ID: ${d.id}, Filename: ${d.filename}, Keywords: ${keywordsStr}`;
    })
    .join('\n');

  return `Candidate documents:\n${docList}\n\nQuestion: ${question}\n\nSelect documents that may contain the answer based on filename and keywords. Return document IDs as a JSON array, e.g., [1, 5, 10]. Return [] if no relevant documents`;
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
        throw new Error(`OpenAI API ${response.status}: ${errorText}`);
      }

      const data = await response.json() as OpenAIChatResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      const content = data.choices[0].message.content.trim();
      console.log('[Document Selector]', {
        status: 'llm_response',
        rawContent: content.substring(0, 200) // 限制日志长度
      });

      // Try to parse JSON array
      try {
        const docIds = JSON.parse(content);

        if (!Array.isArray(docIds)) {
          throw new Error('Response is not an array');
        }

        // Validate and filter valid document IDs
        const validDocIds = docIds
          .filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0)
          .filter(id => docs.some(d => d.id === id)); // 确保 ID 在候选列表中

        // If filtered result is empty array, return undefined to trigger fallback
        if (validDocIds.length === 0) {
          return undefined;
        }

        return validDocIds;
      } catch {
        // JSON parse failed, try to extract numbers from text
        const extractedIds = extractDocIdsFromText(content, docs);
        if (extractedIds.length === 0) {
          return undefined;
        }
        return extractedIds;
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        // Last retry failed, return undefined
        console.error('Document selection failed:', error);
        return undefined;
      }

      // Simple backoff
      const delay = 1000 * (attempt + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return undefined;
}

/**
 * Extract document IDs from text content (fallback)
 * @param content - Text returned by LLM
 * @param docs - Candidate document list (for validating ID validity)
 * @returns Array of valid document IDs
 */
function extractDocIdsFromText(content: string, docs: Doc[]): number[] {
  // Match numbers (including those in square brackets)
  const numberPattern = /\b\d+\b/g;
  const matches = content.matchAll(numberPattern);
  const validDocIds: number[] = [];

  for (const match of matches) {
    const id = parseInt(match[0], 10);
    // Validate ID is positive integer and in candidate list
    if (id > 0 && docs.some(d => d.id === id)) {
      validDocIds.push(id);
    }
  }

  // Deduplicate
  return [...new Set(validDocIds)];
}

/**
 * Document Selector Node
 * Selects the most relevant documents from all documents based on user question
 * @param input - Input containing state, apiKey and db
 * @returns State update containing selected_doc_ids
 */
export async function documentSelectorNode(
  input: DocumentSelectorInput
): Promise<Partial<RAGState>> {
  const { state, apiKey, db } = input;
  const startTime = Date.now();

  try {
    // Get all documents
    const allDocs = await getCachedAllDocs(db);

    // If no documents, return undefined
    if (allDocs.length === 0) {
      console.log('[Document Selector]', { status: 'no_documents', totalDocs: 0 });
      return { selected_doc_ids: undefined };
    }

    // Limit candidate set size to 50
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
    // Catch any exception, return undefined to trigger fallback
    console.error('Document selector node error:', error);
    return { selected_doc_ids: undefined };
  }
}
