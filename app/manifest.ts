import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nano RAG',
    short_name: 'NanoRAG',
    description: '基于 LangGraph 的智能文档问答系统',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9f5',
    theme_color: '#cc785c',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'zh-CN',
    icons: [
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    categories: ['productivity', 'utilities'],
    shortcuts: [
      {
        name: '开始对话',
        short_name: '对话',
        description: '开始与文档进行智能问答',
        url: '/',
        icons: [{ src: '/logo.svg', sizes: 'any' }],
      },
      {
        name: '上传文档',
        short_name: '上传',
        description: '上传 PDF 文档到知识库',
        url: '/upload',
        icons: [{ src: '/logo.svg', sizes: 'any' }],
      },
      {
        name: '文档库',
        short_name: '文档库',
        description: '管理已上传的文档',
        url: '/library',
        icons: [{ src: '/logo.svg', sizes: 'any' }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  }
}
