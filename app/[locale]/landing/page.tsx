import type { Metadata } from 'next'
import { LandingPageClient } from './landing-client'

const BASE_URL = 'https://nano-rag.yomigi.com'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const isEn = locale === 'en'

  const title = isEn ? 'Nano RAG - Lightweight Edge RAG Framework' : 'Nano RAG - 轻量化边缘 RAG 框架'
  const description = isEn
    ? 'A lightweight RAG framework built on Next.js, Cloudflare Workers, and LangGraph. Deploy to the edge with zero infrastructure.'
    : '基于 Next.js、Cloudflare Workers 和 LangGraph 构建的轻量化 RAG 框架。零基础设施部署到边缘。'

  const path = isEn ? '/landing' : '/zh/landing'

  return {
    title,
    description,
    keywords: isEn
      ? ['RAG', 'LangGraph', 'Cloudflare Workers', 'Edge Computing', 'AI', 'Document Q&A', 'Open Source']
      : ['RAG', 'LangGraph', 'Cloudflare Workers', '边缘计算', 'AI', '文档问答', '开源'],
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
        'zh-CN': `${BASE_URL}/zh/landing`,
        'en': `${BASE_URL}/landing`,
      },
    },
  }
}

export default function LandingPage() {
  return <LandingPageClient />
}
