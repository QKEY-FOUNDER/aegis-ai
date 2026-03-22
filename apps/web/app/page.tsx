'use client'

import { useState, useEffect, useRef } from 'react'

type Alert = {
  id: string
  type: string
  severity: string
  message: string
}

export default function Home() {
  const [result, setResult] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const [alert, setAlert] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])

  const isMounted = useRef(true)
  const alertHistory = useRef<Set<string>>(new Set())

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const generateAlerts = (data: any) => {
    const newAlerts: Alert[] = []

    if (data?.meta?.highRiskCount > 0) {
      newAlerts.push({
        id: 'global-risk',
        type: 'risk',
        severity: 'high',
        message: 'Risco elevado detetado no mercado'
      })
    }

    data?.clusters?.forEach((c: any) => {
      if (c.surge === 'high') {
        newAlerts.push({
          id: `surge-${c.theme}`,
          type: 'surge',
          severity: 'high',
          message: `Surge crítico: ${c.theme}`
        })
      }
    })

    data?.signals?.forEach((s: any) => {
      if (s.signal === 'short' && s.confidence >= 80) {
        newAlerts.push({
          id: `signal-${s.theme}`,
          type: 'signal',
          severity: 'high',
          message: `SHORT forte: ${s.theme}`
        })
      }
    })

    return newAlerts
  }

  const scanMarket = async () => {
    if (scanning) return

    setScanning(true)

    try {
      const res = await fetch('/api/radar')

      const text = await res.text()
      let data

      try {
        data = JSON.parse(text)
      } catch {
        throw new Error("Resposta não é JSON válido")
      }

      if (!data?.success) {
        throw new Error(data?.error || "Radar falhou")
      }

      if (!isMounted.current) return

      setResult(data)
      setLastUpdate(new Date().toLocaleTimeString())

      const generated = generateAlerts(data)

      const uniqueAlerts = generated.filter(a => {
        if (alertHistory.current.has(a.id)) return false
        alertHistory.current.add(a.id)
        return true
      })

      if (uniqueAlerts.length > 0) {
        setAlerts(prev => [...uniqueAlerts, ...prev])
        setAlert(true)

        try {
          if (typeof window !== 'undefined') {
            const audio = new Audio('/alert.mp3')
            audio.play().catch(() => {})
          }
        } catch {}
      }

    } catch (err: any) {
      if (!isMounted.current) return
      setResult({ error: err.message || 'Erro desconhecido' })
    } finally {
      if (isMounted.current) setScanning(false)
    }
  }

  useEffect(() => {
    scanMarket()

    const interval = setInterval(() => {
      scanMarket()
    }, 15000)

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

      <div style={{ marginBottom: 20, color: "#00ff88" }}>
        ● LIVE {lastUpdate && `| ${lastUpdate}`}
      </div>

      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.slice(0, 3).map((a, i) => (
            <div key={i} style={{
              background:
                a.severity === 'high' ? '#660000' :
                a.severity === 'medium' ? '#665500' :
                '#333',
              padding: 12,
              borderRadius: 8,
              marginBottom: 10,
              fontWeight: 'bold'
            }}>
              ⚠️ {a.message}
            </div>
          ))}

          <button onClick={() => {
            setAlerts([])
            setAlert(false)
            alertHistory.current.clear()
          }}>
            Limpar Alertas
          </button>
        </div>
      )}

      <button onClick={scanMarket} disabled={scanning}>
        {scanning ? 'Scanning...' : 'Scan Market'}
      </button>

      <pre style={{
        marginTop: 20,
        background: "#111",
        padding: 10,
        borderRadius: 8,
        fontSize: 10,
        maxHeight: 200,
        overflow: "auto"
      }}>
        {JSON.stringify(result, null, 2)}
      </pre>

      {result?.error && (
        <p style={{ color: 'red', marginTop: 20 }}>
          {result.error}
        </p>
      )}

      {result?.meta && (
        <div style={{ marginTop: 20 }}>
          <h3>📊 Estado Global</h3>
          <p>Total: {result.meta.total}</p>
          <p>High Risk: {result.meta.highRiskCount}</p>
          <p>Score: {result.meta.avgScore}</p>
          <p>Sentimento: {result.meta.sentiment}</p>
        </div>
      )}

      {Array.isArray(result?.execution) &&
        result.execution.length > 0 &&
        result.execution[0]?.price && (
        <div style={{ marginTop: 20 }}>
          <h3>💰 BTC Price</h3>
          <p>{result.execution[0].price} USDT</p>
        </div>
      )}

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

    </main>
  )
}
