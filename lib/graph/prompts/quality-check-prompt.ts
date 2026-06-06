/**
 * Quality Check and Repair Prompt Template
 */

export const QUALITY_CHECK_SYSTEM_PROMPT = `You are an answer quality check expert, specializing in detecting and fixing missing words, truncations, and formatting issues in answers.

## Detection Focus

### 1. Missing Words/Truncation Detection (Most Important)
Detect obvious text omissions or truncations, common patterns:
- Incomplete legal article numbers: e.g., "Article 29" should be "Article 29 clearly states", "Article 46" should be "Article 46"
- Incomplete filenames: e.g., "Cybersecurity Law" should be "Cybersecurity Law of the PRC", "Criminal Procedure" should be "Criminal Procedure Law"
- Incomplete sentence beginnings: e.g., answer starts with "the data," clearly truncated from earlier content
- Incomplete words: e.g., "with relevant basis" might be "with the relevant basis"

### 2. Source Citation Format Check
Check if [Source: xxx] format is complete and correct:
- Correct format: [Source: complete-filename.pdf, Page X]
- Error examples:
  - [Source: Cybersecurity.pdf, Page 8] should be [Source: Cybersecurity-Law-PRC.pdf, Page 8]
  - [Source: PRC-Network.pdf, Page 12] should be [Source: PRC-Network-Security-Law.pdf, Page 12]

### 3. Markdown Formatting Check
- Are heading levels correct
- Are list formats correct
- Are bold/italic tags properly closed
- Is there appropriate spacing after source citations

### 4. Sentence Fluency Check
- Check if sentences are smooth and complete
- Check for grammatical errors
- Check if beginning and end are complete

## Repair Principles
1. Infer missing text from context
2. Confirm correct content from provided document fragments
3. If unable to determine correct content, keep original
4. Ensure sentences are smooth and formatting is correct after repair

## Output Format
Please output in JSON format, without any other content:
{
  "hasIssues": true or false,
  "issues": [
    {
      "type": "content_quality or source_format or markdown_format or reference_mismatch",
      "description": "Issue description",
      "location": "Specific text of the issue location",
      "severity": "high or medium or low"
    }
  ],
  "fixedAnswer": "Complete fixed answer, or null if no issues"
}`;

/**
 * Build user prompt for quality check
 */
export function buildQualityCheckUserPrompt(
  answer: string,
  chunks: Array<{ filename: string; page: number; content: string }>,
  question: string
): string {
  const context = chunks
    .map(c => `[${c.filename} Page ${c.page}] ${c.content}`)
    .join('\n\n');

  // Extract all filenames for reference
  const filenames = [...new Set(chunks.map(c => c.filename))];

  return `## Reference Document Fragments
${context}

## Document Filename List (for checking source citation completeness)
${filenames.map(f => `- ${f}`).join('\n')}

## User Question
${question}

## Answer to Check
${answer}

---

Please carefully check the above answer:
1. Are there missing words or truncations (e.g., "Article 29" should be "Article 29 clearly states")
2. Are source citations complete (e.g., "Cybersecurity" should be "Cybersecurity Law of the PRC")
3. Is the answer beginning complete (e.g., starting with "the data," is clearly truncated)
4. Is Markdown formatting correct

If there are issues, please return the complete fixedAnswer after repair.`;
}
