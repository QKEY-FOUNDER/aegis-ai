'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [result, setResult] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const [alert, setAlert] = useState(false)

  const scanMarket = async () => {
    if (scanning) return
    setScanning(true)

    try {
      const res = await fetch('/api/radar')
      const data = await res.json()

      if (!data.success) throw new Error(data.error || "Radar falhou")

      setResult(data)
      setLastUpdate(new Date().toLocaleTimeString())

      const hasHighRisk = data.data.some(
        (item: any) => item.analysis.manipulation_risk === "high"
      )

      if (hasHighRisk) {
        setAlert(true)
        try {
          const audio = new Audio('/alert.mp3')
          audio.play()
        } catch {}
      }

    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    scanMarket()
    const interval = setInterval(scanMarket, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <main style={{
      padding: 40,
      fontFamily: 'Arial',
      background: "#000",
      minHeight: "100vh",
      color: "white"
    }}>

      <h1>AEGIS AI</h1>

      {/* STATUS */}
      <div style={{ marginBottom: 20, color: "#00ff88" }}>
        ● LIVE {lastUpdate && `| ${lastUpdate}`}
      </div>

      {/* ALERT */}
      {alert && (
        <div style={{
          background: "#660000",
          padding: 15,
          borderRadius: 10,
          marginBottom: 20,
          textAlign: "center",
          fontWeight: "bold"
        }}>
          ⚠️ ALERTA SISTÉMICO DETETADO
          <div>
            <button onClick={() => setAlert(false)}>OK</button>
          </div>
        </div>
      )}

      {/* BOTÃO */}
      <button onClick={scanMarket} disabled={scanning}>
        {scanning ? 'Scanning...' : 'Scan Market'}
      </button>

      {/* ERRO */}
      {result?.error && (
        <p style={{ color: 'red' }}>{result.error}</p>
      )}

      {/* META */}
      {result?.meta && (
        <div style={{ marginTop: 20 }}>
          <h3>📊 Estado Global</h3>
          <p>Total: {result.meta.total}</p>
          <p>High Risk: {result.meta.highRiskCount}</p>
          <p>Score: {result.meta.avgScore}</p>
          <p>Sentimento: {result.meta.sentiment}</p>
        </div>
      )}

      {/* PRICE */}
      {result?.execution?.[0]?.price && (
        <div style={{ marginTop: 20 }}>
          <h3>💰 BTC Price</h3>
          <p>{result.execution[0].price} USDT</p>
        </div>
      )}

      {/* SIGNALS */}
      {result?.signals && (
        <div style={{ marginTop: 30 }}>
          <h3>⚡ Signals</h3>

          {result.signals.map((s: any, i: number) => (
            <div key={i} style={{
              background: "#111",
              padding: 10,
              marginBottom: 10,
              borderRadius: 8
            }}>
              <p><strong>{s.theme}</strong></p>
              <p>Signal: {s.signal}</p>
              <p>Confidence: {s.confidence}%</p>
            </div>
          ))}
        </div>
      )}

      {/* EXECUTION */}
      {result?.execution && (
        <div style={{ marginTop: 30 }}>
          <h3>🧠 Execution Engine</h3>

          {result.execution.map((e: any, i: number) => (
            <div key={i} style={{
              background:
                e.action === "buy" ? "#003300" :
                e.action === "sell" ? "#330000" :
                "#111",
              padding: 10,
              marginBottom: 10,
              borderRadius: 8
            }}>
              <p><strong>{e.theme}</strong></p>
              <p>Ação: {e.action}</p>
              <p>Confiança: {e.confidence}</p>
              <p>Preço: {e.price}</p>
            </div>
          ))}
        </div>
      )}

      {/* PORTFOLIO */}
      {result?.portfolio && (
        <div style={{ marginTop: 40 }}>
          <h3>📂 Portfolio</h3>

          {result.portfolio.map((p: any, i: number) => (
            <div key={i} style={{
              background: "#111",
              padding: 10,
              marginBottom: 10,
              borderRadius: 8,
              border: p.open ? "1px solid #00ff88" : "1px solid #444"
            }}>
              <p><strong>{p.theme}</strong></p>
              <p>Tipo: {p.type}</p>
              <p>Entry: {p.entry}</p>
              <p>PNL: {p.pnl?.toFixed(2)}</p>
              <p>Status: {p.open ? "OPEN" : "CLOSED"}</p>
            </div>
          ))}
        </div>
      )}

      {/* TRADES */}
      {result?.trades && (
        <div style={{ marginTop: 40 }}>
          <h3>📈 Trade Events</h3>

          {result.trades.map((t: any, i: number) => (
            <div key={i} style={{
              background: "#111",
              padding: 10,
              marginBottom: 10,
              borderRadius: 8
            }}>
              <p>{t.type.toUpperCase()} - {t.theme}</p>
              <p>Preço: {t.entry || t.exit}</p>
            </div>
          ))}
        </div>
      )}

      {/* CLUSTERS */}
      {result?.clusters && (
        <div style={{ marginTop: 40 }}>
          <h3>🧬 Narrativas</h3>

          {result.clusters.map((c: any, i: number) => (
            <div key={i} style={{
              background: "#111",
              padding: 10,
              marginBottom: 10,
              borderRadius: 8
            }}>
              <p>{c.theme}</p>
              <p>Count: {c.count}</p>
              <p>Surge: {c.surge}</p>
            </div>
          ))}
        </div>
      )}

      {/* TEMPORAL */}
      {result?.temporal && (
        <div style={{ marginTop: 40 }}>
          <h3>⏱ Temporal</h3>

          {result.temporal.map((t: any, i: number) => (
            <div key={i} style={{
              background: "#111",
              padding: 10,
              marginBottom: 10,
              borderRadius: 8
            }}>
              <p>{t.theme}</p>
              <p>{t.trend}</p>
              <p>Δ {t.delta}</p>
            </div>
          ))}
        </div>
      )}

    </main>
  )
}
