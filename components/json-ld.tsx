export function JsonLd() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Nano RAG',
    url: 'https://nano-rag.yomigi.com',
    description: '基于 LangGraph 的智能文档问答系统',
    inLanguage: 'zh-CN',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
