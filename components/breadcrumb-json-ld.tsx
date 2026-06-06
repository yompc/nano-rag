'use client';

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface BreadcrumbItem {
  name: string;
  path: string;
}

const routeNames: Record<string, string> = {
  '': 'home',
  'landing': 'landing',
  'upload': 'upload',
  'library': 'library',
};

export function BreadcrumbJsonLd() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  
  // 移除 locale 前缀，获取纯路径
  const pathWithoutLocale = pathname.replace(/^\/(zh|en)(\/|$)/, '/') || '/';
  const pathSegments = pathWithoutLocale.split('/').filter(Boolean);
  
  // 构建面包屑项
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: tCommon('chat'), path: '' }, // 首页
  ];
  
  pathSegments.forEach((segment, index) => {
    const routeKey = routeNames[segment];
    const name = routeKey ? (routeKey === 'home' ? tCommon('chat') : tCommon(routeKey)) : segment;
    const path = pathSegments.slice(0, index + 1).join('/');
    breadcrumbItems.push({ name, path });
  });
  
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path === '' 
        ? 'https://nano-rag.yomigi.com' 
        : `https://nano-rag.yomigi.com/${item.path}`,
    })),
  };
  
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
    />
  );
}
