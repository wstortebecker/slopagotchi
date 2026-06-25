import { useNavigate } from 'react-router-dom'
import { Button, Card, PixelIcon } from '../ds/index.js'
import TopBar from '../components/TopBar.jsx'
import PetConsole from '../components/PetConsole.jsx'
import VitalsPanel from '../components/VitalsPanel.jsx'
import ReceiptPanel from '../components/ReceiptPanel.jsx'
import { usePet } from '../game/store.jsx'

/* The left-column read on the pet's current state — a short, plain-language
   review keyed off its health status. Apple-store-blurb energy, not a wall. */
const REVIEW = {
  thriving: "Spotless run. Diffs stay tight, intent is obvious, nothing speculative shipped. Keep the scope honest and it stays this way.",
  ok: "Healthy, mostly. A little drift here and there, but nothing the next deliberate pull request won't smooth over.",
  sick: "Slop is creeping in — oversized diffs and vague commits are starting to weigh things down. Trim scope before it compounds.",
  critical: "Critical. Unfocused changes and thin tests are dragging it under. Ship one small, careful PR to pull it back.",
  slop: "Heavy slop today. The pet is choking on it. Clean up, then ship something it can actually digest.",
  dead: "Expired under the weight of shipped slop. Revive it and start clean — small diffs, clear intent.",
}

function Eyebrow({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
      {children}
    </div>
  )
}

function Heading({ children, center = false }) {
  return (
    <h2
      style={{
        margin: '12px 0 0',
        fontFamily: 'var(--font-body)',
        fontWeight: 800,
        fontSize: 'clamp(22px, 2.4vw, 30px)',
        letterSpacing: '-0.01em',
        color: 'var(--ink)',
        textAlign: center ? 'center' : 'left',
      }}
    >
      {children}
    </h2>
  )
}

function Memorial() {
  const navigate = useNavigate()
  const { pet, message, actions } = usePet()
  const startFresh = () => {
    actions.resetEgg()
    navigate('/hatch')
  }
  return (
    <Card tone="ink" padding={20}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <PixelIcon name="skull" scale={4} color="var(--paper)" />
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 13, color: 'var(--paper)' }}>rest in pieces, {pet.name}</div>
      </div>
      <p style={{ fontFamily: 'var(--font-lcd)', fontSize: 16, color: 'rgba(251,250,242,0.8)', lineHeight: 1.4, marginBottom: 18 }}>
        “{message}”
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button variant="primary" size="md" pixel={false} onClick={() => actions.revive()}>
          Revive {pet.name}
        </Button>
        <Button variant="ghost" size="md" pixel={false} onClick={startFresh} style={{ color: 'var(--paper)', borderColor: 'rgba(251,250,242,0.4)' }}>
          Pick a new pet
        </Button>
      </div>
    </Card>
  )
}

export default function Personal() {
  const navigate = useNavigate()
  const { pet, mood, status, actions } = usePet()
  const dead = mood === 'dead'
  const review = REVIEW[status] || REVIEW.ok

  const reHatch = () => {
    actions.resetEgg()
    navigate('/hatch')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--surface-card)' }}>
      <TopBar active="mine" className="reveal-fade" />

      <div className="dash3">
        {/* ── analysis ──────────────────────────────────────────── */}
        <div className="col col-left reveal" style={{ ['--reveal-i']: 1 }}>
          <Eyebrow>Overview</Eyebrow>
          <Heading>Analysis</Heading>
          <p style={{ marginTop: 18, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', lineHeight: 1.65 }}>
            {review}
          </p>
          <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid var(--divider)' }}>
            <button
              onClick={reHatch}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 800, color: 'var(--accent)' }}
            >
              start over with a new egg →
            </button>
          </div>
        </div>

        {/* ── the pet ───────────────────────────────────────────── */}
        <div className="col col-mid reveal" style={{ ['--reveal-i']: 2 }}>
          <div style={{ textAlign: 'center' }}>
            <Eyebrow>Live pet</Eyebrow>
            <Heading center>{pet.name}</Heading>
          </div>
          <PetConsole />
        </div>

        {/* ── vitals ────────────────────────────────────────────── */}
        <div className="col col-right reveal" style={{ ['--reveal-i']: 3 }}>
          {dead && <Memorial />}
          <VitalsPanel />
          <ReceiptPanel />
        </div>
      </div>
    </div>
  )
}
