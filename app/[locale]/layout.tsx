import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { JsonLd } from "@/components/json-ld";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400"],
});

export function generateStaticParams() {
  return [{ locale: 'zh' }, { locale: 'en' }];
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === 'en';
  const title = isEn ? "Nano RAG - Intelligent Document Q&A System" : "Nano RAG - 智能文档问答系统";
  const description = isEn
    ? "LangGraph-based intelligent document Q&A system with PDF upload and smart retrieval"
    : "基于 LangGraph 的智能文档问答系统，支持 PDF 文档上传与智能检索";
  const keywords = isEn
    ? ["RAG", "document Q&A", "AI", "LangGraph", "PDF", "knowledge base"]
    : ["RAG", "文档问答", "AI", "LangGraph", "PDF", "知识库"];

  return {
    metadataBase: new URL("https://nano-rag.yomigi.com"),
    title,
    description,
    keywords,
    icons: {
      icon: [
        { url: "/logo.svg", type: "image/svg+xml" },
      ],
      apple: [
        { url: "/apple-touch-icon.svg", type: "image/svg+xml" },
      ],
    },
    openGraph: {
      title,
      description,
      url: isEn ? "https://nano-rag.yomigi.com/en" : "https://nano-rag.yomigi.com",
      type: "website",
      siteName: "Nano RAG",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    alternates: {
      canonical: isEn ? "https://nano-rag.yomigi.com/en" : "https://nano-rag.yomigi.com",
      languages: {
        'zh-CN': 'https://nano-rag.yomigi.com',
        'en': 'https://nano-rag.yomigi.com/en'
      }
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${inter.className} ${cormorant.className} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <JsonLd />
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
