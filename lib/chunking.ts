/**
 * Text Chunking Module
 * Chunk by paragraphs, each chunk 800-1000 characters
 */

const CHUNK_CONFIG = {
  minSize: 800,
  maxSize: 1000,
  overlapSize: 50
};

export interface TextChunk {
  content: string;
  charCount: number;
  pageIndex: number;
}

/**
 * Chunk text by paragraphs
 * Prioritize splitting at paragraph boundaries, ensuring each chunk is 800-1000 characters
 */
export function chunkText(text: string, pageIndex: number = 0): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  // Split by paragraphs (support multiple paragraph separators)
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;

    if (potentialChunk.length > CHUNK_CONFIG.maxSize && currentChunk.length > 0) {
      // Current chunk reached max size, save and start new chunk
      chunks.push({
        content: currentChunk,
        charCount: currentChunk.length,
        pageIndex
      });

      // Add overlap text to maintain context continuity
      const overlapText = getOverlapText(currentChunk);
      currentChunk = overlapText + (overlapText ? '\n\n' : '') + paragraph;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Save last chunk (if meets minimum length requirement)
  if (currentChunk.length >= CHUNK_CONFIG.minSize) {
    chunks.push({
      content: currentChunk,
      charCount: currentChunk.length,
      pageIndex
    });
  } else if (chunks.length > 0 && currentChunk.length > 0) {
    // Last segment too short, merge into previous chunk
    const lastChunk = chunks[chunks.length - 1];
    lastChunk.content += '\n\n' + currentChunk;
    lastChunk.charCount = lastChunk.content.length;
  } else if (currentChunk.length > 0) {
    // Only one short segment
    chunks.push({
      content: currentChunk,
      charCount: currentChunk.length,
      pageIndex
    });
  }
  
  return chunks;
}

/**
 * Extract overlap portion from end of text
 */
function getOverlapText(text: string): string {
  if (text.length <= CHUNK_CONFIG.overlapSize) {
    return '';
  }
  
  // Try to split at sentence boundary
  const overlapStart = text.length - CHUNK_CONFIG.overlapSize;
  const searchStart = Math.max(0, overlapStart - 50);
  const searchText = text.slice(searchStart);

  // Find sentence ending marker
  const sentenceEndMatch = searchText.match(/[。！？\.\!\?]\s*/);
  if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
    const actualStart = searchStart + sentenceEndMatch.index + sentenceEndMatch[0].length;
    return text.slice(actualStart);
  }

  // No sentence boundary found, truncate directly
  return text.slice(overlapStart);
}

/**
 * Chunk text from all document pages
 */
export function chunkDocument(pages: string[]): TextChunk[] {
  const allChunks: TextChunk[] = [];
  
  for (let i = 0; i < pages.length; i++) {
    const pageChunks = chunkText(pages[i], i);
    allChunks.push(...pageChunks);
  }
  
  return allChunks;
}

export { CHUNK_CONFIG };
