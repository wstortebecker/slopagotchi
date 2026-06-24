import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, DeviceShell, LcdScreen, Pet, PetScene, PixelIcon, SPECIES_LIST } from '../ds/index.js'
import Logo from '../ds/Logo.jsx'
import { usePet } from '../game/store.jsx'

const MOODS = [
  { mood: 'thriving', label: 'THRIVING', tone: 'good', quip: "clean commits all week. i'm thriving." },
  { mood: 'happy', label: 'HAPPY', tone: 'good', quip: "we're good. hands off the autocomplete." },
  { mood: 'hangry', label: 'HANGRY', tone: 'mid', quip: 'feed me a REAL commit.' },
  { mood: 'sick', label: 'SICK', tone: 'mid', quip: 'that PR was 80% robot. i can taste it.' },
  { mood: 'critical', label: 'CRITICAL', tone: 'bad', quip: '...told you... to write it... yourself...' },
  { mood: 'dead', label: 'EXPIRED', tone: 'bad', quip: 'shipped to death. that’s on you.' },
]

const TONE_COLOR = {
  good: 'var(--health-thriving)',
  mid: 'var(--health-warning)',
  bad: 'var(--health-danger)',
}

function MarketingNav() {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 'var(--z-nav)', background: 'rgba(251,250,242,0.82)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--line)' }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', height: 72 }}>
        <Logo size={32} />
      </div>
    </header>
  )
}

function HeroDevice() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % SPECIES_LIST.length), 2600)
    return () => clearInterval(id)
  }, [])
  const species = SPECIES_LIST[i].id
  return (
    <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
      <div
        aria-hidden
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent-soft), transparent 68%)',
          filter: 'blur(4px)',
        }}
      />
      <DeviceShell shell="bubblegum" width={320} fill style={{ position: 'relative' }}>
        <PetScene species={species} mood="thriving" scale={9} />
      </DeviceShell>
      <div style={{ marginTop: 18, fontFamily: 'var(--font-lcd)', fontSize: 16, color: 'var(--ink-3)', fontWeight: 600 }}>
        meet <span style={{ color: 'var(--accent)' }}>{SPECIES_LIST[i].label}</span> — {SPECIES_LIST[i].tag}
      </div>
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 20, color: 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', marginTop: 6 }}>{label}</div>
    </div>
  )
}

function MechanicCard({ icon, iconColor, title, body }) {
  return (
    <Card padding={24} style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 'var(--radius-md)',
          background: 'var(--lcd-screen)',
          boxShadow: 'var(--shadow-screen)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <PixelIcon name={icon} scale={4} color={iconColor} />
      </div>
      <h3 style={{ fontFamily: 'var(--font-pixel)', fontSize: 13, lineHeight: 1.5, color: 'var(--ink)' }}>{title}</h3>
      <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--ink-2)', fontWeight: 600 }}>{body}</p>
    </Card>
  )
}

