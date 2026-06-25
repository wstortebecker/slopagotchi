import { useMemo, useState } from 'react'
import { Card, StatusBadge, PixelIcon } from '../ds/index.js'
import TopBar from '../components/TopBar.jsx'
import { CITIES, scoreboardRows } from '../game/scoreboard.js'

/* Deterministic avatar tint from a maintainer handle. */
const AV = ['#f0408a', '#2f9fe0', '#2fae57', '#f4a623', '#b18ad6', '#f5994a', '#58c4e6']
function avatarColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AV[h % AV.length]
}

/* Columns marked sortable get a clickable header with the ⇅ glyph. */
const COLUMNS = [
  { key: 'repo', label: 'GitHub repo', sortable: true, align: 'left' },
  { key: 'status', label: 'Health', sortable: true, align: 'left' },
  { key: 'slop', label: 'Slop', sortable: true, align: 'right' },
  { key: 'openPRs', label: 'Open PRs', sortable: true, align: 'right' },
  { key: 'maintainer', label: 'Maintainer', sortable: false, align: 'left' },
  { key: 'lastCommit', label: 'Last commit', sortable: false, align: 'left' },
  { key: 'city', label: 'City', sortable: true, align: 'left' },
]

const HEALTH_RANK = { thriving: 4, ok: 3, sick: 2, critical: 1, dead: 0 }

function downloadCsv(rows) {
  const head = ['Repo', 'Health', 'Slop', 'Open PRs', 'Maintainer', 'Last commit', 'City', 'Country']
  const body = rows.map((r) => [r.repo, r.health, r.slop, r.openPRs, r.maintainer, r.lastCommit, r.city, r.country])
  const csv = [head, ...body].map((cols) => cols.map((c) => `"${c}"`).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'slopagotchi-scoreboard.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Scoreboard() {
  const allRows = useMemo(() => scoreboardRows(), [])
  const [city, setCity] = useState('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'slop', dir: 'asc' })

  const topCities = CITIES.filter((c) => c.top)
  const moreCities = CITIES.filter((c) => !c.top)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = allRows.filter((r) => {
      if (city !== 'all' && r.cityId !== city) return false
      if (q && !r.repo.toLowerCase().includes(q) && !r.maintainer.toLowerCase().includes(q)) return false
      return true
    })
    const { key, dir } = sort
    const sign = dir === 'asc' ? 1 : -1
    out = [...out].sort((a, b) => {
      const va = key === 'status' ? HEALTH_RANK[a.status] : a[key]
      const vb = key === 'status' ? HEALTH_RANK[b.status] : b[key]
      if (typeof va === 'number') return (va - vb) * sign
      return String(va).localeCompare(String(vb)) * sign
    })
    return out
  }, [allRows, city, query, sort])

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

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
                Every repo on Slopagotchi, ranked by the health of the pet it feeds.
              </p>
            </div>
            <button onClick={() => downloadCsv(rows)} style={ghostBtn}>
              <PixelIcon name="star" scale={2} color="var(--ink-2)" /> Export as CSV
            </button>
          </div>

          {/* filter bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
            <select value={city} onChange={(e) => setCity(e.target.value)} style={selectStyle}>
              <option value="all">All cities</option>
              <optgroup label="Top cities">
                {topCities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.country}</option>
                ))}
              </optgroup>
              <optgroup label="More cities">
                {moreCities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.country}</option>
                ))}
              </optgroup>
            </select>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repo or maintainer…"
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
                      <a
                        href={`https://github.com/${r.repo}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, color: 'var(--ink)' }}
                      >
                        <span style={repoIcon}><PixelIcon name="heart" scale={2} color="var(--ink-2)" /></span>
                        {r.repo}
                      </a>
                    </td>
                    <td><StatusBadge status={r.status} subtle /></td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: r.slop > 50 ? 'var(--slop)' : 'var(--ink-2)' }}>{r.slop}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--ink-2)' }}>{r.openPRs}</td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <span style={{ ...avatar, background: avatarColor(r.maintainer) }}>{r.maintainer[0].toUpperCase()}</span>
                        <span style={{ fontWeight: 700, color: 'var(--ink-2)' }}>{r.maintainer}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--ink-3)', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.lastCommit}</td>
                    <td style={{ color: 'var(--ink-2)', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.city}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} style={{ textAlign: 'center', color: 'var(--ink-3)', fontWeight: 700, padding: '32px 0' }}>
                      No repos match that filter.
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

const selectStyle = {
  height: 40,
  padding: '0 34px 0 14px',
  fontFamily: 'var(--font-pixel)',
  fontSize: 10,
  letterSpacing: '0.02em',
  color: 'var(--ink)',
  background:
    'var(--surface-card) url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\' viewBox=\'0 0 8 8\'%3E%3Cpath d=\'M0 1h2v2h2V1h2V0H0zM2 3h4v2H2zM3 5h2v2H3z\' fill=\'%23242521\'/%3E%3C/svg%3E") no-repeat right 14px center',
  // pixel look: chunky bevel border, hard-edged shadow, rounded corners
  border: '3px solid var(--ink)',
  borderRadius: 'var(--radius-sm)',
  boxShadow: '0 3px 0 var(--ink)',
  imageRendering: 'pixelated',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
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

const repoIcon = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: 'var(--paper-2)',
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
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
