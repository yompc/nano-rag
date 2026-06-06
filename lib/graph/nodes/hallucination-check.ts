/**
 * Hallucination Check Node
 * Uses LLM to detect hallucinations in the answer (content contradicting retrieved sources)
 */

import type { RAGState } from '../state';
import type { RetrievedChunk } from '@/lib/retrieve';
import { CHAT_CONFIG } from '@/lib/model-config';

const SYSTEM_PROMPT = `You are an answer quality evaluation expert.
Please provide a comprehensive score (0-100) for the given answer.

Scoring criteria:
1. **Fact Accuracy** (30 points): Whether core facts in the answer are supported by documents
2. **Source Citation Accuracy** (30 points): Whether [Source: xxx, Page X] citations match actual documents
   - Check if cited content actually comes from the referenced document
   - Check if page numbers are correct
   - Check if filenames are correct
   - Deduct 15 points if cited content lacks source annotation
3. **Relevance** (20 points): Whether the answer addresses the user's question
4. **Completeness** (10 points): Whether the answer is comprehensive and doesn't miss important information
5. **Expression Quality** (10 points): Whether the answer is clear and fluent

Scoring rules:
- 80+: Good quality, acceptable
- 60-79: Acceptable with minor issues
- Below 60: Poor quality, needs regeneration

Special notes:
- Reasonable inferences and summaries are not penalized
- "Unable to answer" responses get high scores if no relevant documents exist
- Incorrect source citations are serious hallucinations and should be heavily penalized

Output format: Only output a number from 0-100, no other content`;

interface OpenAIChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface HallucinationCheckInput {
  state: RAGState;
  apiKey: string;
}

const QUALITY_THRESHOLD = 90;

/**
 * Hallucination check node
 * @param input - Input containing state and API key
 * @returns State update with hallucination check results
 */
export async function hallucinationCheckNode(
  input: HallucinationCheckInput
): Promise<Partial<RAGState>> {
  const { state, apiKey } = input;
  const { question, answer, top_chunks } = state;
  
  // Skip hallucination check if no answer or no chunks
  if (!answer || top_chunks.length === 0) {
    return { hallucination: false };
  }
  
  console.log('[Hallucination Check] Input:', {
    answerLength: answer?.length,
    chunksCount: top_chunks?.length
  });
  
  try {
    const score = await checkAnswerQuality({ 
      question, 
      answer, 
      chunks: top_chunks, 
      apiKey 
    });
    
    // Below threshold is considered "hallucination" (needs retry)
    const hasHallucination = score < QUALITY_THRESHOLD;
    
    console.log('[Hallucination Check] Result:', { 
      score, 
      threshold: QUALITY_THRESHOLD,
      hasHallucination 
    });
    
    return { hallucination: hasHallucination };
  } catch (error) {
    console.error('Hallucination check failed:', error);
    // On check failure, conservatively assume no hallucination
    return { hallucination: false };
  }
}

interface CheckAnswerQualityInput {
  question: string;
  answer: string;
  chunks: RetrievedChunk[];
  apiKey: string;
}

/**
 * Use LLM to evaluate answer quality
 * @param input - Input containing question, answer, chunks and API key
 * @returns Quality score (0-100)
 */
async function checkAnswerQuality(input: CheckAnswerQualityInput): Promise<number> {
  const { question, answer, chunks, apiKey } = input;
  
  const context = chunks
    .map(c => `[${c.filename} Page ${c.page}] ${c.content}`)
    .join('\n\n');

  const filenames = [...new Set(chunks.map(c => c.filename))];

  const userPrompt = `## Document Filename List
${filenames.map(f => `- ${f}`).join('\n')}

## Reference Document Fragments (each contains filename, page number and content)
${context}

## User Question
${question}

## Answer to Evaluate
${answer}

---

Please verify each source citation in the answer:
1. Find all [Source: xxx, Page X] citations in the answer
2. Check if the cited filename exists in the "Document Filename List"
3. Check if the content actually appears in the corresponding document at the corresponding page
4. If filename doesn't exist or content doesn't match page, the source is incorrect

Then give a total score based on scoring criteria (fact accuracy 30 points, source citation accuracy 30 points, relevance 20 points, completeness 10 points, expression quality 10 points).

Only output a number from 0-100.`;

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 100
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
    console.log('[Hallucination Check] LLM Response:', result);
    
    // Extract number
    const scoreMatch = result.match(/\d+/);
    if (scoreMatch) {
      const score = parseInt(scoreMatch[0], 10);
      return Math.min(100, Math.max(0, score));
    }
    
    // On parse failure, default to high score (prefer false negatives)
    console.log('[Hallucination Check] Failed to parse score, defaulting to 85');
    return 85;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
