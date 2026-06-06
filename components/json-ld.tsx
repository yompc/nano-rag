const BASE_URL = 'https://nano-rag.yomigi.com'

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Nano RAG',
  url: BASE_URL,
  description: '基于 LangGraph 的智能文档问答系统，支持 PDF 文档上传与智能检索',
  inLanguage: ['zh-CN', 'en'],
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Nano RAG',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  description: 'A lightweight RAG framework built on Next.js, Cloudflare Workers, and LangGraph. Deploy to the edge with zero infrastructure.',
  url: BASE_URL,
  author: {
    '@type': 'Organization',
    name: 'Nano RAG Team',
    url: 'https://github.com/yompc',
  },
  featureList: [
    'PDF Document Upload',
    'Intelligent Document Chunking',
    'Vector Embedding',
    'Semantic Search',
    'LangGraph RAG Pipeline',
    'Edge Deployment',
    'Streaming Response',
  ],
  screenshot: `${BASE_URL}/opengraph-image`,
  softwareVersion: '1.0.0',
  license: 'https://opensource.org/licenses/MIT',
}

const webApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Nano RAG',
  url: BASE_URL,
  description: '基于 LangGraph 的智能文档问答系统',
  browserRequirements: 'Requires JavaScript. Requires HTML5.',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  author: {
    '@type': 'Organization',
    name: 'Nano RAG Team',
    url: 'https://github.com/yompc',
  },
}

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Nano RAG',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.svg`,
  sameAs: [
    'https://github.com/yompc/nano-rag',
  ],
}

export function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  )
}
