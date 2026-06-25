import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card } from '../ds/index.js'
import TopBar from '../components/TopBar.jsx'
import ZooCard from '../components/ZooCard.jsx'
import PetInspector from '../components/PetInspector.jsx'
import { usePet } from '../game/store.jsx'
import { playerRow, rankZoo } from '../game/zoo.js'
import {
  moodFromPet,
  healthSegments,
  slopLevel,
  speciesForHandle,
  petNameForHandle,
} from '../api/mapping.js'
import { getPet, joinTeam, connectGithubStandalone, githubSubjectKey } from '../api/client.js'

const norm = (h) => String(h || '').toLowerCase().replace(/^@/, '')

const ROSTER_KEY = 'slop.roster'

/** A roster entry is `{ kind: 'tangled' | 'github', id }`. */
function loadRoster() {
  try {
    const r = JSON.parse(localStorage.getItem(ROSTER_KEY) || '[]')
    return Array.isArray(r) ? r.filter((m) => m && m.id && m.kind) : []
  } catch {
    return []
  }
}
function saveRoster(r) {
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(r))
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/** The backend pet/receipt key for a roster member (handle, or github:<login>). */
const memberKey = (m) => (m.kind === 'github' ? githubSubjectKey(m.id) : norm(m.id))
const sameMember = (a, b) => a.kind === b.kind && norm(a.id) === norm(b.id)

/** Build a zoo row (ZooCard shape) for a roster member from its fetched pet. */
function rosterRow(m, petData) {
  const key = memberKey(m)
  const pet = petData?.pet ?? null
  return {
    id: key,
    name: m.id,
    role: m.kind === 'github' ? 'GitHub' : 'Tangled',
    pet: petNameForHandle(m.id),
    species: speciesForHandle(key),
    mood: moodFromPet(pet),
    health: pet ? healthSegments(pet.health) : 4,
    slopToday: slopLevel(pet),
    handle: key,
    real: true,
  }
}

