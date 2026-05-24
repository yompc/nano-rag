'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { listDocuments, deleteDocument, type DocWithChunks } from '@/app/actions/library';
import { DOC_TYPE_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/utils';

interface DocumentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentSidebar({ isOpen, onClose }: DocumentSidebarProps) {
  const [docs, setDocs] = useState<DocWithChunks[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const hasFetchedRef = useRef(false);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listDocuments();
    if (result.success && result.docs) {
      setDocs(result.docs);
    } else {
      setError(result.error || '获取文档列表失败');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchDocs();
    }
    if (!isOpen) {
      hasFetchedRef.current = false;
    }
  }, [isOpen, fetchDocs]);

  const handleDelete = async (docId: number) => {
    setDeleting(true);
    const result = await deleteDocument(docId);
    if (result.success) {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      setDeleteConfirm(null);
    } else {
      setError(result.error || '删除失败');
    }
    setDeleting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩层 - 移动端 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 lg:hidden"
          />

          {/* 侧边栏 */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 z-50 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-xl flex flex-col"
          >
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                文档库
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchDocs}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="刷新"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  aria-label="关闭"
                >
                  <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 上传按钮 */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <Link
                href="/upload"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#007AFF] dark:bg-[#0A84FF] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                上传文档
              </Link>
            </div>

            {/* 错误提示 */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-2"
                >
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 文档列表 */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-zinc-300 dark:border-zinc-600 border-t-[#007AFF] rounded-full animate-spin" />
                </div>
              ) : docs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                    暂无文档
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    上传 PDF 文档后开始提问
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                  <AnimatePresence>
                    {docs.map((doc) => (
                      <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="p-4"
                      >
                        {deleteConfirm === doc.id ? (
                          <div className="space-y-3">
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                              确定删除「{doc.filename}」？
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                disabled={deleting}
                                className="flex-1 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                              >
                                取消
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(doc.id)}
                                disabled={deleting}
                                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deleting ? '删除中...' : '确认'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                                {doc.filename}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                                  {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                                </span>
                                <span>{doc.chunk_count} 片段</span>
                              </div>
                              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                {formatDate(doc.uploaded_at)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(doc.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              aria-label="删除"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* 底部统计 */}
            {!loading && docs.length > 0 && (
              <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-center">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  共 {docs.length} 个文档，{docs.reduce((sum, d) => sum + d.chunk_count, 0)} 个片段
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
