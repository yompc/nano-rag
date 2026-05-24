'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { PDFParser, type ParsedPDF } from '@/components/pdf-parser';
import { createDocument, ingestPage } from '@/app/actions/ingest';

type DocType = 'manual' | 'faq' | 'api_doc';

const DOC_TYPE_OPTIONS = [
  { value: 'manual', label: '手册', icon: '📖' },
  { value: 'faq', label: 'FAQ', icon: '❓' },
  { value: 'api_doc', label: 'API文档', icon: '🔧' },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function UploadPage() {
  const [parsedPDF, setParsedPDF] = useState<ParsedPDF | null>(null);
  const [docType, setDocType] = useState<DocType>('manual');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentDocId, setCurrentDocId] = useState<number | null>(null);
  const [failedPage, setFailedPage] = useState<number | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleParsed = useCallback((result: ParsedPDF) => {
    setParsedPDF(result);
    setError(null);
    setSuccess(false);
  }, []);

  const handleError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setParsedPDF(null);
  }, []);

  const handleUpload = async () => {
    if (!parsedPDF) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(false);
    setFailedPage(null);

    try {
      const createResult = await createDocument({
        filename: parsedPDF.filename,
        doc_type: docType
      });
      
      if (!createResult.success) {
        throw new Error(createResult.error);
      }
      
      const docId = createResult.docId!;
      setCurrentDocId(docId);
      
      for (let i = 0; i < parsedPDF.pages.length; i++) {
        setCurrentPage(i + 1);
        
        const pageResult = await ingestPage({
          docId,
          filename: parsedPDF.filename,
          doc_type: docType,
          page: parsedPDF.pages[i],
          pageIndex: i,
          totalPages: parsedPDF.pages.length
        });
        
        if (!pageResult.success) {
          setFailedPage(i);
          throw new Error(`第${i + 1}页处理失败: ${pageResult.error}`);
        }
        
        setUploadProgress(pageResult.progress);
      }
      
      setUploadProgress(100);
      setSuccess(true);
      setTimeout(() => {
        setParsedPDF(null);
        setSuccess(false);
        setUploadProgress(0);
        setCurrentPage(0);
        setCurrentDocId(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setParsedPDF(null);
    setError(null);
    setSuccess(false);
    setUploadProgress(0);
  };

  const handleRetry = async () => {
    if (failedPage === null || !parsedPDF || currentDocId === null) return;
    
    setIsRetrying(true);
    setError(null);
    
    try {
      const pageResult = await ingestPage({
        docId: currentDocId,
        filename: parsedPDF.filename,
        doc_type: docType,
        page: parsedPDF.pages[failedPage],
        pageIndex: failedPage,
        totalPages: parsedPDF.pages.length
      });
      
      if (pageResult.success) {
        setFailedPage(null);
        for (let i = failedPage + 1; i < parsedPDF.pages.length; i++) {
          setCurrentPage(i + 1);
          
          const result = await ingestPage({
            docId: currentDocId,
            filename: parsedPDF.filename,
            doc_type: docType,
            page: parsedPDF.pages[i],
            pageIndex: i,
            totalPages: parsedPDF.pages.length
          });
          
          if (!result.success) {
            setFailedPage(i);
            throw new Error(`第${i + 1}页处理失败: ${result.error}`);
          }
          
          setUploadProgress(result.progress);
        }
        
        setUploadProgress(100);
        setSuccess(true);
        setTimeout(() => {
          setParsedPDF(null);
          setSuccess(false);
          setUploadProgress(0);
          setCurrentPage(0);
          setCurrentDocId(null);
        }, 2000);
      } else {
        setError(`第${failedPage + 1}页重试失败: ${pageResult.error}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '重试失败');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleSkip = async () => {
    if (failedPage === null || !parsedPDF || currentDocId === null) return;
    
    setIsRetrying(true);
    setError(null);
    setFailedPage(null);
    
    try {
      for (let i = failedPage + 1; i < parsedPDF.pages.length; i++) {
        setCurrentPage(i + 1);
        
        const result = await ingestPage({
          docId: currentDocId,
          filename: parsedPDF.filename,
          doc_type: docType,
          page: parsedPDF.pages[i],
          pageIndex: i,
          totalPages: parsedPDF.pages.length
        });
        
        if (!result.success) {
          setFailedPage(i);
          throw new Error(`第${i + 1}页处理失败: ${result.error}`);
        }
        
        setUploadProgress(result.progress);
      }
      
      setUploadProgress(100);
      setSuccess(true);
      setTimeout(() => {
        setParsedPDF(null);
        setSuccess(false);
        setUploadProgress(0);
        setCurrentPage(0);
        setCurrentDocId(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '跳过失败');
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black transition-colors duration-300">
      <motion.div
        className="max-w-4xl mx-auto px-6 py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/"
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              aria-label="返回首页"
            >
              <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <title>返回</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-2">
              文档上传
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              上传PDF文档到知识库，支持智能解析与分类
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-black/50 p-8 border border-zinc-200/50 dark:border-zinc-800/50"
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl"
              >
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-2xl"
              >
                <p className="text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <title>成功图标</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  文档上传成功！
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {failedPage !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-2xl"
              >
                <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
                  第{failedPage + 1}页处理失败，是否重试？
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    {isRetrying ? '重试中...' : '重试本页'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isRetrying}
                    className="px-4 py-2 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                  >
                    跳过继续
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={itemVariants} className="mb-8">
            <p className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
              PDF文件
            </p>
            <PDFParser
              onParsed={handleParsed}
              onError={handleError}
              className=""
            />
          </motion.div>

          <AnimatePresence>
            {parsedPDF && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-8">
                  <p className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                    文档类型
                  </p>
                  <div className="grid grid-cols-3 gap-4" role="radiogroup" aria-label="选择文档类型">
                    {DOC_TYPE_OPTIONS.map((option) => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setDocType(option.value)}
                        disabled={isUploading}
                        role="radio"
                        aria-checked={docType === option.value}
                        className={`
                          p-4 rounded-2xl border-2 transition-all duration-200
                          ${docType === option.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg shadow-blue-500/20'
                            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                          }
                          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <div className="text-3xl mb-2" aria-hidden="true">{option.icon}</div>
                        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          {option.label}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="mb-8 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4">
                    文档信息
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">文件名</span>
                      <span className="text-zinc-900 dark:text-white font-medium">
                        {parsedPDF.filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">页数</span>
                      <span className="text-zinc-900 dark:text-white font-medium">
                        {parsedPDF.totalPages} 页
                      </span>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isUploading && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6"
                    >
                      <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                        />
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 text-center">
                        {currentPage > 0 
                          ? `正在处理第${currentPage}页，共${parsedPDF?.pages.length}页... ${uploadProgress}%`
                          : `正在上传... ${uploadProgress}%`
                        }
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    disabled={isUploading}
                    type="button"
                    className={`
                      flex-1 py-4 px-6 rounded-2xl font-medium
                      border-2 border-zinc-200 dark:border-zinc-700
                      text-zinc-700 dark:text-zinc-300
                      hover:bg-zinc-50 dark:hover:bg-zinc-800
                      transition-all duration-200
                      ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    取消
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpload}
                    disabled={isUploading}
                    type="button"
                    className={`
                      flex-1 py-4 px-6 rounded-2xl font-medium
                      bg-blue-500 hover:bg-blue-600 text-white
                      shadow-lg shadow-blue-500/30
                      transition-all duration-200
                      ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {isUploading ? '上传中...' : '确认上传'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="mt-8 text-center"
        >
          <p className="text-sm text-zinc-400 dark:text-zinc-500">支持PDF格式，最大100页</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
