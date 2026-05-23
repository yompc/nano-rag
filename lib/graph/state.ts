/**
 * RAG状态定义
 * LangGraph状态机使用的类型和Annotation定义
 */

import { Annotation } from '@langchain/langgraph';
import type { RetrievedChunk } from '@/lib/retrieve';

/**
 * 消息类型
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * 质量问题类型
 */
export interface QualityIssue {
  type: 'source_format' | 'content_quality' | 'reference_mismatch' | 'markdown_format';
  description: string;
  location?: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * RAG状态Annotation
 * 定义LangGraph状态机的完整状态结构
 */
export const RAGStateAnnotation = Annotation.Root({
  question: Annotation<string>,
  
  rewritten_question: Annotation<string | null>({
    default: () => null,
    value: (left, right) => right ?? left ?? null
  }),
  
  top_chunks: Annotation<RetrievedChunk[]>({
    default: () => [],
    value: (left, right) => right ?? left ?? []
  }),
  
  answer: Annotation<string | null>({
    default: () => null,
    value: (left, right) => right ?? left ?? null
  }),
  
  hallucination: Annotation<boolean | null>({
    default: () => null,
    value: (left, right) => right ?? left ?? null
  }),
  
  retry_count: Annotation<number>({
    default: () => 0,
    value: (left, right) => right ?? left ?? 0
  }),
  
  messages: Annotation<Message[]>({
    default: () => [],
    value: (left, right) => right ?? left ?? []
  }),
  
  selected_doc_ids: Annotation<number[] | undefined>({
    default: () => undefined,
    value: (left, right) => right ?? left ?? undefined
  }),

  quality_issues: Annotation<QualityIssue[] | null>({
    default: () => null,
    value: (left, right) => right ?? left ?? null
  }),

  fixed_answer: Annotation<string | null>({
    default: () => null,
    value: (left, right) => right ?? left ?? null
  })
});

/**
 * RAG状态类型（从Annotation推断）
 */
export type RAGState = {
  question: string;
  rewritten_question: string | null;
  top_chunks: RetrievedChunk[];
  answer: string | null;
  hallucination: boolean | null;
  retry_count: number;
  messages: Message[];
  selected_doc_ids: number[] | undefined;
  quality_issues: QualityIssue[] | null;
  fixed_answer: string | null;
};
