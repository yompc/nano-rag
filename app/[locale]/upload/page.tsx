import type { Metadata } from 'next'
import { UploadPageClient } from './upload-client'

const BASE_URL = 'https://nano-rag.yomigi.com'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale === 'en'

  const title = isEn ? 'Upload Documents - Nano RAG' : '上传文档 - Nano RAG'
  const description = isEn
    ? 'Upload PDF documents to build your knowledge base. Supports intelligent chunking and vector embedding for accurate retrieval.'
    : '上传 PDF 文档构建知识库。支持智能分块和向量嵌入，实现精准检索。'

  const path = isEn ? '/upload' : '/zh/upload'

  return {
    title,
    description,
    keywords: isEn
      ? ['PDF Upload', 'Document Management', 'Knowledge Base', 'Vector Embedding', 'RAG']
      : ['PDF上传', '文档管理', '知识库', '向量嵌入', 'RAG'],
    openGraph: {
      title,
      description,
      url: `${BASE_URL}${path}`,
      type: 'website',
      siteName: 'Nano RAG',
      images: [
        {
          url: `${BASE_URL}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${BASE_URL}/opengraph-image`],
    },
    alternates: {
      canonical: `${BASE_URL}${path}`,
      languages: {
        'zh-CN': `${BASE_URL}/zh/upload`,
        'en': `${BASE_URL}/upload`,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default function UploadPage() {
  return <UploadPageClient />
}
