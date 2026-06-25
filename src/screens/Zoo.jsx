import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '../ds/index.js'
import TopBar from '../components/TopBar.jsx'
import ZooCard from '../components/ZooCard.jsx'
import PetInspector from '../components/PetInspector.jsx'
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
 * Fetches the player's real team zoo from the backend. Exposes `reload()` so the
 * screen can refresh after adding a teammate (and poll while their backfill
 * runs). Returns null-ish state while loading / when there's nothing real yet,
 * so the screen can fall back to the demo roster.
 */
function useRemoteZoo(team) {
  const [state, setState] = useState({ loading: !!team, configured: false, members: [] })
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const reload = useCallback(async () => {
    if (!team) {
      setState({ loading: false, configured: false, members: [] })
      return
    }
    const res = await getZoo(team)
    if (!mounted.current) return
    const configured = res.ok && res.data?.configured === true
    const members = Array.isArray(res.data?.members) ? res.data.members : []
    setState({ loading: false, configured, members })
  }, [team])

  useEffect(() => {
    reload()
    const onFocus = () => reload()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reload])

  return { ...state, reload }
}

/** Add-a-teammate (or create-a-zoo) controls shown above the grid. */
function ManageZoo({ team, onReload }) {
  const { actions } = usePet()
  const [teamInput, setTeamInput] = useState('')
  const [handleInput, setHandleInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState(null)
  const timers = useRef([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const createZoo = (e) => {
    e.preventDefault()
    const t = norm(teamInput)
    if (t) actions.setTeam(t)
  }

  const addTeammate = async (e) => {
    e.preventDefault()
    const h = norm(handleInput)
    if (!h || !team || adding) return
    setAdding(true)
    setMsg(null)
    const res = await actions.addTeammate({ handle: h, team })
    setAdding(false)
    if (res.ok) {
      setMsg({ ok: true, text: `Added ${h}. Scoring their pull requests — refresh in a moment.` })
      setHandleInput('')
      onReload()
      // Their backfill runs server-side; re-poll so the pet appears as it lands.
      timers.current.forEach(clearTimeout)
      timers.current = [4000, 9000, 15000].map((ms) => setTimeout(onReload, ms))
    } else {
      setMsg({ ok: false, text: res.error || `Couldn't add ${h}. Check the handle.` })
    }
  }

  if (!team) {
    return (
      <Card padding={16} style={{ marginBottom: 20 }}>
        <form onSubmit={createZoo} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 6 }}>start a team zoo</div>
            <input
              value={teamInput}
              onChange={(e) => setTeamInput(e.target.value)}
              placeholder="acme"
              autoComplete="off"
              spellCheck={false}
              style={zooInputStyle}
            />
          </div>
          <Button pixel={false} size="md" type="submit" disabled={!teamInput.trim()}>
            Create zoo
          </Button>
        </form>
        <p style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: 'var(--ink-3)' }}>
          Pick a team slug, then add teammates by their Tangled handle.
        </p>
      </Card>
    )
  }

  return (
    <Card padding={16} style={{ marginBottom: 20 }}>
      <form onSubmit={addTeammate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 6 }}>
            add a teammate to <span style={{ color: 'var(--accent-press)' }}>{team}</span>
          </div>
          <input
            value={handleInput}
            onChange={(e) => setHandleInput(e.target.value)}
            placeholder="filipstal.tngl.sh"
            autoComplete="off"
            spellCheck={false}
            style={zooInputStyle}
          />
        </div>
        <Button pixel={false} size="md" type="submit" disabled={adding || !handleInput.trim()}>
          {adding ? 'Adding…' : 'Add to zoo'}
        </Button>
      </form>
      {msg && (
        <p
          role={msg.ok ? 'status' : 'alert'}
          style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: msg.ok ? 'var(--health-thriving)' : 'var(--slop)' }}
        >
          {msg.text}
        </p>
      )}
    </Card>
  )
}

export default function Zoo() {
  const navigate = useNavigate()
  const { pet, mood, meters } = usePet()
  const team = pet?.team || ''
  const myHandle = norm(pet?.handle)
  const remote = useRemoteZoo(team)
  const [inspect, setInspect] = useState(null)

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
      <TopBar active="zoo" className="reveal-fade" />
      <main className="container" style={{ padding: '36px 24px 72px', flex: 1 }}>
        {/* header */}
        <div className="reveal" style={{ ['--reveal-i']: 1, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
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
                  ? 'No teammates scored for this zoo yet — add some below. (Demo pets shown meanwhile.)'
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

        {/* add a teammate / create a zoo */}
        <div className="reveal" style={{ ['--reveal-i']: 2 }}>
          <ManageZoo team={team} onReload={remote.reload} />
        </div>

        {/* grid */}
        <div className="zoo-grid">
          {rows.map((person, i) => (
            <div key={person.id} className="reveal-card" style={{ ['--reveal-i']: i + 3, display: 'grid' }}>
              <ZooCard
                person={person}
                rank={i + 1}
                onOpen={() => {
                  // Your own pet → go play it. A real teammate → inspect why they
                  // scored what they did. (Demo roster pets have no handle.)
                  if (person.you) navigate('/play')
                  else if (person.handle) setInspect(person.handle)
                }}
              />
            </div>
          ))}
        </div>
      </main>

      {inspect && <PetInspector handle={inspect} onClose={() => setInspect(null)} />}
    </div>
  )
}

const zooInputStyle = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  fontSize: 15,
  fontWeight: 700,
  color: 'var(--ink)',
  background: 'var(--surface-card)',
  border: '2px solid var(--line)',
  borderRadius: 'var(--radius-md)',
  outline: 'none',
  boxSizing: 'border-box',
}
