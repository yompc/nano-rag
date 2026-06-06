/**
 * RAG State Definition
 * Types and Annotation definitions used by LangGraph state machine
 */

import { Annotation } from '@langchain/langgraph';
import type { RetrievedChunk } from '@/lib/retrieve';

/**
 * Message type
 */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Quality issue type
 */
export interface QualityIssue {
  type: 'source_format' | 'content_quality' | 'reference_mismatch' | 'markdown_format';
  description: string;
  location?: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * RAG State Annotation
 * Defines the complete state structure of LangGraph state machine
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
 * RAG State type (inferred from Annotation)
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
