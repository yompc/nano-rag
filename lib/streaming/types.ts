export interface BaseEvent {
  type: string;
  timestamp: string;
}

export interface StatusEvent extends BaseEvent {
  type: 'status';
  step: 'rewrite' | 'document_selector' | 'retrieve' | 'generate' | 'check' | 'quality_check' | 'complete' | 'retry';
  message: string;
  metadata?: {
    duration?: number;
    retryCount?: number;
    selectedCount?: number;
  };
}

export interface ChunkEvent extends BaseEvent {
  type: 'chunk';
  content: string;
}

export interface SourcesEvent extends BaseEvent {
  type: 'sources';
  count: number;
  sources: Array<{
    id: number;
    doc_id: number;
    filename: string;
    page: number;
    similarity: number;
    preview: string;
  }>;
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  message: string;
  code?: string;
}

export interface DoneEvent extends BaseEvent {
  type: 'done';
  sessionId: string;
}

export interface QualityCheckEvent extends BaseEvent {
  type: 'quality_check';
  hasIssues: boolean;
  issues: Array<{
    type: 'source_format' | 'content_quality' | 'reference_mismatch' | 'markdown_format';
    description: string;
    location?: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  fixedAnswer?: string;
}

export interface RetryEvent extends BaseEvent {
  type: 'retry';
  retryCount: number;
  reason: string;
}

export type StreamEvent = StatusEvent | ChunkEvent | SourcesEvent | ErrorEvent | DoneEvent | QualityCheckEvent | RetryEvent;

export interface SourceWithSimilarity {
  id: number;
  doc_id: number;
  filename: string;
  page: number;
  similarity: number;
  preview: string;
}

export interface StreamController {
  sendStatus: (step: StatusEvent['step'], message: string, metadata?: StatusEvent['metadata']) => void;
  sendChunk: (content: string) => void;
  sendSources: (sources: SourceWithSimilarity[]) => void;
  sendError: (message: string, code?: string) => void;
  sendDone: (sessionId: string) => void;
  sendQualityCheck: (hasIssues: boolean, issues: QualityCheckEvent['issues'], fixedAnswer?: string) => void;
  sendRetry: (retryCount: number, reason: string) => void;
}

export function encodeEvent(eventType: string, event: object): string {
  const jsonStr = JSON.stringify(event);
  return `event: ${eventType}\ndata: ${jsonStr}\n\n`;
}

export function createTimestamp(): string {
  return new Date().toISOString();
}