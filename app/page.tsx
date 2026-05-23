import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
              Nano RAG
            </h1>
            <div className="flex items-center gap-4">
              <Link 
                href="/library"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                文档库
              </Link>
              <Link 
                href="/upload"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                上传文档
              </Link>
              <Link 
                href="/chat"
                className="rounded-full bg-[#007AFF] dark:bg-[#0A84FF] text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                开始对话
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-zinc-900 dark:text-white mb-6">
            文档智能问答系统
          </h2>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-2xl mx-auto">
            基于 Cloudflare D1 + LangGraph 的 RAG 系统，支持 PDF 上传、语义检索、带来源标注的问答
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-lg shadow-zinc-200/50 dark:shadow-none border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-[#007AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <title>上传图标</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">PDF 上传</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                支持拖拽上传，浏览器端解析，保护隐私
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-lg shadow-zinc-200/50 dark:shadow-none border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <title>搜索图标</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">语义检索</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Mistral Embedding + 余弦相似度精准匹配
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-lg shadow-zinc-200/50 dark:shadow-none border border-zinc-200/50 dark:border-zinc-800/50">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4 mx-auto">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <title>对话图标</title>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">智能问答</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                多轮对话、来源标注、幻觉检测
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/library"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white px-8 py-4 text-lg font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <title>文档库</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              文档库
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#007AFF] dark:bg-[#0A84FF] text-white px-8 py-4 text-lg font-medium hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <title>上传文档</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              上传文档
            </Link>
            <Link
              href="/chat"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-8 py-4 text-lg font-medium border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <title>开始对话</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              开始对话
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-500">
        <p>Powered by Next.js + Cloudflare D1 + LangGraph + Mistral AI</p>
      </footer>
    </div>
  );
}
