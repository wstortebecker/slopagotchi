import { useEffect, useState } from 'react'
import { Card, PixelIcon, StatMeter, StatusBadge } from '../ds/index.js'
import { usePet } from '../game/store.jsx'
import { relTime } from '../game/engine.js'
import { getPet, githubSubjectKey } from '../api/client.js'

/* A short repo/PR label for a real scored PR: prefer the github owner/repo, then
   the PR title, then the trailing segments of the AT-URI. */
function repoLabel(pr) {
  if (pr.prUrl) {
    const m = pr.prUrl.match(/github\.com\/([^/]+\/[^/]+)/)
    if (m) return m[1]
  }
  if (pr.prTitle) return pr.prTitle
  return pr.prUri ? pr.prUri.split('/').slice(-2).join('/') : 'pull request'
}

/* Local-sim incidents → the normalised row the panel renders. Magnitude is the
   line count the toy game tracks. */
function localRows(pet) {
  return pet.incidents.map((it, i) => ({
    key: it.ts || i,
    icon: it.lines > 200 ? 'skull' : it.lines > 40 ? 'slop' : 'bolt',
    primary: `${it.repo} · ${it.lines} lines`,
    verdict: it.verdict,
    ts: it.ts,
  }))
}

/* Real scored PRs → the same normalised row. Magnitude is the 0–100 slop score;
   the icon escalates with it (bolt → slop → skull). Newest first, capped at 6. */
function backendRows(prs) {
  return prs
    .map((pr, i) => ({
      key: pr.prUri || i,
      icon: pr.latestScore > 66 ? 'skull' : pr.latestScore > 33 ? 'slop' : 'bolt',
      primary: `${repoLabel(pr)} · slop ${pr.latestScore}`,
      verdict: pr.latestVerdict,
      ts: Date.parse(pr.createdAt) || Date.now(),
    }))
    .slice(0, 6)
}

/**
 * VitalsPanel — name + status, the three vital meters, a slop tally, and the
 * rolling list of slop incidents.
 *
 * When the pet is connected to a real handle, the tally and incidents are driven
 * by the backend's scored pull requests (via getPet). A purely local pet — or a
 * connected one whose first scores haven't landed — falls back to the in-browser
 * simulation, so the panel is never empty and the local game keeps working.
 */
export default function VitalsPanel() {
  const { pet, status, meters } = usePet()
  const now = Date.now()

  const handle = pet?.handle || ''
  const lookupKey = handle ? (pet?.source === 'github' ? githubSubjectKey(handle) : handle) : ''
  const [feed, setFeed] = useState({ status: lookupKey ? 'loading' : 'unlinked', prs: [] })

  useEffect(() => {
    if (!lookupKey) {
      setFeed({ status: 'unlinked', prs: [] })
      return undefined
    }
    let alive = true
    const load = async () => {
      const res = await getPet(lookupKey)
      if (!alive) return
      if (res.ok) setFeed({ status: 'ok', prs: res.data?.prs ?? [] })
      else if (res.status === 404) setFeed({ status: 'pending', prs: [] })
      else setFeed({ status: 'error', prs: [] })
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      window.removeEventListener('focus', onFocus)
    }
  }, [lookupKey])

  // Backend-backed once a connected pet's scores have landed; local otherwise.
  const backed = feed.status === 'ok'
  const rows = backed ? backendRows(feed.prs) : localRows(pet)

  const slopToday = pet.slopToday
  const tile = backed
    ? { label: 'PRs scored', value: feed.prs.length, unit: feed.prs.length === 1 ? 'PR' : 'PRs', heavy: false }
    : { label: 'Slop shipped today', value: slopToday, unit: 'lines', heavy: slopToday > 50 }

  const emptyIncidents = backed
    ? 'no pull requests scored yet. ship a clean one.'
    : "no slop incidents yet. suspicious, but i'll take it."

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 480 }}>
      {/* identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 15, color: 'var(--ink)' }}>{pet.name}</div>
        <StatusBadge status={status} />
      </div>

      {/* vitals */}
      <Card padding={18} radius={2} style={{ boxShadow: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatMeter label="Health" value={meters.health} max={4} />
          <StatMeter label="Hunger" value={meters.hunger} max={4} />
          <StatMeter label="Slop" value={meters.slop} max={5} invert color="var(--slop)" />
        </div>
      </Card>

      {/* slop tally */}
      <Card padding={18} tone={tile.heavy ? 'accent' : 'default'} radius={2} style={{ boxShadow: 'none' }}>
        <div className="section-label">{tile.label}</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-pixel)',
            fontSize: 26,
            color: tile.heavy ? 'var(--accent-press)' : 'var(--ink)',
            marginTop: 10,
            minHeight: 26,
          }}
        >
          {tile.value} <span style={{ fontSize: 11 }}>{tile.unit}</span>
        </div>
      </Card>

      {/* incidents */}
      <Card padding={0} radius={2} style={{ boxShadow: 'none' }}>
        <div className="section-label" style={{ padding: '14px 18px 8px' }}>
          Recent slop incidents
        </div>
        {rows.length === 0 ? (
          <div style={{ padding: '8px 18px 18px', fontFamily: 'var(--font-lcd)', fontSize: 15, color: 'var(--ink-3)' }}>
            {emptyIncidents}
          </div>
        ) : (
          <div>
            {rows.map((it) => (
              <div
                key={it.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 18px',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <PixelIcon name={it.icon} scale={3} color="var(--slop)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--ink)' }}>{it.primary}</div>
                  <div style={{ fontFamily: 'var(--font-lcd)', fontSize: 14, color: 'var(--ink-3)' }}>“{it.verdict}”</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{relTime(it.ts, now)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
