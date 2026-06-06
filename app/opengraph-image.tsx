import { ImageResponse } from 'next/og'

export const alt = 'Nano-RAG - Lightweight Edge RAG Framework'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#faf9f5',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: '#cc785c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 24,
            }}
          >
            <span style={{ fontSize: 40, color: '#fff' }}>✦</span>
          </div>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#1d1d1f',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Nano-RAG
          </h1>
        </div>
        <p
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: '#cc785c',
            margin: 0,
            marginBottom: 24,
          }}
        >
          Lightweight Edge RAG Framework
        </p>
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 16,
          }}
        >
          {['Next.js', 'Cloudflare Workers', 'LangGraph'].map((tech) => (
            <div
              key={tech}
              style={{
                padding: '8px 20px',
                backgroundColor: '#f5f0e8',
                borderRadius: 8,
                fontSize: 18,
                color: '#3d3d3a',
                fontWeight: 500,
              }}
            >
              {tech}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
