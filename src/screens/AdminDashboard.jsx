import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { Button, Card } from '../ds/index.js'
import Logo from '../ds/Logo.jsx'

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

function Metric({ label, value, sub, accent = false }) {
  return (
    <Card padding={28} style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>
        {label}
      </div>
      <div className="pixel-display" style={{ fontSize: 'clamp(24px, 3.2vw, 38px)', color: accent ? 'var(--accent)' : 'var(--ink)' }}>
        {value}
      </div>
      {sub ? <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>{sub}</div> : null}
    </Card>
  )
}

export default function AdminDashboard() {
  const { getToken } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [fetchedAt, setFetchedAt] = useState(null)

  const load = useCallback(async () => {
    try {
      const token = await getToken()
      const res = await fetch('/api/metrics', { headers: { Authorization: `Bearer ${token}` } })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError((body.error || 'Could not load metrics.') + (body.email ? ` (signed in as ${body.email})` : ''))
        setData(null)
      } else {
        setData(body)
        setError('')
      }
    } catch {
      setError('Could not reach the metrics API. Is the server running?')
    } finally {
      setLoading(false)
      setFetchedAt(new Date())
    }
  }, [getToken])

  useEffect(() => {
    load()
    const id = setInterval(load, 30000) // live: refresh every 30s
    return () => clearInterval(id)
  }, [load])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <div className="container" style={{ padding: '40px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Logo size={28} />
            <div>
              <h1 className="pixel-display" style={{ fontSize: 22, margin: 0 }}>Live metrics</h1>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', marginTop: 4 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--health-thriving)', marginRight: 7 }} />
                straight from Stripe · USD · auto-refreshes
              </div>
            </div>
          </div>
          <Button size="md" variant="ghost" pixel={false} onClick={load}>
            Refresh
          </Button>
        </div>

        {error ? (
          <Card padding={28} style={{ borderColor: 'var(--health-danger)' }}>
            <div style={{ fontWeight: 800, color: 'var(--health-danger)', marginBottom: 6 }}>Can’t show metrics</div>
            <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 600 }}>{error}</div>
          </Card>
        ) : loading && !data ? (
          <Card padding={28}>
            <div style={{ fontWeight: 700, color: 'var(--ink-2)' }}>Loading live numbers…</div>
          </Card>
        ) : data ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
              <Metric label="MRR" value={usd2.format(data.mrr)} sub="monthly recurring revenue" accent />
              <Metric label="ARR" value={usd0.format(data.arr)} sub="annual run-rate (MRR × 12)" accent />
              <Metric label="Active subscribers" value={data.activeSubscribers} sub="active + trialing" />
              <Metric label="Revenue · 30 days" value={usd2.format(data.revenue30d)} sub={`${data.payments30d} payments, net of refunds`} />
            </div>
            <div style={{ marginTop: 18, fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>
              Updated {fetchedAt ? fetchedAt.toLocaleTimeString() : '—'}
              {data.nonUsdSubscriptions ? ` · ${data.nonUsdSubscriptions} non-USD subscription(s) excluded` : ''}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
