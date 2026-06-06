'use client';

import Link from "next/link";
import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations('landing');

  return (
    <div className="landing-page">
      {/* Hero Section - Cream Canvas */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              {t('hero.title')}
            </h1>
            <p className="hero-subtitle">
              {t('hero.subtitle')}
            </p>
            <div className="hero-actions">
              <Link href="/" className="btn-primary">
                {t('hero.startButton')}
              </Link>
              <a
                href="https://github.com/yompc/nano-rag"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                {t('hero.sourceButton')}
              </a>
            </div>
          </div>
          
          {/* Hero Illustration - Dark Code Window */}
          <div className="hero-illustration">
            <div className="code-window">
              <div className="code-header">
                <div className="code-dot"></div>
                <div className="code-dot"></div>
                <div className="code-dot"></div>
                <span className="code-filename">chat.tsx</span>
              </div>
              <div className="code-body">
                <pre><code>{`const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    question: userMessage,
    messages: history
  })
});

// Streaming response with
// thinking steps & sources`}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Cream Card Surface */}
      <section className="features-section">
        <div className="section-container">
          <h2 className="section-title">
            {t('features.title')}
          </h2>
          <div className="features-grid">
            {/* Feature Card 1 - Edge Deployment */}
            <div className="feature-card">
              <div className="feature-icon" style={{ color: 'var(--accent-teal)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h3 className="feature-title">{t('features.edge.title')}</h3>
              <p className="feature-desc">{t('features.edge.desc')}</p>
            </div>

            {/* Feature Card 2 - Intelligent Retrieval */}
            <div className="feature-card">
              <div className="feature-icon" style={{ color: 'var(--primary)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
              </div>
              <h3 className="feature-title">{t('features.intelligence.title')}</h3>
              <p className="feature-desc">{t('features.intelligence.desc')}</p>
            </div>

            {/* Feature Card 3 - Serverless Storage */}
            <div className="feature-card">
              <div className="feature-icon" style={{ color: 'var(--accent-amber)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                </svg>
              </div>
              <h3 className="feature-title">{t('features.storage.title')}</h3>
              <p className="feature-desc">{t('features.storage.desc')}</p>
            </div>

            {/* Feature Card 4 - Quality Assurance */}
            <div className="feature-card">
              <div className="feature-icon" style={{ color: 'var(--success)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
              <h3 className="feature-title">{t('features.quality.title')}</h3>
              <p className="feature-desc">{t('features.quality.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start Section - Canvas with Dark Code */}
      <section className="quickstart-section">
        <div className="section-container">
          <h2 className="section-title">
            {t('quickStart.title')}
          </h2>
          <div className="code-window-large">
            <div className="code-header">
              <div className="code-dot"></div>
              <div className="code-dot"></div>
              <div className="code-dot"></div>
              <span className="code-filename">terminal</span>
            </div>
            <div className="code-body">
              <div className="code-step">
                <span className="code-comment"># {t('quickStart.step1')}</span>
                <code className="code-line">git clone https://github.com/yompc/nano-rag.git</code>
                <code className="code-line">cd nano-rag</code>
              </div>
              <div className="code-step">
                <span className="code-comment"># {t('quickStart.step2')}</span>
                <code className="code-line">npm install</code>
              </div>
              <div className="code-step">
                <span className="code-comment"># {t('quickStart.step3')}</span>
                <code className="code-line">cp .dev.vars.example .dev.vars</code>
                <code className="code-comment"># Edit .dev.vars and add OPENAI_API_KEY</code>
              </div>
              <div className="code-step">
                <span className="code-comment"># {t('quickStart.step4')}</span>
                <code className="code-line">npx wrangler d1 execute nano-rag-db --local --file=./migrations/0001_init.sql</code>
                <code className="code-line">npm run preview</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section - Cream Card Grid */}
      <section className="techstack-section">
        <div className="section-container">
          <h2 className="section-title section-title-centered">
            {t('techStack.title')}
          </h2>
          <div className="techstack-grid">
            {[
              { name: "Next.js", desc: t('techStack.nextjs'), icon: "▲" },
              { name: "Cloudflare Workers", desc: t('techStack.workers'), icon: "⚡" },
              { name: "D1 Database", desc: t('techStack.d1'), icon: "◈" },
              { name: "LangGraph", desc: t('techStack.langgraph'), icon: "◇" },
              { name: "OpenAI", desc: t('techStack.openai'), icon: "✦" },
            ].map((tech) => (
              <div key={tech.name} className="tech-card">
                <div className="tech-icon">{tech.icon}</div>
                <div className="tech-name">{tech.name}</div>
                <div className="tech-desc">{tech.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Coral Band */}
      <section className="cta-section">
        <div className="cta-container">
          <h2 className="cta-title">
            {t('cta.title')}
          </h2>
          <p className="cta-subtitle">
            {t('cta.subtitle')}
          </p>
          <Link href="/" className="btn-cta">
            {t('cta.button')}
          </Link>
        </div>
      </section>

      {/* Footer - Dark Surface */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="footer-logo">✦</span>
            <span className="footer-name">Nano-RAG</span>
          </div>
          <p className="footer-copyright">
            {t('footer.copyright')}
          </p>
          <a
            href="https://github.com/yompc/nano-rag"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            GitHub →
          </a>
        </div>
      </footer>

      <style jsx>{`
        /* ===== Design Token System ===== */
        :global(.landing-page) {
          /* Colors */
          --canvas: #faf9f5;
          --surface-soft: #f5f0e8;
          --surface-card: #efe9de;
          --surface-dark: #181715;
          --surface-dark-soft: #1f1e1b;
          --surface-dark-elevated: #252320;
          --primary: #cc785c;
          --primary-active: #a9583e;
          --primary-disabled: #e6dfd8;
          --ink: #141413;
          --body: #3d3d3a;
          --body-strong: #252523;
          --muted: #6c6a64;
          --muted-soft: #8e8b82;
          --hairline: #e6dfd8;
          --hairline-soft: #ebe6df;
          --on-primary: #ffffff;
          --on-dark: #faf9f5;
          --on-dark-soft: #a09d96;
          --accent-teal: #5db8a6;
          --accent-amber: #e8a55a;
          --success: #5db872;

          /* Typography */
          --font-display: 'Cormorant Garamond', 'Garamond', 'Times New Roman', serif;
          --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

          /* Spacing */
          --space-xxs: 4px;
          --space-xs: 8px;
          --space-sm: 12px;
          --space-md: 16px;
          --space-lg: 24px;
          --space-xl: 32px;
          --space-xxl: 48px;
          --space-section: 96px;

          /* Radii */
          --radius-xs: 4px;
          --radius-sm: 6px;
          --radius-md: 8px;
          --radius-lg: 12px;
          --radius-xl: 16px;
          --radius-pill: 9999px;
        }

        .landing-page {
          background: var(--canvas);
          font-family: var(--font-body);
          color: var(--ink);
          min-height: 100vh;
        }

        /* ===== Hero Section ===== */
        .hero-section {
          padding: var(--space-section) var(--space-lg);
          background: var(--canvas);
        }

        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-xxl);
          align-items: center;
        }

        @media (min-width: 1024px) {
          .hero-container {
            grid-template-columns: 1fr 1fr;
          }
        }

        .hero-content {
          text-align: center;
        }

        @media (min-width: 1024px) {
          .hero-content {
            text-align: left;
          }
        }

        .hero-title {
          font-family: var(--font-display);
          font-size: clamp(2.5rem, 5vw + 1rem, 4rem);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin: 0 0 var(--space-lg);
        }

        .hero-subtitle {
          font-size: clamp(1rem, 2vw, 1.125rem);
          line-height: 1.6;
          color: var(--body);
          max-width: 36ch;
          margin: 0 0 var(--space-xl);
        }

        @media (min-width: 1024px) {
          .hero-subtitle {
            margin: 0 0 var(--space-xl);
          }
        }

        @media (max-width: 1023px) {
          .hero-subtitle {
            margin-left: auto;
            margin-right: auto;
          }
        }

        .hero-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          align-items: center;
        }

        @media (min-width: 640px) {
          .hero-actions {
            flex-direction: row;
            justify-content: center;
          }
        }

        @media (min-width: 1024px) {
          .hero-actions {
            justify-content: flex-start;
          }
        }

        /* ===== Buttons ===== */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-sm) var(--space-lg);
          background: var(--primary);
          color: var(--on-primary);
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: all 150ms ease;
          min-width: 140px;
        }

        .btn-primary:hover {
          background: var(--primary-active);
          transform: translateY(-1px);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-sm) var(--space-lg);
          background: var(--canvas);
          color: var(--ink);
          font-size: 0.875rem;
          font-weight: 500;
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: all 150ms ease;
          min-width: 140px;
        }

        .btn-secondary:hover {
          background: var(--surface-soft);
          border-color: var(--muted-soft);
        }

        /* ===== Hero Illustration (Code Window) ===== */
        .hero-illustration {
          display: none;
        }

        @media (min-width: 1024px) {
          .hero-illustration {
            display: block;
          }
        }

        .code-window {
          background: var(--surface-dark);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
        }

        .code-header {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-md) var(--space-lg);
          background: var(--surface-dark-elevated);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .code-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
        }

        .code-dot:nth-child(1) { background: #ff5f57; }
        .code-dot:nth-child(2) { background: #febc2e; }
        .code-dot:nth-child(3) { background: #28c840; }

        .code-filename {
          margin-left: var(--space-sm);
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--on-dark-soft);
        }

        .code-body {
          padding: var(--space-lg);
          font-family: var(--font-mono);
          font-size: 0.875rem;
          line-height: 1.7;
          color: var(--on-dark);
          overflow-x: auto;
        }

        .code-body pre {
          margin: 0;
        }

        .code-body code {
          color: inherit;
        }

        /* ===== Features Section ===== */
        .features-section {
          padding: var(--space-section) var(--space-lg);
          background: var(--surface-soft);
        }

        .section-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 400;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: var(--ink);
          margin: 0 0 var(--space-xxl);
        }

        .section-title-centered {
          text-align: center;
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: var(--space-lg);
        }

        @media (min-width: 768px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .feature-card {
          background: var(--surface-card);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          transition: transform 300ms ease, box-shadow 300ms ease;
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06);
        }

        .feature-icon {
          margin-bottom: var(--space-md);
        }

        .feature-title {
          font-size: 1.125rem;
          font-weight: 500;
          color: var(--ink);
          margin: 0 0 var(--space-sm);
        }

        .feature-desc {
          font-size: 1rem;
          line-height: 1.55;
          color: var(--body);
          margin: 0;
        }

        /* ===== Quick Start Section ===== */
        .quickstart-section {
          padding: var(--space-section) var(--space-lg);
          background: var(--canvas);
        }

        .code-window-large {
          background: var(--surface-dark);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
          max-width: 800px;
          margin: 0 auto;
        }

        .code-step {
          margin-bottom: var(--space-lg);
        }

        .code-step:last-child {
          margin-bottom: 0;
        }

        .code-comment {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--on-dark-soft);
          margin-bottom: var(--space-xs);
        }

        .code-line {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.875rem;
          color: var(--on-dark);
          line-height: 1.7;
        }

        /* ===== Tech Stack Section ===== */
        .techstack-section {
          padding: var(--space-section) var(--space-lg);
          background: var(--surface-soft);
        }

        .techstack-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-md);
        }

        @media (min-width: 768px) {
          .techstack-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .techstack-grid {
            grid-template-columns: repeat(5, 1fr);
          }
        }

        .tech-card {
          background: var(--canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          text-align: center;
          transition: all 200ms ease;
        }

        .tech-card:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        .tech-icon {
          font-size: 1.5rem;
          margin-bottom: var(--space-sm);
          opacity: 0.7;
        }

        .tech-name {
          font-weight: 500;
          color: var(--ink);
          margin-bottom: var(--space-xs);
          font-size: 0.875rem;
        }

        .tech-desc {
          font-size: 0.75rem;
          color: var(--muted);
        }

        /* ===== CTA Section ===== */
        .cta-section {
          padding: var(--space-xxl) var(--space-lg);
          background: var(--primary);
        }

        .cta-container {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .cta-title {
          font-family: var(--font-display);
          font-size: clamp(1.75rem, 3vw, 2.5rem);
          font-weight: 400;
          line-height: 1.2;
          color: var(--on-primary);
          margin: 0 0 var(--space-md);
        }

        .cta-subtitle {
          font-size: 1.125rem;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 var(--space-xl);
        }

        .btn-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-sm) var(--space-xl);
          background: var(--canvas);
          color: var(--ink);
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: all 150ms ease;
        }

        .btn-cta:hover {
          background: white;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        /* ===== Footer ===== */
        .footer {
          padding: var(--space-xxl) var(--space-lg);
          background: var(--surface-dark);
        }

        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
          text-align: center;
        }

        @media (min-width: 768px) {
          .footer-container {
            flex-direction: row;
            justify-content: space-between;
            text-align: left;
          }
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }

        .footer-logo {
          color: var(--primary);
          font-size: 1.25rem;
        }

        .footer-name {
          font-family: var(--font-display);
          font-size: 1.125rem;
          font-weight: 400;
          color: var(--on-dark);
        }

        .footer-copyright {
          font-size: 0.875rem;
          color: var(--on-dark-soft);
          margin: 0;
        }

        .footer-link {
          font-size: 0.875rem;
          color: var(--on-dark);
          text-decoration: none;
          transition: color 150ms ease;
        }

        .footer-link:hover {
          color: var(--primary);
        }

        /* ===== Animations ===== */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .hero-content {
          animation: fadeInUp 0.6s ease-out;
        }

        .hero-illustration {
          animation: fadeInUp 0.6s ease-out 0.2s both;
        }

        .feature-card {
          animation: fadeInUp 0.5s ease-out both;
        }

        .feature-card:nth-child(1) { animation-delay: 0.1s; }
        .feature-card:nth-child(2) { animation-delay: 0.2s; }
        .feature-card:nth-child(3) { animation-delay: 0.3s; }
        .feature-card:nth-child(4) { animation-delay: 0.4s; }

        /* Focus styles for accessibility */
        .btn-primary:focus-visible,
        .btn-secondary:focus-visible,
        .btn-cta:focus-visible,
        .footer-link:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
