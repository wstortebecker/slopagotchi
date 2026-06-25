import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../ds/index.js'
import Logo from '../ds/Logo.jsx'
import { usePet } from '../game/store.jsx'

const NAV_LINKS = [
  { label: 'Blog', to: '/blog' },
  { label: 'Pricing', to: '/hatch' },
]

/**
 * MarketingHeader — sticky top bar for the public site (landing, blog, legal).
 * Logo links home, a couple of nav links, and the same hatch/open CTA the
 * landing hero uses.
 */
export default function MarketingHeader() {
  const navigate = useNavigate()
  const { hatched } = usePet()
  const ctaLabel = hatched ? 'Open my pet' : 'Hatch your egg'

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
      <div className="container" style={{ display: 'flex', alignItems: 'center', height: 72, gap: 24 }}>
        <Link to="/" aria-label="Slopagotchi home">
          <Logo size={32} />
        </Link>
        <nav style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 22 }}>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-2)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-2)')}
            >
              {l.label}
            </Link>
          ))}
          <Button size="sm" pixel={false} onClick={() => navigate(hatched ? '/play' : '/hatch')}>
            {ctaLabel}
          </Button>
        </nav>
      </div>
    </header>
  )
}
