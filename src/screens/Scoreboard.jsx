import { useEffect, useMemo, useState } from 'react'
import { Card, StatusBadge, PixelIcon } from '../ds/index.js'
import TopBar from '../components/TopBar.jsx'
import { getScoreboard } from '../api/client.js'

/* Deterministic avatar tint from a developer name. */
const AV = ['#f0408a', '#2f9fe0', '#2fae57', '#f4a623', '#b18ad6', '#f5994a', '#58c4e6']
function avatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AV[h % AV.length]
}

/* Columns marked sortable get a clickable header with the ⇅ glyph. */
const COLUMNS = [
  { key: 'name', label: 'Developer', sortable: true, align: 'left' },
  { key: 'health', label: 'Health', sortable: true, align: 'left' },
  { key: 'slop', label: 'Slop', sortable: true, align: 'right' },
  { key: 'diagnostics', label: 'Diagnostics', sortable: true, align: 'right' },
  { key: 'source', label: 'Source', sortable: true, align: 'left' },
  { key: 'updatedAt', label: 'Updated', sortable: true, align: 'left' },
]

function clampHealth(health) {
  const n = typeof health === 'number' && Number.isFinite(health) ? health : 100
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** Health (0–100) → StatusBadge key, mirroring the engine's mood thresholds. */
function statusForHealth(health) {
  if (health >= 80) return 'thriving'
  if (health >= 60) return 'ok'
  if (health >= 40) return 'sick'
  if (health >= 20) return 'critical'
  return 'dead'
}

/** A `did:`-keyed subject is a Tangled developer; `github:<login>` is a GitHub one. */
function sourceForSubject(subject) {
  return String(subject || '').startsWith('github:') ? 'GitHub' : 'Tangled'
}

/** Short display name: handle if present, else the GitHub login or a clipped DID. */
function displayName(dev) {
  if (dev.handle) return dev.handle
  const s = String(dev.subject || '')
  if (s.startsWith('github:')) return s.slice('github:'.length)
  if (s.startsWith('did:') && s.length > 22) return `${s.slice(0, 20)}…`
  return s || 'unknown'
}

/** A relative "time ago" from an ISO timestamp. */
function relTime(iso) {
  const t = Date.parse(iso)
  if (!t) return '—'
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w}w ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(d / 365)}y ago`
}

/** Map a pet-state record from the AT record to a row the table renders. */
function rowFromDeveloper(dev) {
  const health = clampHealth(dev.health)
  return {
    id: dev.subject,
    subject: dev.subject,
    name: displayName(dev),
    health,
    slop: Math.max(0, 100 - health),
    diagnostics: dev.diagnosticCount ?? 0,
    source: sourceForSubject(dev.subject),
    updatedAt: dev.updatedAt,
    status: statusForHealth(health),
  }
}

function downloadCsv(rows) {
  const head = ['Rank', 'Developer', 'Subject', 'Health', 'Slop', 'Diagnostics', 'Source', 'Updated']
  const body = rows.map((r, i) => [i + 1, r.name, r.subject, r.health, r.slop, r.diagnostics, r.source, r.updatedAt])
  const csv = [head, ...body].map((cols) => cols.map((c) => `"${c}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'slopagotchi-scoreboard.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Scoreboard() {
  // 'loading' → fetching; 'ready' → backend answered; 'offline' → unreachable.
  const [feed, setFeed] = useState({ status: 'loading', configured: false, developers: [] })
  const [query, setQuery] = useState('')
  // Default to the backend's own order (PR-weighted ranking); column clicks override.
  const [sort, setSort] = useState({ key: 'rank', dir: 'asc' })

  useEffect(() => {
    let alive = true
    getScoreboard().then((res) => {
      if (!alive) return
      if (res.ok && res.data && Array.isArray(res.data.developers)) {
        setFeed({ status: 'ready', configured: !!res.data.configured, developers: res.data.developers })
      } else {
        setFeed({ status: 'offline', configured: false, developers: [] })
      }
    })
    return () => {
      alive = false
    }
  }, [])

  // `rank` preserves the backend's PR-weighted order so it's the stable default sort.
  const allRows = useMemo(
    () => feed.developers.map((d, i) => ({ ...rowFromDeveloper(d), rank: i })),
    [feed.developers],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = allRows.filter((r) => !q || r.name.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q))
    const { key, dir } = sort
    const sign = dir === 'asc' ? 1 : -1
    out = [...out].sort((a, b) => {
      let va = a[key]
      let vb = b[key]
      if (key === 'updatedAt') {
        va = Date.parse(a.updatedAt) || 0
        vb = Date.parse(b.updatedAt) || 0
      }
      if (typeof va === 'number') return (va - vb) * sign
      return String(va).localeCompare(String(vb)) * sign
    })
    return out
  }, [allRows, query, sort])

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))

  const emptyMessage =
    feed.status === 'loading'
      ? 'Loading the record…'
      : feed.status === 'offline' || !feed.configured
        ? 'Scoreboard backend unavailable — no developers to show yet.'
        : query.trim()
          ? 'No developers match that search.'
          : 'No developers on the record yet.'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar active="scoreboard" />
      <main className="container" style={{ padding: '36px 24px 72px', flex: 1 }}>
        <Card padding={0} radius={0} style={{ overflow: 'hidden', border: 'none' }}>
          {/* header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between', padding: '22px 24px 0' }}>
            <div>
              <h1 className="pixel-display" style={{ fontSize: 'clamp(18px, 2.4vw, 24px)', margin: 0 }}>
                Scoreboard <span style={{ color: 'var(--ink-3)' }}>[{rows.length}]</span>
              </h1>
              <p style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 14, marginTop: 8 }}>
                Every developer on the Slopagotchi record, ranked by pet health and weighted by how many PRs they&apos;ve shipped.
              </p>
            </div>
            <button onClick={() => downloadCsv(rows)} disabled={rows.length === 0} style={{ ...ghostBtn, opacity: rows.length === 0 ? 0.5 : 1, cursor: rows.length === 0 ? 'default' : 'pointer' }}>
              <PixelIcon name="star" scale={2} color="var(--ink-2)" /> Export as CSV
            </button>
          </div>

          {/* filter bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'flex-end', padding: '16px 24px' }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search developer or DID…"
              autoComplete="off"
              spellCheck={false}
              style={searchStyle}
            />
          </div>

          {/* table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="scoreboard-table">
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                      style={{
                        textAlign: col.align,
                        cursor: col.sortable ? 'pointer' : 'default',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.label}
                      {col.sortable && (
                        <span style={{ color: sort.key === col.key ? 'var(--accent)' : 'var(--ink-3)', marginLeft: 6 }}>
                          {sort.key === col.key ? (sort.dir === 'asc' ? '↑' : '↓') : '⇅'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ ...avatar, background: avatarColor(r.name) }}>{r.name[0].toUpperCase()}</span>
                        {r.source === 'GitHub' ? (
                          <a href={`https://github.com/${r.name}`} target="_blank" rel="noreferrer" style={{ fontWeight: 800, color: 'var(--ink)' }}>
                            {r.name}
                          </a>
                        ) : (
                          <span style={{ fontWeight: 800, color: 'var(--ink)' }}>{r.name}</span>
                        )}
                      </span>
                    </td>
                    <td><StatusBadge status={r.status} subtle /></td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: r.slop > 50 ? 'var(--slop)' : 'var(--ink-2)' }}>{r.slop}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink-2)' }}>{r.diagnostics}</td>
                    <td style={{ color: 'var(--ink-2)', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.source}</td>
                    <td style={{ color: 'var(--ink-3)', fontWeight: 700, whiteSpace: 'nowrap' }}>{relTime(r.updatedAt)}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} style={{ textAlign: 'center', color: 'var(--ink-3)', fontWeight: 700, padding: '32px 0' }}>
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  )
}

const ghostBtn = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  height: 38,
  padding: '0 14px',
  fontWeight: 800,
  fontSize: 13,
  color: 'var(--ink-2)',
  background: 'var(--surface-card)',
  border: '2px solid var(--line)',
  borderRadius: 'var(--radius-pill)',
  cursor: 'pointer',
}

const searchStyle = {
  height: 40,
  minWidth: 240,
  flex: '0 1 320px',
  padding: '0 14px',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--ink)',
  background: 'var(--surface-card)',
  border: '2px solid var(--line)',
  borderRadius: 'var(--radius-pill)',
  outline: 'none',
}

const avatar = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center',
  color: '#fff',
  fontWeight: 900,
  fontSize: 12,
  flexShrink: 0,
}
