import { MetadataRoute } from 'next'

const BASE_URL = 'https://nano-rag.yomigi.com'

const LOCALES = ['zh', 'en'] as const
const DEFAULT_LOCALE = 'en'

const STATIC_PAGES = [
  { path: '', priority: 1.0, changeFrequency: 'daily' as const },
  { path: '/landing', priority: 0.8, changeFrequency: 'weekly' as const },
  { path: '/upload', priority: 0.7, changeFrequency: 'weekly' as const },
  { path: '/library', priority: 0.7, changeFrequency: 'weekly' as const },
]

function getLocalizedPath(locale: string, path: string): string {
  if (locale === DEFAULT_LOCALE) {
    return `${BASE_URL}${path}`
  }
  return `${BASE_URL}/${locale}${path}`
}

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemapEntries: MetadataRoute.Sitemap = []
  const lastModified = new Date()

  for (const locale of LOCALES) {
    for (const page of STATIC_PAGES) {
      sitemapEntries.push({
        url: getLocalizedPath(locale, page.path),
        lastModified,
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [
              l === 'zh' ? 'zh-CN' : l,
              getLocalizedPath(l, page.path),
            ])
          ),
        },
      })
    }
  }

  return sitemapEntries
}
