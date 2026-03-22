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
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [connection, setConnection] = useState<'live' | 'reconnecting'>('live')

  const isMounted = useRef(true)
  const alertHistory = useRef<Set<string>>(new Set())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // CLEANUP
  useEffect(() => {
    return () => {
      isMounted.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // ALERT ENGINE
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

    if (Array.isArray(data?.clusters)) {
      data.clusters.forEach((c: any) => {
        if (c?.surge === 'high') {
          newAlerts.push({
            id: `surge-${c.theme}`,
            type: 'surge',
            severity: 'high',
            message: `Surge crítico: ${c.theme}`
          })
        }
      })
    }

    if (Array.isArray(data?.signals)) {
      data.signals.forEach((s: any) => {
        if (s?.signal === 'short' && s?.confidence >= 80) {
          newAlerts.push({
            id: `signal-${s.theme}`,
            type: 'signal',
            severity: 'high',
            message: `SHORT forte: ${s.theme}`
          })
        }
      })
    }

    return newAlerts
  }

  // CORE SCAN
  const scanMarket = async () => {
    if (scanning) return

    setScanning(true)

    try {
      const res = await fetch('/api/radar', { cache: 'no-store' })

      if (!res.ok) throw new Error("Erro na API")

      const data = await res.json()

      if (!data?.success) {
        throw new Error(data?.error || "Radar falhou")
      }

      if (!isMounted.current) return

      setConnection('live')
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

        try {
          if (typeof window !== 'undefined') {
            const audio = new Audio('/alert.mp3')
            audio.play().catch(() => {})
          }
        } catch {}
      }

    } catch (err: any) {
      if (!isMounted.current) return

      setConnection('reconnecting')
      setResult({ error: err.message || 'Erro desconhecido' })

    } finally {
      if (isMounted.current) setScanning(false)
    }
  }

  // REAL-TIME MODE (CONTROLLED POLLING)
  useEffect(() => {
    if (intervalRef.current) return

    scanMarket()

    intervalRef.current = setInterval(() => {
      scanMarket()
    }, 15000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
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
      <div style={{ marginBottom: 20 }}>
        <span style={{
          color: connection === 'live' ? "#00ff88" : "#ffaa00",
          fontWeight: 'bold'
        }}>
          ● {connection === 'live' ? 'LIVE' : 'RECONNECTING'}
        </span>

        {lastUpdate && (
          <span style={{ marginLeft: 10, color: "#aaa" }}>
            | {lastUpdate}
          </span>
        )}
      </div>

      {/* ALERTS */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {alerts.slice(0, 3).map((a, i) => (
            <div key={i} style={{
              background: '#660000',
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
            alertHistory.current.clear()
          }}>
            Limpar Alertas
          </button>
        </div>
      )}

      {/* MANUAL SCAN */}
      <button onClick={scanMarket} disabled={scanning}>
        {scanning ? 'Scanning...' : 'Scan Market'}
      </button>

      {/* DEBUG */}
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

      {/* ERROR */}
      {result?.error && (
        <p style={{ color: 'red', marginTop: 20 }}>
          {result.error}
        </p>
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
      {Array.isArray(result?.execution) &&
        result.execution[0]?.price && (
        <div style={{ marginTop: 20 }}>
          <h3>💰 BTC Price</h3>
          <p>{result.execution[0].price} USDT</p>
        </div>
      )}

      {/* SIGNALS */}
      {Array.isArray(result?.signals) && (
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
      {Array.isArray(result?.execution) && (
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

      {/* CLUSTERS */}
      {Array.isArray(result?.clusters) && (
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
