import { ImageResponse } from 'next/og'

export const alt = 'Nano-RAG - 轻量化边缘 RAG 框架'
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
        }}
      >
        <h1
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: '#1d1d1f',
            marginBottom: 16,
          }}
        >
          Nano-RAG
        </h1>
        <p
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: '#cc785c',
          }}
        >
          轻量化边缘 RAG 框架
        </p>
      </div>
    ),
    {
      ...size,
    }
  )
}
