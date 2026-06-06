import type { Metadata } from 'next'
import { LibraryPageClient } from './library-client'

const BASE_URL = 'https://nano-rag.yomigi.com'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale === 'en'

  const title = isEn ? 'Document Library - Nano RAG' : '文档库 - Nano RAG'
  const description = isEn
    ? 'Manage your uploaded documents. View, organize, and delete documents in your knowledge base.'
    : '管理已上传的文档。查看、组织和删除知识库中的文档。'

  const path = isEn ? '/library' : '/zh/library'

  return {
    title,
    description,
    keywords: isEn
      ? ['Document Library', 'Knowledge Base', 'Document Management', 'RAG']
      : ['文档库', '知识库', '文档管理', 'RAG'],
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
        'zh-CN': `${BASE_URL}/zh/library`,
        'en': `${BASE_URL}/library`,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default function LibraryPage() {
  return <LibraryPageClient />
}
