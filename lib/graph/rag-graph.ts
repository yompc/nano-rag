import { StateGraph, END, START } from '@langchain/langgraph';
import type { D1Database } from '@/lib/types';
import { RAGStateAnnotation, type RAGState, type Message } from './state';
import { rewriteQueryNode } from './nodes/rewrite-query';
import { documentSelectorNode } from './nodes/document-selector';
import { retrieveNode } from './nodes/retrieve';
import { generateNode, generateStreamNode } from './nodes/generate';
import { hallucinationCheckNode } from './nodes/hallucination-check';
import { qualityCheckNode } from './nodes/quality-check';
import type { StreamController, SourceWithSimilarity } from '@/lib/streaming/types';

const MAX_RETRIES = 2;

type GraphNodes = 
  | typeof START 
  | 'rewrite_query' 
  | 'document_selector' 
  | 'retrieve' 
  | 'generate' 
  | 'hallucination_check' 
  | 'quality_check' 
  | 'handle_retry' 
  | 'insufficient_data';

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
    return { answer: 'Sorry, unable to generate an accurate answer based on available documents.' } as Partial<RAGState>;
  });
  
  const typedWorkflow = workflow as StateGraph<typeof RAGStateAnnotation, RAGState, Partial<RAGState>, GraphNodes>;
  
  typedWorkflow.addEdge(START, 'rewrite_query');
  typedWorkflow.addEdge('rewrite_query', 'document_selector');
  typedWorkflow.addEdge('document_selector', 'retrieve');
  typedWorkflow.addEdge('retrieve', 'generate');
  typedWorkflow.addEdge('generate', 'hallucination_check');
  
  typedWorkflow.addConditionalEdges(
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

  typedWorkflow.addEdge('quality_check', END);
  
  typedWorkflow.addEdge('handle_retry', 'rewrite_query');
  typedWorkflow.addEdge('insufficient_data', END);
  
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
    fixed_answer: null
  } as RAGState);

  return {
    answer: result.fixed_answer || result.answer || 'Failed to generate answer',
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
}

/**
 * Stream RAG execution function
 * Calls controller callbacks at key steps, records duration of each node
 * @param input - Input containing question, message history, API key, database, controller and session ID
 * @returns RAG execution result
 */
