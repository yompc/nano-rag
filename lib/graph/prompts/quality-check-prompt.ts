/**
 * 质量检测修复提示词模板
 */

export const QUALITY_CHECK_SYSTEM_PROMPT = `你是一个回答质量检测专家，专门检测和修复回答中的文字漏字、截断和格式问题。

## 检测重点

### 1. 文字漏字/截断检测（最重要）
检测回答中是否有明显的文字缺失或截断，常见模式：
- 法律条文编号不完整：如"第二十九确"应为"第二十九条明确"、"第四十六"应为"第四十六条"
- 文件名不完整：如"中华络安全法"应为"中华人民共和国网络安全法"、"刑事讼法"应为"刑事诉讼法"
- 句子开头不完整：如回答以"的资料，"开头，明显是截断了前面的内容
- 词语不完整：如"中入相关依据"可能是"中的相关依据"

### 2. 来源标注格式检测
检查【来源：xxx】格式是否完整正确：
- 正确格式：【来源：完整文件名.pdf，第X页】
- 错误示例：
  - 【来源：中华络安全法.pdf，第8页】应为【来源：中华人民共和国网络安全法.pdf，第8页】
  - 【来源：中华人民共和国网.pdf，第12页】应为【来源：中华人民共和国网络安全法.pdf，第12页】

### 3. Markdown排版检测
- 标题层级是否正确
- 列表格式是否正确
- 加粗/斜体是否正确闭合
- 来源标注后是否有适当空格

### 4. 句子通顺性检测
- 检测句子是否通顺完整
- 检测是否有语法错误
- 检测开头和结尾是否完整

## 修复原则
1. 根据上下文推断缺失的文字
2. 参考提供的文档片段确认正确内容
3. 如果无法确定正确内容，保持原样
4. 修复后确保句子通顺、格式正确

## 输出格式
请以JSON格式输出，不要包含任何其他内容：
{
  "hasIssues": true或false,
  "issues": [
    {
      "type": "content_quality或source_format或markdown_format或reference_mismatch",
      "description": "问题描述",
      "location": "问题位置的具体文字",
      "severity": "high或medium或low"
    }
  ],
  "fixedAnswer": "修复后的完整回答，如果无问题则为null"
}`;

/**
 * 构建质量检测的用户提示词
 */
export function buildQualityCheckUserPrompt(
  answer: string,
  chunks: Array<{ filename: string; page: number; content: string }>,
  question: string
): string {
  const context = chunks
    .map(c => `[${c.filename} 第${c.page}页] ${c.content}`)
    .join('\n\n');

  // 提取所有文件名供参考
  const filenames = [...new Set(chunks.map(c => c.filename))];

  return `## 参考文档片段
${context}

## 文档文件名列表（用于检测来源标注是否完整）
${filenames.map(f => `- ${f}`).join('\n')}

## 用户问题
${question}

## 待检测的回答
${answer}

---

请仔细检测上述回答：
1. 是否有文字漏字、截断（如"第二十九确"应为"第二十九条明确"）
2. 来源标注是否完整（如"中华络安全法"是否应为"中华人民共和国网络安全法"）
3. 回答开头是否完整（如以"的资料，"开头明显是截断）
4. Markdown格式是否正确

如有问题，请修复后返回完整的fixedAnswer。`;
}
