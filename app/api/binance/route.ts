export async function GET() {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")
    const data = await res.json()

    return new Response(JSON.stringify({
      success: true,
      price: data.price
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
