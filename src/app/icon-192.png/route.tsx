import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 42,
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: -2,
          }}
        >
          S
        </div>
      </div>
    ),
    {
      width: 192,
      height: 192,
    }
  )
}

