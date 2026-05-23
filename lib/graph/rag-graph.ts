import { StateGraph, END } from '@langchain/langgraph';
import type { D1Database } from '@/lib/types';
import { RAGStateAnnotation, type RAGState, type Message } from './state';
import { rewriteQueryNode } from './nodes/rewrite-query';
import { documentSelectorNode } from './nodes/document-selector';
import { retrieveNode } from './nodes/retrieve';
import { generateNode, generateStreamNode } from './nodes/generate';
import { hallucinationCheckNode } from './nodes/hallucination-check';
import { qualityCheckNode } from './nodes/quality-check';
import { relevanceCheckNode } from './nodes/relevance-check';
import type { StreamController, SourceWithSimilarity } from '@/lib/streaming/types';

const MAX_RETRIES = 2;

interface GraphContext {
  apiKey: string;
  db: D1Database;
}

export function createRAGGraph(context: GraphContext) {
  const { apiKey, db } = context;
  
  const workflow = new StateGraph(RAGStateAnnotation);
  
  workflow.addNode('rewrite_query', async (state: RAGState) => {
    return await rewriteQueryNode(state, apiKey);
  });

  workflow.addNode('document_selector', async (state: RAGState) => {
    return await documentSelectorNode({ state, apiKey, db });
  });

  workflow.addNode('retrieve', async (state: RAGState) => {
    return await retrieveNode({ state, apiKey, db });
  });
  
  workflow.addNode('generate', async (state: RAGState) => {
    return await generateNode({ state, apiKey });
  });
  
  workflow.addNode('hallucination_check', async (state: RAGState) => {
    return await hallucinationCheckNode({ state, apiKey });
  });

  workflow.addNode('quality_check', async (state: RAGState) => {
    return await qualityCheckNode({ state, apiKey });
  });

  workflow.addNode('handle_retry', (state: RAGState) => {
    const newRetryCount = state.retry_count + 1;
    console.log('[RAG Flow] Retry:', {
      previousRetryCount: state.retry_count,
      newRetryCount,
      maxRetries: MAX_RETRIES
    });
    return { retry_count: newRetryCount } as Partial<RAGState>;
  });
  
  workflow.addNode('insufficient_data', () => {
    return { answer: '抱歉，根据现有资料无法生成准确回答。' } as Partial<RAGState>;
  });
  
  (workflow as any).addEdge('__start__', 'rewrite_query');
  (workflow as any).addEdge('rewrite_query', 'document_selector');
  (workflow as any).addEdge('document_selector', 'retrieve');
  (workflow as any).addEdge('retrieve', 'generate');
  (workflow as any).addEdge('generate', 'hallucination_check');
  
  (workflow as any).addConditionalEdges(
    'hallucination_check',
    (state: RAGState) => {
      console.log('[RAG Flow] Condition Check:', {
        hallucination: state.hallucination,
        retryCount: state.retry_count,
        maxRetries: MAX_RETRIES,
        decision: state.hallucination === false ? 'QUALITY_CHECK' :
                  state.retry_count < MAX_RETRIES ? 'RETRY' : 'INSUFFICIENT_DATA'
      });

      if (state.hallucination === false) {
        return 'quality_check';
      }

      if (state.retry_count < MAX_RETRIES) {
        return 'handle_retry';
      }

      return 'insufficient_data';
    },
    {
      quality_check: 'quality_check',
      handle_retry: 'handle_retry',
      insufficient_data: 'insufficient_data'
    }
  );

  (workflow as any).addEdge('quality_check', END);
  
  (workflow as any).addEdge('handle_retry', 'rewrite_query');
  (workflow as any).addEdge('insufficient_data', '__end__');
  
  return workflow.compile();
}

interface RunRAGInput {
  question: string;
  messages: Message[];
  apiKey: string;
  db: D1Database;
}

interface RunRAGResult {
  answer: string;
  sources: Array<{
    filename: string;
    page: number;
    content: string;
  }>;
  hallucination: boolean | null;
  retryCount: number;
}

