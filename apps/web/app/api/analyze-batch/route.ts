export async function POST(req: Request) {
  try {
    const { inputs } = await req.json()

    if (!inputs || !Array.isArray(inputs)) {
      throw new Error("Inputs inválidos")
    }

    const data = inputs.map((text: string) => ({
      input: text,
      analysis: {
        integrity_score: Math.floor(Math.random() * 40) + 60,
        manipulation_risk:
          Math.random() > 0.7 ? "high" : "low"
      }
    }))

    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      headers: { "Content-Type": "application/json" }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500 })
  }
}
