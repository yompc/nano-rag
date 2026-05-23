/**
 * 文本分片模块
 * 按段落分片，每片800-1000字符
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
 * 将文本按段落分片
 * 优先在段落边界切分，确保每片在800-1000字符之间
 */
export function chunkText(text: string, pageIndex: number = 0): TextChunk[] {
  const chunks: TextChunk[] = [];
  
  // 按段落分割（支持多种段落分隔符）
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
    
    if (potentialChunk.length > CHUNK_CONFIG.maxSize && currentChunk.length > 0) {
      // 当前chunk已达到最大值，保存并开始新chunk
      chunks.push({
        content: currentChunk,
        charCount: currentChunk.length,
        pageIndex
      });
      
      // 添加重叠内容以保持上下文连续性
      const overlapText = getOverlapText(currentChunk);
      currentChunk = overlapText + (overlapText ? '\n\n' : '') + paragraph;
    } else {
      currentChunk = potentialChunk;
    }
  }
  
  // 保存最后一个chunk（如果满足最小长度要求）
  if (currentChunk.length >= CHUNK_CONFIG.minSize) {
    chunks.push({
      content: currentChunk,
      charCount: currentChunk.length,
      pageIndex
    });
  } else if (chunks.length > 0 && currentChunk.length > 0) {
    // 最后一个片段太短，合并到前一个chunk
    const lastChunk = chunks[chunks.length - 1];
    lastChunk.content += '\n\n' + currentChunk;
    lastChunk.charCount = lastChunk.content.length;
  } else if (currentChunk.length > 0) {
    // 只有一个短片段
    chunks.push({
      content: currentChunk,
      charCount: currentChunk.length,
      pageIndex
    });
  }
  
  return chunks;
}

/**
 * 从文本末尾提取重叠部分
 */
function getOverlapText(text: string): string {
  if (text.length <= CHUNK_CONFIG.overlapSize) {
    return '';
  }
  
  // 尝试在句子边界切分
  const overlapStart = text.length - CHUNK_CONFIG.overlapSize;
  const searchStart = Math.max(0, overlapStart - 50);
  const searchText = text.slice(searchStart);
  
  // 查找句子结束符
  const sentenceEndMatch = searchText.match(/[。！？\.\!\?]\s*/);
  if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
    const actualStart = searchStart + sentenceEndMatch.index + sentenceEndMatch[0].length;
    return text.slice(actualStart);
  }
  
  // 没有找到句子边界，直接截取
  return text.slice(overlapStart);
}

/**
 * 将文档所有页面的文本分片
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