export async function runRAG(input: RunRAGInput): Promise<RunRAGResult> {
  const { question, messages, apiKey, db } = input;

  const graph = createRAGGraph({ apiKey, db });

  const result = await graph.invoke({
    question,
    rewritten_question: null,
    top_chunks: [],
    answer: null,
    hallucination: null,
    retry_count: 0,
    messages,
    selected_doc_ids: undefined,
    quality_issues: null,
    fixed_answer: null,
    is_relevant: null
  } as RAGState);

  return {
    answer: result.fixed_answer || result.answer || '未能生成回答',
    sources: result.top_chunks.map(chunk => ({
      filename: chunk.filename || 'unknown',
      page: chunk.page,
      content: chunk.content
    })),
    hallucination: result.hallucination,
    retryCount: result.retry_count
  };
}

interface RunRAGStreamInput extends RunRAGInput {
  controller: StreamController;
  sessionId: string;
}

/**
 * 流式RAG执行函数
 * 在关键步骤调用controller回调发送事件，记录每个节点的耗时
 * @param input - 包含问题、消息历史、API密钥、数据库、控制器和会话ID的输入
 * @returns RAG执行结果
 */
export async function runRAGStream(input: RunRAGStreamInput): Promise<RunRAGResult> {
  const { question, messages, apiKey, db, controller, sessionId } = input;

  let state: RAGState = {
    question,
    rewritten_question: null,
    top_chunks: [],
    answer: null,
    hallucination: null,
    retry_count: 0,
    messages,
    selected_doc_ids: undefined,
    quality_issues: null,
    fixed_answer: null,
    is_relevant: null
  };

  let finalAnswer: string | null = null;
  let finalSources: SourceWithSimilarity[] = [];

  try {
    // 0. Relevance Check - 判断问题是否适合文档检索
    controller.sendStatus('relevance_check', '正在分析问题...');
    const relevanceStart = Date.now();
    const relevanceResult = await relevanceCheckNode({ state, apiKey });
    state = { ...state, ...relevanceResult };
    controller.sendStatus('relevance_check', '问题分析完成', { duration: Date.now() - relevanceStart });

    // 如果问题不适合文档检索，直接返回友好提示
    if (state.is_relevant === false) {
      const friendlyMessage = '这个问题似乎与文档库中的内容无关。请尝试询问文档中的内容、数据或规定。';
      controller.sendChunk(friendlyMessage);
      controller.sendDone(sessionId);
      return {
        answer: friendlyMessage,
        sources: [],
        hallucination: null,
        retryCount: 0
      };
    }

    // 1. Rewrite Query Node
    controller.sendStatus('rewrite', '正在优化查询...');
    const rewriteStart = Date.now();
    const rewriteResult = await rewriteQueryNode(state, apiKey);
    state = { ...state, ...rewriteResult };
    controller.sendStatus('rewrite', '查询优化完成', { duration: Date.now() - rewriteStart });

    // 2. Document Selector Node
    controller.sendStatus('document_selector', '正在选择相关文档...');
    const docSelectorStart = Date.now();
    const docSelectorResult = await documentSelectorNode({ state, apiKey, db });
    state = { ...state, ...docSelectorResult };
    const docSelectorDuration = Date.now() - docSelectorStart;
    console.log('[RAG Stream] Document selector completed:', {
      selectedCount: state.selected_doc_ids?.length ?? 0
    });
    controller.sendStatus('document_selector', '文档选择完成', {
      duration: docSelectorDuration,
      selectedCount: state.selected_doc_ids?.length ?? 0
    });

    // 3. Retrieve Node
    controller.sendStatus('retrieve', '正在检索相关文档...');
    const retrieveStart = Date.now();
    const retrieveResult = await retrieveNode({ state, apiKey, db });
    state = { ...state, ...retrieveResult };
    const retrieveDuration = Date.now() - retrieveStart;

    // 发送 sources 事件
    if (state.top_chunks.length > 0) {
      finalSources = state.top_chunks.map(chunk => ({
        id: chunk.id,
        doc_id: chunk.doc_id,
        filename: chunk.filename,
        page: chunk.page,
        similarity: chunk.similarity,
        preview: chunk.content.slice(0, 100)
      }));
      controller.sendSources(finalSources);
    }
    controller.sendStatus('retrieve', '文档检索完成', { duration: retrieveDuration });

    // 3. Generate and Hallucination Check with Retry Logic
    let shouldRetry = true;
    let retryIteration = 0;
    let streamedContent = '';

    while (shouldRetry && retryIteration <= MAX_RETRIES) {
      // Generate Node
      controller.sendStatus('generate', retryIteration > 0 ? `正在重新生成回答（第${retryIteration}次重试）...` : '正在生成回答...');
      const generateStart = Date.now();
      const generateResult = await generateStreamNode({ 
        state, 
        apiKey, 
        onChunk: (content: string) => {
          streamedContent += content;
          controller.sendChunk(content);
        }
      });
      state = { ...state, ...generateResult };
      controller.sendStatus('generate', '回答生成完成', { duration: Date.now() - generateStart, retryCount: retryIteration });

      // Hallucination Check Node
      controller.sendStatus('check', '正在验证回答准确性...');
      const checkStart = Date.now();
      const checkResult = await hallucinationCheckNode({ state, apiKey });
      state = { ...state, ...checkResult };
      controller.sendStatus('check', '验证完成', { duration: Date.now() - checkStart });

      // Check if we need to retry
      if (state.hallucination === false) {
        // No hallucination, run quality check
        controller.sendStatus('quality_check', '正在检测回答质量...');
        const qualityStart = Date.now();
        const qualityResult = await qualityCheckNode({ state, apiKey });
        state = { ...state, ...qualityResult };
        const qualityDuration = Date.now() - qualityStart;

        // Use fixed answer if available
        const answerToUse = state.fixed_answer || state.answer;
        if (state.quality_issues && state.quality_issues.length > 0) {
          console.log('[RAG Stream] Quality issues fixed:', {
            issueCount: state.quality_issues.length,
            issueTypes: state.quality_issues.map(i => i.type)
          });
          // 发送修复后的完整回答给客户端
          if (state.fixed_answer) {
            controller.sendQualityCheck(true, state.quality_issues, state.fixed_answer);
          }
          controller.sendStatus('quality_check', `检测到 ${state.quality_issues.length} 个问题，已自动修复`, { duration: qualityDuration });
        } else {
          controller.sendStatus('quality_check', '回答质量检测通过', { duration: qualityDuration });
        }

        shouldRetry = false;
        finalAnswer = answerToUse;
      } else if (retryIteration < MAX_RETRIES) {
        // Hallucination detected, retry
        retryIteration++;
        console.log('[RAG Stream] Retry:', {
          previousRetryCount: retryIteration - 1,
          newRetryCount: retryIteration,
          maxRetries: MAX_RETRIES
        });

        // 发送重试事件，告诉客户端清除之前的内容
        controller.sendRetry(retryIteration, '检测到幻觉内容，正在重新生成');

        // Increment retry count in state for next iteration
        state = { ...state, retry_count: retryIteration };
        // Continue loop for retry
      } else {
        // Max retries reached, return insufficient data message
        shouldRetry = false;
        finalAnswer = '抱歉，根据现有资料无法生成准确回答。';
      }
    }

    // 如果流式传输没有成功发送任何内容，确保答案发送给前端
    if (!streamedContent && finalAnswer) {
      controller.sendChunk(finalAnswer);
    }

    // Send done event
    controller.sendDone(sessionId);

    return {
      answer: finalAnswer || '未能生成回答',
      sources: finalSources.length > 0 ? finalSources.map(s => ({
        filename: s.filename,
        page: s.page,
        content: s.preview
      })) : state.top_chunks.map(chunk => ({
        filename: chunk.filename || 'unknown',
        page: chunk.page,
        content: chunk.content
      })),
      hallucination: state.hallucination,
      retryCount: retryIteration
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    controller.sendError(errorMessage, 'RAG_EXECUTION_ERROR');
    throw error;
  }
}
