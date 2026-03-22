export async function GET() {
  try {
    const res = await fetch(
      "https://newsapi.org/v2/everything?q=crypto OR bitcoin OR ethereum&language=en&sortBy=publishedAt&pageSize=5&apiKey=" + process.env.NEWS_API_KEY
    )

    const data = await res.json()

    const articles = data.articles.map((a: any) => ({
      title: a.title,
      description: a.description
    }))

    return new Response(JSON.stringify({
      success: true,
      data: articles
    }), {
      headers: { "Content-Type": "application/json" }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), {
      status: 500
    })
  }
}