function MoodChip({ mood, label, tone, quip }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <LcdScreen fill bezel={false} height={130} style={{ borderRadius: 16, overflow: 'hidden' }}>
        <PetScene mood={mood} scale={6} />
      </LcdScreen>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--ink)' }}>{label}</span>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: TONE_COLOR[tone] }} />
      </div>
      <p style={{ fontFamily: 'var(--font-lcd)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.3, minHeight: 36 }}>
        “{quip}”
      </p>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { hatched, pet } = usePet()
  const cta = hatched
    ? { label: 'Open my pet', onClick: () => navigate('/play') }
    : { label: 'Hatch your egg', onClick: () => navigate('/hatch') }

  return (
    <div style={{ flex: 1 }}>
      <MarketingNav />

      {/* ---- Hero ---- */}
      <section className="container" style={{ padding: '64px 24px 72px' }}>
        <div className="hero-grid">
          <div className="fade-up">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--accent-soft)',
                color: 'var(--accent-press)',
                fontWeight: 800,
                fontSize: 13,
                marginBottom: 24,
              }}
            >
              <PixelIcon name="heart" scale={2.5} color="var(--accent-press)" />
              a virtual pet for people who still write code
            </div>
            <h1 className="pixel-display" style={{ fontSize: 'clamp(30px, 4.4vw, 52px)', margin: 0 }}>
              a pet that lives off your <span style={{ color: 'var(--accent)' }}>clean code</span>.
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--ink-2)', fontWeight: 600, margin: '22px 0 0', maxWidth: 520 }}>
              Slopagotchi hatches on your desk and feeds on real commits. Ship a little
              AI slop and it gets queasy. Ship a lot and, well&hellip; it has opinions about
              that. Loud, passive-aggressive opinions.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 32 }}>
              <Button size="lg" pixel={false} onClick={cta.onClick}>{hatched ? 'Open my pet' : 'Hatch your egg'}</Button>
              <Button size="lg" variant="ghost" pixel={false} onClick={() => navigate('/zoo')}>
                Peek at the zoo
              </Button>
            </div>
            <div style={{ display: 'flex', gap: 40, marginTop: 40, flexWrap: 'wrap' }}>
              <Stat value="11" label="creatures to hatch" />
              <Stat value="0" label="emoji used, ever" />
              <Stat value={hatched && pet ? `LV ${pet ? Math.floor(pet.xp / 120) + 1 : 1}` : '∞'} label={hatched ? 'your current level' : 'guilt, approximately'} />
            </div>
          </div>

          <HeroDevice />
        </div>
      </section>

      {/* ---- Mechanic ---- */}
      <section id="how" style={{ background: 'var(--surface-card)', borderTop: '2px solid var(--line)', borderBottom: '2px solid var(--line)', padding: '64px 0' }}>
        <div className="container">
          <div className="section-label" style={{ marginBottom: 10 }}>The deal</div>
          <h2 className="pixel-display" style={{ fontSize: 'clamp(22px, 3vw, 30px)', marginBottom: 36, maxWidth: 720 }}>
            three buttons. one fragile creature. your reputation.
          </h2>
          <div className="features-grid">
            <MechanicCard
              icon="heart"
              iconColor="var(--accent)"
              title="Feed it real commits"
              body="Hand-written code is a balanced meal. Every honest function tops up its hunger and nudges its health back toward thriving."
            />
            <MechanicCard
              icon="slop"
              iconColor="var(--slop)"
              title="Ship slop, watch it wilt"
              body="One-prompt features and tab-completed modules pile up as slop. It poisons your pet's health and it will absolutely bring it up later."
            />
            <MechanicCard
              icon="skull"
              iconColor="var(--health-dead)"
              title="The whole team's in the zoo"
              body="Everyone's pet is ranked by slop shipped today. Thriving at the top, the dearly departed at the bottom. No pressure."
            />
          </div>
        </div>
      </section>

      {/* ---- States ladder ---- */}
      <section className="container" style={{ padding: '64px 24px' }}>
        <div className="section-label" style={{ marginBottom: 10 }}>The mood ladder</div>
        <h2 className="pixel-display" style={{ fontSize: 'clamp(22px, 3vw, 30px)', marginBottom: 32, maxWidth: 760 }}>
          smug when you're clean. on life support when you're not.
        </h2>
        <div className="states-strip">
          {MOODS.map((m) => (
            <MoodChip key={m.mood} {...m} />
          ))}
        </div>
      </section>

      {/* ---- CTA band ---- */}
      <section className="container" style={{ padding: '8px 24px 80px' }}>
        <Card tone="ink" padding={0} style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24, padding: '40px 44px' }}>
            <div>
              <h2 className="pixel-display" style={{ color: 'var(--paper)', fontSize: 'clamp(20px, 2.6vw, 28px)', margin: 0 }}>
                your egg is getting cold.
              </h2>
              <p style={{ color: 'rgba(251,250,242,0.7)', fontWeight: 600, fontSize: 16, marginTop: 12 }}>
                Hatch one in about thirty seconds. Naming it is the hard part.
              </p>
            </div>
            <Button size="lg" pixel={false} onClick={cta.onClick}>{hatched ? 'Open my pet' : 'Hatch your egg'}</Button>
          </div>
        </Card>
      </section>

      {/* ---- Footer ---- */}
      <footer style={{ borderTop: '2px solid var(--line)', background: 'var(--surface-card)' }}>
        <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between', padding: '28px 24px' }}>
          <Logo size={26} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>
            <Pet mood="happy" scale={3} />
            a pet that lives off your clean code
          </div>
        </div>
      </footer>
    </div>
  )
}