export async function runRAGStream(input: RunRAGStreamInput): Promise<RunRAGResult> {
  const { question, messages, apiKey, db, controller } = input;

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
    fixed_answer: null
  };

  let finalAnswer: string | null = null;
  let finalSources: SourceWithSimilarity[] = [];

  try {
    // 1. Rewrite Query Node
    controller.sendStatus('rewrite', 'Optimizing query...');
    const rewriteStart = Date.now();
    const rewriteResult = await rewriteQueryNode(state, apiKey);
    state = { ...state, ...rewriteResult };
    controller.sendStatus('rewrite', 'Query optimization complete', { duration: Date.now() - rewriteStart });
    controller.sendThinking('rewrite', `Query rewritten: "${state.rewritten_question || question}"`, {
      query: state.rewritten_question || question
    });

    // 2. Document Selector Node
    controller.sendStatus('document_selector', 'Selecting relevant documents...');
    const docSelectorStart = Date.now();
    const docSelectorResult = await documentSelectorNode({ state, apiKey, db });
    state = { ...state, ...docSelectorResult };
    const docSelectorDuration = Date.now() - docSelectorStart;
    console.log('[RAG Stream] Document selector completed:', {
      selectedCount: state.selected_doc_ids?.length ?? 0
    });
    controller.sendStatus('document_selector', 'Document selection complete', {
      duration: docSelectorDuration,
      selectedCount: state.selected_doc_ids?.length ?? 0
    });
    const selectedDocs = state.selected_doc_ids?.length || 0;
      controller.sendThinking('document_selector', `Selected ${selectedDocs} relevant documents from library`, {
      documents: state.selected_doc_ids?.map(id => id.toString()) || []
    });

    // 3. Retrieve Node
    controller.sendStatus('retrieve', 'Retrieving relevant documents...');
    const retrieveStart = Date.now();
    const retrieveResult = await retrieveNode({ state, apiKey, db });
    state = { ...state, ...retrieveResult };
    const retrieveDuration = Date.now() - retrieveStart;

    // Send sources event
    if (state.top_chunks.length > 0) {
      finalSources = state.top_chunks.map(chunk => ({
        id: chunk.id,
        doc_id: chunk.doc_id,
        filename: chunk.filename,
        page: chunk.page,
        similarity: chunk.similarity,
        preview: chunk.content
      }));
      controller.sendSources(finalSources);
    }
    if (state.top_chunks.length > 0) {
      controller.sendThinking('retrieve', `Retrieved ${state.top_chunks.length} relevant document fragments`, {
        documents: state.top_chunks.map(c => c.filename),
        confidence: state.top_chunks[0]?.similarity
      });
    }
    controller.sendStatus('retrieve', 'Document retrieval complete', { duration: retrieveDuration });

    // 3. Generate and Hallucination Check with Retry Logic
    let shouldRetry = true;
    let retryIteration = 0;

    while (shouldRetry && retryIteration <= MAX_RETRIES) {
      // Generate Node
      controller.sendStatus('generate', retryIteration > 0 ? `Regenerating answer (retry ${retryIteration})...` : 'Generating answer...');
      const generateStart = Date.now();
      const generateResult = await generateStreamNode({
        state,
        apiKey,
        onChunk: (content: string) => {
          controller.sendChunk(content);
        }
      });
      state = { ...state, ...generateResult };
      controller.sendStatus('generate', 'Answer generation complete', { duration: Date.now() - generateStart, retryCount: retryIteration });
      controller.sendThinking('generate', `Generated answer based on ${finalSources.length} document fragments`, {
        documents: finalSources.map(s => s.filename)
      });

      // Hallucination Check Node
      controller.sendStatus('check', 'Verifying answer accuracy...');
      const checkStart = Date.now();
      const checkResult = await hallucinationCheckNode({ state, apiKey });
      state = { ...state, ...checkResult };
      controller.sendStatus('check', 'Verification complete', { duration: Date.now() - checkStart });
      const checkResultText = state.hallucination === false ? 'passed' : 'failed';
      controller.sendThinking('check', `Answer verification ${checkResultText}${state.retry_count > 0 ? ` (retry ${state.retry_count})` : ''}`);

      // Check if we need to retry
      if (state.hallucination === false) {
        // No hallucination, run quality check
        controller.sendStatus('quality_check', 'Checking answer quality...');
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
          // Send fixed complete answer to client
          if (state.fixed_answer) {
            controller.sendQualityCheck(true, state.quality_issues, state.fixed_answer);
          }
          controller.sendStatus('quality_check', `Detected ${state.quality_issues.length} issues, auto-fixed`, { duration: qualityDuration });
        } else {
          controller.sendStatus('quality_check', 'Answer quality check passed', { duration: qualityDuration });
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

        // Send retry event, tell client to clear previous content
        controller.sendRetry(retryIteration, 'Hallucination detected, regenerating');

        state = { ...state, retry_count: retryIteration, answer: null };
        // Continue loop for retry
      } else {
        // Max retries reached, return insufficient data message
        shouldRetry = false;
        finalAnswer = 'Sorry, unable to generate an accurate answer based on available documents.';
        // Clear previous content and send final message
        controller.sendRetry(retryIteration + 1, 'Verification failed, showing best answer');
        controller.sendChunk(finalAnswer);
      }
    }

    // Send done event
    controller.sendDone();

    return {
      answer: finalAnswer || 'Failed to generate answer',
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    controller.sendError(errorMessage, 'RAG_EXECUTION_ERROR');
    throw error;
  }
}
