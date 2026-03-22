export async function POST(req: Request) {
  try {
    const { input } = await req.json()

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Avalia integridade, risco de manipulação, intenção e impacto sistémico. Responde em JSON com integrity_score (0-100), manipulation_risk (low/medium/high), intent, systemic_impact e explanation."
          },
          {
            role: "user",
            content: input
          }
        ]
      })
    })

    const data = await response.json()

    const content = data.choices?.[0]?.message?.content

    return new Response(JSON.stringify({
      success: true,
      data: JSON.parse(content)
    }), {
      headers: { "Content-Type": "application/json" }
    })

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: "Erro na análise"
    }), {
      status: 500
    })
  }
}
