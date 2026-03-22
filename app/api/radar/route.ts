let memoryStore: any[] = []
let portfolio: any[] = []

export async function GET() {
  try {
    console.log("RADAR START")

    const newsRes = await fetch(
      `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=10&apiKey=${process.env.NEWS_API_KEY}`
    )

    const newsData = await newsRes.json()

    if (!newsData.articles) {
      throw new Error("News API falhou")
    }

    const texts = newsData.articles.map((a: any) =>
      `${a.title}. ${a.description || ''}`
    )

    const baseUrl =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000')

const analyzeRes = await fetch(`${baseUrl}/api/analyze-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: texts })
    })

    const analyzed = await analyzeRes.json()

    if (!analyzed.data) {
      throw new Error("Analyze falhou")
    }

    const results = analyzed.data

    const rawClusters = clusterNarratives(results)
    const clusters = detectSurges(rawClusters)
    const temporal = updateMemory(clusters)
    const signals = generateSignals(clusters, temporal)

    const price = await getMarketPrice()

    const execution = executeSignals(signals, price)

    const trades = processPaperTrades(execution, price)

    // 📊 PnL STATS
    const stats = calculateStats(portfolio)

    const meta = {
      total: results.length,
      highRiskCount: results.filter((r: any) => r.analysis.manipulation_risk === "high").length,
      avgScore: Math.round(
        results.reduce((acc: number, r: any) => acc + r.analysis.integrity_score, 0) / results.length
      ),
      sentiment:
        results.some((r: any) => r.analysis.manipulation_risk === "high")
          ? "risk-on-alert"
          : "neutral"
    }

    return new Response(JSON.stringify({
      success: true,
      data: results,
      clusters,
      temporal,
      signals,
      execution,
      trades,
      portfolio,
      stats,
      meta
    }), {
      headers: { "Content-Type": "application/json" }
    })

  } catch (err: any) {
    console.error("RADAR ERROR:", err)

    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500 })
  }
}


// 🧠 CLUSTERS
function clusterNarratives(data: any[]) {
  const clusters: Record<string, any> = {}

  data.forEach(item => {
    const text = item.input.toLowerCase()

    let key = "outros"

    if (text.includes("china") || text.includes("chips") || text.includes("nvidia") || text.includes("ai")) {
      key = "geopolitica_tecnologia"
    } 
    else if (text.includes("oil") || text.includes("energy") || text.includes("petroleo")) {
      key = "energia"
    }
    else if (text.includes("fed") || text.includes("rates") || text.includes("inflation") || text.includes("interest")) {
      key = "macro_monetario"
    }
    else if (text.includes("stocks") || text.includes("market") || text.includes("sp500") || text.includes("dow")) {
      key = "mercado_global"
    }

    if (!clusters[key]) {
      clusters[key] = {
        theme: key,
        count: 0,
        highRisk: 0,
        avgScore: 0,
        items: []
      }
    }

    clusters[key].count++
    clusters[key].avgScore += item.analysis.integrity_score

    if (item.analysis.manipulation_risk === "high") {
      clusters[key].highRisk++
    }

    clusters[key].items.push(item)
  })

  return Object.values(clusters).map((c: any) => ({
    ...c,
    avgScore: Math.round(c.avgScore / c.count)
  }))
}


// 🚨 SURGE
function detectSurges(clusters: any[]) {
  return clusters.map(cluster => {
    let surge = "low"

    if (cluster.count >= 3 && cluster.highRisk >= 1) surge = "high"
    else if (cluster.count >= 2) surge = "medium"

    return { ...cluster, surge }
  })
}


// 🧠 MEMÓRIA
function updateMemory(currentClusters: any[]) {
  memoryStore.push({
    time: Date.now(),
    clusters: currentClusters
  })

  if (memoryStore.length > 10) memoryStore.shift()

  return analyzeTemporalDynamics()
}

function analyzeTemporalDynamics() {
  if (memoryStore.length < 2) return []

  const latest = memoryStore[memoryStore.length - 1].clusters
  const previous = memoryStore[memoryStore.length - 2].clusters

  return latest.map((cluster: any) => {
    const prev = previous.find((p: any) => p.theme === cluster.theme)

    let trend = "stable"

    if (prev) {
      if (cluster.count > prev.count) trend = "rising"
      if (cluster.count < prev.count) trend = "falling"
    } else {
      trend = "new"
    }

    return {
      theme: cluster.theme,
      trend,
      delta: prev ? cluster.count - prev.count : cluster.count
    }
  })
}


// ⚡ SIGNALS
function generateSignals(clusters: any[], temporal: any[]) {
  return clusters.map(cluster => {
    const t = temporal.find((x: any) => x.theme === cluster.theme)

    let signal = "neutral"
    let confidence = 50

    if (cluster.surge === "high" && t?.trend === "rising") {
      signal = "short"
      confidence = 80
    }
    else if (cluster.surge === "medium" && t?.trend === "rising" && cluster.highRisk === 0) {
      signal = "long"
      confidence = 70
    }
    else if (t?.trend === "new") {
      signal = "watch"
      confidence = 60
    }
    else if (t?.trend === "falling") {
      signal = "cooling"
      confidence = 55
    }

    return { theme: cluster.theme, signal, confidence }
  })
}


// 🧠 EXECUTION
function executeSignals(signals: any[], price: number | null) {
  return signals.map(signal => {
    let action = "hold"

    if (signal.signal === "long") action = "buy"
    else if (signal.signal === "short") action = "sell"
    else if (signal.signal === "watch") action = "monitor"
    else if (signal.signal === "cooling") action = "reduce"

    return {
      theme: signal.theme,
      action,
      confidence: signal.confidence,
      price,
      timestamp: Date.now()
    }
  })
}


// 🧪 PAPER TRADING
function processPaperTrades(execution: any[], price: number | null) {
  if (!price) return []

  const events: any[] = []

  execution.forEach(exec => {
    if (exec.action === "buy" || exec.action === "sell") {

      const pos = {
        theme: exec.theme,
        type: exec.action === "buy" ? "long" : "short",
        entry: price,
        open: true,
        timestamp: Date.now()
      }

      portfolio.push(pos)
      events.push({ type: "open", ...pos })
    }
  })

  portfolio.forEach(pos => {
    if (!pos.open) return

    const pnl =
      pos.type === "long"
        ? price - pos.entry
        : pos.entry - price

    pos.pnl = pnl

    if (pnl > 100 || pnl < -100) {
      pos.open = false
      pos.exit = price

      events.push({ type: "close", ...pos })
    }
  })

  return events
}


// 📊 STATS
function calculateStats(portfolio: any[]) {
  const closed = portfolio.filter(p => !p.open && p.pnl !== undefined)

  const totalPnL = closed.reduce((acc, p) => acc + p.pnl, 0)

  const wins = closed.filter(p => p.pnl > 0).length
  const losses = closed.filter(p => p.pnl <= 0).length

  const winRate = closed.length > 0
    ? Math.round((wins / closed.length) * 100)
    : 0

  const openPositions = portfolio.filter(p => p.open).length

  return {
    totalPnL: Math.round(totalPnL),
    trades: closed.length,
    wins,
    losses,
    winRate,
    openPositions
  }
}


// 💰 BINANCE
async function getMarketPrice() {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT")
    const data = await res.json()
    return parseFloat(data.price)
  } catch {
    return null
  }
}
