import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../ds/index.js'
import TopBar from '../components/TopBar.jsx'
import ZooCard from '../components/ZooCard.jsx'
import { usePet } from '../game/store.jsx'
import { TEAM, playerRow, rankZoo } from '../game/zoo.js'
import { getZoo } from '../api/client.js'
import { rowFromMember } from '../api/mapping.js'

function SummaryStat({ value, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 22, color: color || 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginTop: 6 }}>{label}</div>
    </div>
  )
}

const norm = (h) => String(h || '').toLowerCase().replace(/^@/, '')

/**
 * Fetches the player's real team zoo from the backend (when they've connected a
 * Tangled handle to a team). Returns the live members or null while loading /
 * when there's nothing real to show, so the screen can fall back to the demo
 * roster. Re-fetches on focus so a backfill that finishes elsewhere appears.
 */
function useRemoteZoo(team) {
  const [state, setState] = useState({ loading: !!team, configured: false, members: [] })

  useEffect(() => {
    if (!team) {
      setState({ loading: false, configured: false, members: [] })
      return undefined
    }
    let alive = true
    const load = async () => {
      const res = await getZoo(team)
      if (!alive) return
      const configured = res.ok && res.data?.configured === true
      const members = Array.isArray(res.data?.members) ? res.data.members : []
      setState({ loading: false, configured, members })
    }
    load()
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => {
      alive = false
      window.removeEventListener('focus', onFocus)
    }
  }, [team])

  return state
}

export default function Zoo() {
  const navigate = useNavigate()
  const { pet, mood, meters } = usePet()
  const team = pet?.team || ''
  const myHandle = norm(pet?.handle)
  const remote = useRemoteZoo(team)

  const live = remote.configured && remote.members.length > 0

  const rows = useMemo(() => {
    const me = playerRow(pet, mood, meters.health)
    me.handle = myHandle
    if (live) {
      // Real team: map members, but keep the player's own interactive row.
      const others = remote.members
        .filter((m) => norm(m.handle) !== myHandle)
        .map((m) => rowFromMember(m))
      return rankZoo([me, ...others])
    }
    // No real data yet — show the demo roster so the zoo is never empty.
    return rankZoo([me, ...TEAM])
  }, [pet, mood, meters.health, myHandle, live, remote.members])

  const thriving = rows.filter((r) => r.mood === 'thriving').length
  const sick = rows.filter((r) => r.mood === 'sick' || r.mood === 'critical' || r.mood === 'hangry').length
  const gone = rows.filter((r) => r.mood === 'dead').length

  const subtitle = live
    ? `Your ${team} zoo, ranked by current slop. Pets are scored from real Tangled pull requests.`
    : 'Every pet in the company, ranked by slop shipped today. Thriving on top. The departed, regrettably, at the bottom. Click your own to go back and grovel.'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar active="zoo" />
      <main className="container" style={{ padding: '36px 24px 72px', flex: 1 }}>
        {/* header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 className="pixel-display" style={{ fontSize: 'clamp(20px, 3vw, 28px)', margin: 0 }}>
              {live ? `${team} zoo` : 'the team zoo'}
            </h1>
            <p style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 15, marginTop: 12, maxWidth: 560 }}>
              {subtitle}
            </p>
            {team && !live && !remote.loading && (
              <p style={{ color: 'var(--ink-3)', fontWeight: 700, fontSize: 13, marginTop: 10 }}>
                {remote.configured
                  ? 'No scored pull requests for this team yet — showing the demo zoo while your backfill runs.'
                  : 'Backend not connected yet — showing the demo zoo. Once env is configured, real pets appear here.'}
              </p>
            )}
          </div>
          <Card padding={18} style={{ display: 'flex', gap: 28 }}>
            <SummaryStat value={thriving} label="thriving" color="var(--health-thriving)" />
            <SummaryStat value={sick} label="struggling" color="var(--health-warning)" />
            <SummaryStat value={gone} label="expired" color="var(--health-dead)" />
          </Card>
        </div>

        {/* grid */}
        <div className="zoo-grid">
          {rows.map((person, i) => (
            <ZooCard
              key={person.id}
              person={person}
              rank={i + 1}
              onOpen={() => {
                if (person.you) navigate('/play')
              }}
            />
          ))}
        </div>
      </main>
    </div>
  )
}
