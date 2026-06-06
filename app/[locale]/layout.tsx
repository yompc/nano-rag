import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { JsonLd } from "@/components/json-ld";
import { BreadcrumbJsonLd } from "@/components/breadcrumb-json-ld";
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

  const canonicalUrl = isEn ? "https://nano-rag.yomigi.com/en" : "https://nano-rag.yomigi.com";
  const ogImageUrl = "https://nano-rag.yomigi.com/opengraph-image";

  return {
    metadataBase: new URL("https://nano-rag.yomigi.com"),
    title,
    description,
    keywords,
    authors: [{ name: "Nano RAG Team", url: "https://github.com/yompc" }],
    creator: "Nano RAG Team",
    publisher: "Nano RAG",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    icons: {
      icon: [
        { url: "/logo.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      apple: [
        { url: "/apple-touch-icon.svg", type: "image/svg+xml" },
      ],
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: "Nano RAG",
      locale: isEn ? "en_US" : "zh_CN",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
      creator: "@nanorag",
    },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'zh-CN': 'https://nano-rag.yomigi.com',
        'en': 'https://nano-rag.yomigi.com/en'
      }
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
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
          <BreadcrumbJsonLd />
          <Providers>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
