import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, DeviceShell, PetScene, PixelIcon, SPECIES_LIST } from '../ds/index.js'
import Logo from '../ds/Logo.jsx'
import CaseStudies from '../components/CaseStudies.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import { applyShellTheme, getStoredShell, usePet } from '../game/store.jsx'

const SHELLS = ['bubblegum', 'sky', 'lemon', 'lime', 'grape', 'tangerine']
const SHELL_LABEL = {
  bubblegum: 'Bubblegum',
  sky: 'Sky',
  lemon: 'Lemon',
  lime: 'Lime',
  grape: 'Grape',
  tangerine: 'Tangerine',
}

function MarketingNav() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 'var(--z-nav)',
        background: 'rgba(251,250,242,0.82)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', height: 72 }}>
        <Logo size={32} />
        <Link
          to="/blog"
          style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 800, color: 'var(--ink-2)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-2)')}
        >
          Blog
        </Link>
      </div>
    </header>
  )
}

/* Egg-shaped colour swatches — selecting one recolours the whole site. */
function ShellSwatches({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 22 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {SHELLS.map((s) => {
          const sel = value === s
          return (
            <button
              key={s}
              onClick={() => onChange(s)}
              title={SHELL_LABEL[s]}
              aria-label={`${SHELL_LABEL[s]} shell`}
              style={{
                width: 34,
                height: 40,
                padding: 0,
                border: 'none',
                cursor: 'pointer',
                borderRadius: 'var(--radius-egg)',
                backgroundColor: `var(--shell-${s})`,
                backgroundImage: 'var(--gloss-radial)',
                boxShadow: sel ? '0 0 0 3px var(--paper), 0 0 0 6px var(--accent)' : 'var(--shadow-plastic-sm)',
                transition: 'box-shadow var(--dur-fast)',
              }}
            />
          )
        })}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>
        pick a shell — it themes the whole site
      </div>
    </div>
  )
}

function HeroDevice({ shell, onShell }) {
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
          top: 40,
          width: 360,
          height: 360,
          borderRadius: '50%',
          background: 'radial-gradient(circle, var(--accent-soft), transparent 68%)',
          filter: 'blur(4px)',
        }}
      />
      <DeviceShell shell={shell} width={320} fill style={{ position: 'relative' }}>
        <PetScene species={species} mood="thriving" scale={9} />
      </DeviceShell>
      <div style={{ marginTop: 18, fontFamily: 'var(--font-lcd)', fontSize: 16, color: 'var(--ink-3)', fontWeight: 600 }}>
        meet <span style={{ color: 'var(--accent)' }}>{SPECIES_LIST[i].label}</span> — {SPECIES_LIST[i].tag}
      </div>
      <ShellSwatches value={shell} onChange={onShell} />
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { hatched, pet, actions } = usePet()
  const [shell, setShell] = useState(() => pet?.shell || getStoredShell())

  // Reflect the chosen / remembered shell across the site on load.
  useEffect(() => {
    applyShellTheme(shell)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onShell = (s) => {
    setShell(s)
    actions.setShell(s)
  }

  const ctaLabel = hatched ? 'Open my pet' : 'Hatch your egg'
  const onCta = () => navigate(hatched ? '/play' : '/hatch')

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <MarketingNav />

      <section className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '56px 24px 80px' }}>
        <div className="hero-grid" style={{ width: '100%' }}>
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
              a virtual pet for everyone who ships with AI
            </div>
            <h1 className="pixel-display" style={{ fontSize: 'clamp(30px, 4.4vw, 52px)', margin: 0 }}>
              a pet that lives off your <span style={{ color: 'var(--accent)' }}>clean code</span>.
            </h1>
            <p style={{ fontSize: 19, lineHeight: 1.55, color: 'var(--ink-2)', fontWeight: 600, margin: '22px 0 0', maxWidth: 520 }}>
              Slopagotchi hatches on your desk and feeds on real commits. AI slop is free to make and
              paid for forever&hellip; in storage, in compute, in the data centers everyone wants to
              fling into orbit. Cut it at the source and your pet thrives. Ship a lot and, well&hellip;
              it has loud, passive-aggressive opinions.
            </p>
            <div style={{ marginTop: 32 }}>
              <Button size="lg" pixel={false} onClick={onCta}>
                {ctaLabel}
              </Button>
            </div>
          </div>

          <HeroDevice shell={shell} onShell={onShell} />
        </div>
      </section>

      <CaseStudies />

      <SiteFooter />
    </div>
  )
}
