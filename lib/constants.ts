/**
 * 文档类型列表
 */
export const DOC_TYPES = ['manual', 'faq', 'api_doc'] as const;
export type DocType = typeof DOC_TYPES[number];

/**
 * 文档类型标签映射（用于 i18n key）
 */
export const DOC_TYPE_LABELS: Record<string, string> = {
  manual: 'manual',
  faq: 'faq',
  api_doc: 'api_doc',
};

/**
 * RAG 流程步骤 ID 列表
 */
export const STEP_IDS = [
  'relevance_check',
  'rewrite',
  'document_selector',
  'retrieve',
  'generate',
  'check',
  'quality_check',
  'complete'
] as const;

export type StepId = typeof STEP_IDS[number];

/**
 * RAG 流程步骤元数据（用于 i18n）
 */
export const STEP_METADATA: Record<string, { id: string }> = {
  'relevance_check': { id: 'relevance_check' },
  'rewrite': { id: 'rewrite' },
  'document_selector': { id: 'document_selector' },
  'retrieve': { id: 'retrieve' },
  'generate': { id: 'generate' },
  'check': { id: 'check' },
  'quality_check': { id: 'quality_check' },
  'complete': { id: 'complete' },
};

/**
 * @deprecated 使用 STEP_METADATA 和 i18n t('steps.xxx') 替代
 * RAG 流程步骤映射
 */
export const STEP_MAP: Record<string, { id: string; name: string }> = {
  'relevance_check': { id: 'relevance_check', name: 'relevance_check' },
  'rewrite': { id: 'rewrite', name: 'rewrite' },
  'document_selector': { id: 'document_selector', name: 'document_selector' },
  'retrieve': { id: 'retrieve', name: 'retrieve' },
  'generate': { id: 'generate', name: 'generate' },
  'check': { id: 'check', name: 'check' },
  'quality_check': { id: 'quality_check', name: 'quality_check' },
  'complete': { id: 'complete', name: 'complete' },
};
