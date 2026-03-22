export async function POST(req: Request) {
  try {
    const { inputs } = await req.json()

    console.log("API KEY:", process.env.OPENAI_API_KEY)
    console.log("INPUTS:", inputs)

    const results = []

    for (const input of inputs) {

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          input: `És um sistema avançado de análise de narrativas financeiras e manipulação de mercado.

Analisa o seguinte texto:

"${input}"

Avalia com pensamento crítico:

- Se é hype, medo ou manipulação
- Se há linguagem emocional ou exagerada
- Se é plausível no contexto de mercado real

Responde APENAS em JSON válido:

{
  "integrity_score": number,
  "manipulation_risk": "low" | "medium" | "high",
  "intent": string,
  "systemic_impact": string,
  "explanation": string
}`
        })
      })

      const data = await response.json()

      // DEBUG COMPLETO
      console.log("FULL OPENAI RESPONSE:", JSON.stringify(data, null, 2))

      // EXTRAÇÃO ROBUSTA
      let content = ""

      try {
        content = data.output
          ?.map((item: any) =>
            item.content
              ?.map((c: any) => c.text || "")
              .join("")
          )
          .join("") || ""
      } catch (e) {
        console.log("ERRO A EXTRAIR TEXTO:", data)
      }

      let parsed

      try {
        const clean = content
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim()

        parsed = JSON.parse(clean)

      } catch (e) {
        console.log("RAW RESPONSE:", content)

        parsed = {
          integrity_score: 50,
          manipulation_risk: "unknown",
          intent: "unknown",
          systemic_impact: "unknown",
          explanation: content
        }
      }

      results.push({
        input,
        analysis: parsed
      })
    }

    return new Response(JSON.stringify({
      success: true,
      data: results
    }), {
      headers: { "Content-Type": "application/json" }
    })

  } catch (err: any) {
    console.error("FATAL ERROR:", err)

    return new Response(JSON.stringify({
      success: false,
      error: err.message || "Erro batch"
    }), {
      status: 500
    })
  }
}
