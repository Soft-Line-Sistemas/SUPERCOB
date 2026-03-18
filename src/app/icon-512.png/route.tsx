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
            width: 360,
            height: 360,
            borderRadius: 96,
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 200,
            fontWeight: 900,
            letterSpacing: -6,
          }}
        >
          S
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    }
  )
}

