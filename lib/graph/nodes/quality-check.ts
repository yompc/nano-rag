/**
 * 质量检测修复节点
 * 使用LLM检测回答中的格式问题并自动修复
 */

import type { RAGState, QualityIssue } from '../state';
import type { RetrievedChunk } from '@/lib/retrieve';
import { CHAT_CONFIG } from '@/lib/model-config';
import {
  QUALITY_CHECK_SYSTEM_PROMPT,
  buildQualityCheckUserPrompt
} from '../prompts/quality-check-prompt';

interface MistralChatResponse {
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
 * 质量检测修复节点
 * @param input - 包含状态和API密钥的输入
 * @returns 包含质量检测结果的状态更新
 */
export async function qualityCheckNode(
  input: QualityCheckInput
): Promise<Partial<RAGState>> {
  const { state, apiKey } = input;
  const { answer, top_chunks, question } = state;

  // 如果没有回答，直接返回
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
    console.error('质量检测失败:', error);
    // 检测失败时，返回原始回答
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
 * 使用LLM进行质量检测和修复
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
        temperature: 0.1 // 使用更低温度确保输出稳定
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Mistral API ${response.status}`);
    }

    const data = await response.json() as MistralChatResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from Mistral');
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
 * 解析LLM返回的质量检测结果
 */
function parseQualityCheckResult(result: string): QualityCheckResult {
  try {
    // 尝试提取JSON部分
    let jsonStr = result;

    // 如果返回包含markdown代码块，提取其中的JSON
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // 尝试找到JSON对象的开始和结束
    const startIndex = jsonStr.indexOf('{');
    const endIndex = jsonStr.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      jsonStr = jsonStr.slice(startIndex, endIndex + 1);
    }

    const parsed = JSON.parse(jsonStr);

    // 验证并规范化结果
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
    // 解析失败，返回原始回答
    return {
      hasIssues: false,
      issues: [],
      fixedAnswer: null
    };
  }
}

/**
 * 验证问题类型
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
 * 验证严重程度
 */
function validateSeverity(severity: string): QualityIssue['severity'] {
  const validSeverities: QualityIssue['severity'][] = ['low', 'medium', 'high'];
  return validSeverities.includes(severity as QualityIssue['severity'])
    ? (severity as QualityIssue['severity'])
    : 'low';
}
