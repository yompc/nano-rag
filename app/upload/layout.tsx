import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '文档上传 - Nano RAG',
  description: '上传 PDF 文档到知识库，支持智能解析与分类',
  openGraph: {
    title: '文档上传 - Nano RAG',
    description: '上传 PDF 文档到知识库，支持智能解析与分类',
    url: 'https://nano-rag.yomigi.com/upload',
  },
}

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}