/** Add-a-developer controls: pick a source, enter a handle/username, add it. */
function AddMember({ onAdd, disabledIds }) {
  const [kind, setKind] = useState('github')
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    const id = norm(value)
    if (!id || busy) return
    if (disabledIds.has(`${kind}:${id}`)) {
      setMsg({ ok: false, text: `${id} is already in your zoo.` })
      return
    }
    setBusy(true)
    setMsg(null)
    const res = await onAdd({ kind, id })
    setBusy(false)
    if (res.ok) {
      setMsg({ ok: true, text: `Added ${id}. Scoring their pull requests — they'll fill in shortly.` })
      setValue('')
    } else {
      setMsg({ ok: false, text: res.error || `Couldn't add ${id}. Check it and try again.` })
    }
  }

  const tabBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setKind(id)}
      style={{
        padding: '8px 14px',
        borderRadius: 'var(--radius-md)',
        border: `2px solid ${kind === id ? 'var(--accent)' : 'var(--line)'}`,
        background: kind === id ? 'var(--accent-soft)' : 'var(--surface-card)',
        fontWeight: 800,
        fontSize: 13,
        color: kind === id ? 'var(--accent-press)' : 'var(--ink-3)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  return (
    <Card padding={16} style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink-3)', marginBottom: 8 }}>
        add a developer to your zoo
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {tabBtn('github', 'GitHub')}
        {tabBtn('tangled', 'tangled.org')}
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={kind === 'github' ? 'octocat' : 'filipstal.tngl.sh'}
            autoComplete="off"
            spellCheck={false}
            style={zooInputStyle}
          />
        </div>
        <Button pixel={false} size="md" type="submit" disabled={busy || !value.trim()}>
          {busy ? 'Adding…' : 'Add to zoo'}
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
  const [roster, setRoster] = useState(loadRoster)
  const [pets, setPets] = useState({}) // memberKey -> pet DTO (or null)
  const [inspect, setInspect] = useState(null)
  const timers = useRef([])

  const myKey = pet ? (pet.source === 'github' ? githubSubjectKey(pet.handle) : norm(pet.handle)) : ''

  const loadMember = useCallback(async (key) => {
    if (!key) return
    const res = await getPet(key)
    setPets((prev) => ({ ...prev, [key]: res.ok ? res.data : null }))
  }, [])

  const reloadAll = useCallback(() => {
    roster.forEach((m) => loadMember(memberKey(m)))
  }, [roster, loadMember])

  useEffect(() => {
    reloadAll()
    const onFocus = () => reloadAll()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [reloadAll])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const addMember = useCallback(
    async ({ kind, id }) => {
      const res =
        kind === 'github'
          ? await connectGithubStandalone({ githubUsername: id })
          : await joinTeam({ handle: id })
      if (!res.ok) return res
      setRoster((prev) => {
        const next = prev.some((m) => sameMember(m, { kind, id })) ? prev : [...prev, { kind, id }]
        saveRoster(next)
        return next
      })
      // Their backfill runs server-side; re-poll so the pet appears as it lands.
      const key = kind === 'github' ? githubSubjectKey(id) : norm(id)
      loadMember(key)
      timers.current.forEach(clearTimeout)
      timers.current = [4000, 9000, 15000].map((ms) => setTimeout(() => loadMember(key), ms))
      return res
    },
    [loadMember],
  )

  const removeMember = useCallback((m) => {
    setRoster((prev) => {
      const next = prev.filter((x) => !sameMember(x, m))
      saveRoster(next)
      return next
    })
  }, [])

  const others = useMemo(() => roster.filter((m) => memberKey(m) !== myKey), [roster, myKey])
  const disabledIds = useMemo(() => new Set(roster.map((m) => `${m.kind}:${norm(m.id)}`)), [roster])

  const rows = useMemo(() => {
    const all = []
    if (pet) {
      const me = playerRow(pet, mood, meters.health)
      me.handle = myKey
      all.push(me)
    }
    for (const m of others) all.push(rosterRow(m, pets[memberKey(m)]))
    return rankZoo(all)
  }, [pet, mood, meters.health, myKey, others, pets])

  const thriving = rows.filter((r) => r.mood === 'thriving').length
  const sick = rows.filter((r) => r.mood === 'sick' || r.mood === 'critical' || r.mood === 'hangry').length
  const gone = rows.filter((r) => r.mood === 'dead').length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar active="zoo" />
      <main className="container" style={{ padding: '36px 24px 72px', flex: 1 }}>
        {/* header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 className="pixel-display" style={{ fontSize: 'clamp(20px, 3vw, 28px)', margin: 0 }}>
              your zoo
            </h1>
            <p style={{ color: 'var(--ink-2)', fontWeight: 600, fontSize: 15, marginTop: 12, maxWidth: 560 }}>
              The developers you're tracking, ranked by current slop. Add anyone by their GitHub
              username or Tangled handle — pets are scored from their real pull requests.
            </p>
          </div>
          <Card padding={18} style={{ display: 'flex', gap: 28 }}>
            <SummaryStat value={thriving} label="thriving" color="var(--health-thriving)" />
            <SummaryStat value={sick} label="struggling" color="var(--health-warning)" />
            <SummaryStat value={gone} label="expired" color="var(--health-dead)" />
          </Card>
        </div>

        {/* add a developer */}
        <AddMember onAdd={addMember} disabledIds={disabledIds} />

        {/* current roster (removable) */}
        {others.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {others.map((m) => (
              <span
                key={`${m.kind}:${m.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '2px solid var(--line)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--ink-2)',
                }}
              >
                {m.kind === 'github' ? '🐙' : '🔗'} {m.id}
                <button
                  onClick={() => removeMember(m)}
                  aria-label={`Remove ${m.id}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900, color: 'var(--ink-3)', padding: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* grid */}
        {rows.length === 0 ? (
          <Card padding={24}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', margin: 0 }}>
              Your zoo is empty. Hatch a pet, then add teammates above to see them ranked here.
            </p>
          </Card>
        ) : (
          <div className="zoo-grid">
            {rows.map((person, i) => (
              <ZooCard
                key={person.id}
                person={person}
                rank={i + 1}
                onOpen={() => {
                  // Your own pet → go play it. A teammate → inspect why they scored.
                  if (person.you) navigate('/play')
                  else if (person.handle) setInspect(person.handle)
                }}
              />
            ))}
          </div>
        )}
      </main>

      {inspect && <PetInspector handle={inspect} onClose={() => setInspect(null)} />}
    </div>
  )
}

function SummaryStat({ value, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 22, color: color || 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginTop: 6 }}>{label}</div>
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
