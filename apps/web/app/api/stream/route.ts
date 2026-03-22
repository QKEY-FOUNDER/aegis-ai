import { NextRequest } from 'next/server'

export const runtime = 'edge'

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

      try {
        const res = await fetch(`${origin}/api/radar`, {
          cache: 'no-store'
        })

        const data = await res.json()

        send({
          type: 'update',
          payload: data
        })

      } catch {
        send({
          type: 'error'
        })
      }

      controller.close() // 🔑 MUITO IMPORTANTE
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
