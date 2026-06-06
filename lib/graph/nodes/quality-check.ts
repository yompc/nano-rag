/**
 * Quality Check and Repair Node
 * Uses LLM to detect format issues in answer and auto-repair
 */

import type { RAGState, QualityIssue } from '../state';
import type { RetrievedChunk } from '@/lib/retrieve';
import { CHAT_CONFIG } from '@/lib/model-config';
import {
  QUALITY_CHECK_SYSTEM_PROMPT,
  buildQualityCheckUserPrompt
} from '../prompts/quality-check-prompt';

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface QualityCheckInput {
  state: RAGState;
  apiKey: string;
}

interface QualityCheckResult {
  hasIssues: boolean;
  issues: QualityIssue[];
  fixedAnswer: string | null;
}

/**
 * Quality check and repair node
 * @param input - Input containing state and API key
 * @returns State update with quality check results
 */
export async function qualityCheckNode(
  input: QualityCheckInput
): Promise<Partial<RAGState>> {
  const { state, apiKey } = input;
  const { answer, top_chunks, question } = state;

  // If no answer, return directly
  if (!answer) {
    return { quality_issues: null, fixed_answer: null };
  }

  console.log('[Quality Check] Input:', {
    answerLength: answer?.length,
    chunksCount: top_chunks?.length
  });

  try {
    const result = await performQualityCheck({
      answer,
      chunks: top_chunks,
      question,
      apiKey
    });

    console.log('[Quality Check] Result:', {
      hasIssues: result.hasIssues,
      issueCount: result.issues.length,
      issueTypes: result.issues.map(i => i.type)
    });

    return {
      quality_issues: result.issues.length > 0 ? result.issues : null,
      fixed_answer: result.fixedAnswer
    };
  } catch (error) {
    console.error('Quality check failed:', error);
    // On check failure, return original answer
    return { quality_issues: null, fixed_answer: null };
  }
}

interface PerformQualityCheckInput {
  answer: string;
  chunks: RetrievedChunk[];
  question: string;
  apiKey: string;
}

/**
 * Perform quality check and repair using LLM
 */
async function performQualityCheck(
  input: PerformQualityCheckInput
): Promise<QualityCheckResult> {
  const { answer, chunks, question, apiKey } = input;

  const userPrompt = buildQualityCheckUserPrompt(answer, chunks, question);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_CONFIG.timeout);

  try {
    const response = await fetch(CHAT_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: CHAT_CONFIG.model,
        messages: [
          { role: 'system', content: QUALITY_CHECK_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: CHAT_CONFIG.maxTokens
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenAI API ${response.status}`);
    }

    const data = await response.json() as OpenAIChatResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    const result = data.choices[0].message.content.trim();

    console.log('[Quality Check] LLM Response:', result);

    return parseQualityCheckResult(result);
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Parse quality check result returned by LLM
 */
function parseQualityCheckResult(result: string): QualityCheckResult {
  try {
    // Try to extract JSON part
    let jsonStr = result;

    // If return contains markdown code block, extract JSON from it
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Try to find start and end of JSON object
    const startIndex = jsonStr.indexOf('{');
    const endIndex = jsonStr.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = jsonStr.slice(startIndex, endIndex + 1);
    }

    // Fix control character issues in JSON string
    // Unescaped newlines in string values cause JSON parse failures
    // Use state machine approach, only escape control chars within string values
    jsonStr = sanitizeJsonString(jsonStr);

    const parsed = JSON.parse(jsonStr);

    // Validate and normalize result
    const hasIssues = Boolean(parsed.hasIssues);
    const issues: QualityIssue[] = Array.isArray(parsed.issues)
      ? parsed.issues.map((issue: Record<string, unknown>) => ({
          type: validateIssueType(issue.type as string),
          description: String(issue.description || ''),
          location: issue.location ? String(issue.location) : undefined,
          severity: validateSeverity(issue.severity as string)
        }))
      : [];

    const fixedAnswer = parsed.fixedAnswer && typeof parsed.fixedAnswer === 'string' && parsed.fixedAnswer.trim()
      ? parsed.fixedAnswer.trim()
      : null;

    return {
      hasIssues,
      issues,
      fixedAnswer
    };
  } catch (error) {
    console.error('[Quality Check] Failed to parse result:', error);
    // Parse failed, return original answer
    return {
      hasIssues: false,
      issues: [],
      fixedAnswer: null
    };
  }
}

/**
 * Sanitize control characters in JSON string
 * Only handles unescaped control chars in string values, doesn't affect JSON structure
 */
function sanitizeJsonString(jsonStr: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    const nextChar = jsonStr[i + 1];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      result += char;
      continue;
    }

    if (inString) {
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Validate issue type
 */
function validateIssueType(type: string): QualityIssue['type'] {
  const validTypes: QualityIssue['type'][] = [
    'source_format',
    'content_quality',
    'reference_mismatch',
    'markdown_format'
  ];
  return validTypes.includes(type as QualityIssue['type'])
    ? (type as QualityIssue['type'])
    : 'content_quality';
}

/**
 * Validate severity
 */
function validateSeverity(severity: string): QualityIssue['severity'] {
  const validSeverities: QualityIssue['severity'][] = ['low', 'medium', 'high'];
  return validSeverities.includes(severity as QualityIssue['severity'])
    ? (severity as QualityIssue['severity'])
    : 'low';
}
