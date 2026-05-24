/**
 * 文档类型标签映射
 */
export const DOC_TYPE_LABELS: Record<string, string> = {
  manual: '手册',
  faq: 'FAQ',
  api_doc: 'API文档',
};

/**
 * RAG 流程步骤映射
 */
export const STEP_MAP: Record<string, { id: string; name: string }> = {
  'relevance_check': { id: 'relevance_check', name: '分析问题' },
  'rewrite': { id: 'rewrite', name: '改写查询' },
  'document_selector': { id: 'document_selector', name: '选择文档' },
  'retrieve': { id: 'retrieve', name: '检索文档' },
  'generate': { id: 'generate', name: '生成回答' },
  'check': { id: 'check', name: '验证回答' },
  'quality_check': { id: 'quality_check', name: '质量检测' },
  'complete': { id: 'complete', name: '完成' },
};
