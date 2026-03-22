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

      const send = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        )
      }

      // conexão inicial
      send({ type: 'connected' })

      // 🔁 LOOP ASYNC (EDGE SAFE)
      while (true) {
        try {
          const data = await getRadarData(origin)
          send(data)

          // pausa (substitui setInterval)
          await new Promise(res => setTimeout(res, 5000))

        } catch {
          break
        }
      }
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
