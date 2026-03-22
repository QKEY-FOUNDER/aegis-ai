import { NextRequest } from 'next/server'

export const runtime = 'edge'

async function getRadarData(origin: string) {
  try {
    const res = await fetch(`${origin}/api/radar`, {
      cache: 'no-store'
    })
    return await res.json()
  } catch {
    return { success: false }
  }
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()
  const origin = req.nextUrl.origin

  const stream = new ReadableStream({
    async start(controller) {

      let closed = false

      const send = (data: any) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        } catch {
          closed = true
        }
      }

      // evento inicial
      send({ type: 'connected' })

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval)
          return
        }

        const data = await getRadarData(origin)
        send(data)

      }, 5000)

      // heartbeat (mantém ligação viva no Vercel)
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat)
          return
        }

        controller.enqueue(encoder.encode(`:\n\n`))
      }, 15000)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
