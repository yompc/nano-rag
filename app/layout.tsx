import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond } from "next/font/google";
import { JsonLd } from "@/components/json-ld";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nano-rag.yomigi.com"),
  title: "Nano RAG - 智能文档问答系统",
  description: "基于 LangGraph 的智能文档问答系统，支持 PDF 文档上传与智能检索",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "Nano RAG - 智能文档问答系统",
    description: "基于 LangGraph 的智能文档问答系统，支持 PDF 文档上传与智能检索",
    url: "https://nano-rag.yomigi.com",
    type: "website",
    siteName: "Nano RAG",
  },
  twitter: {
    card: "summary",
    title: "Nano RAG - 智能文档问答系统",
    description: "基于 LangGraph 的智能文档问答系统，支持 PDF 文档上传与智能检索",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className={`${inter.className} ${cormorant.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <JsonLd />
        {children}
      </body>
    </html>
  );
}
