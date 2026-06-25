import { Link } from 'react-router-dom'
import Logo from '../ds/Logo.jsx'
import { PixelIcon } from '../ds/index.js'
import PaymentBadges from './PaymentBadges.jsx'

const YEAR = 2026

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Hatch your egg', to: '/hatch' },
      { label: 'Pricing', to: '/hatch' },
      { label: 'The zoo', to: '/zoo' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Blog', to: '/blog' },
      { label: 'Why now', to: '/blog/production-went-free' },
      { label: 'The thesis', to: '/blog/no-data-centers-in-space' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Refund Policy', to: '/refunds' },
    ],
  },
]

function FooterLink({ to, children }) {
  return (
    <Link
      to={to}
      style={{
        fontSize: 14,
        fontWeight: 700,
        color: 'var(--ink-2)',
        transition: 'color var(--dur-fast)',
        display: 'inline-block',
        padding: '3px 0',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-2)')}
    >
      {children}
    </Link>
  )
}

/** Small lock + "Secured by Stripe" reassurance lockup. */
function SecureLockup() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span
        aria-hidden
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 24,
          height: 24,
          borderRadius: 7,
          background: 'var(--health-thriving)',
        }}
      >
        <PixelIcon name="check" scale={2} color="#fff" />
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-2)' }}>
        Secured by Stripe · 256-bit SSL
      </span>
    </div>
  )
}

/**
 * SiteFooter — the marketing footer. Carries legal/terms links plus the payment
 * + security trust signals. Used on every public (un-gated) page.
 */
export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--line)',
        background: 'var(--paper-2)',
        marginTop: 'auto',
      }}
    >
      <div className="container" style={{ padding: '56px 24px 28px' }}>
        <div className="footer-grid">
          {/* Brand blurb */}
          <div style={{ maxWidth: 320 }}>
            <Link to="/" aria-label="Slopagotchi home">
              <Logo size={28} />
            </Link>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-3)', fontWeight: 600, margin: '16px 0 0' }}>
              A virtual pet that lives off your clean code and gets queasy on AI slop. Cut the slop at
              the source — no data centers in space required.
            </p>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div className="section-label" style={{ marginBottom: 8 }}>
                {col.title}
              </div>
              {col.links.map((l) => (
                <FooterLink key={l.label} to={l.to}>
                  {l.label}
                </FooterLink>
              ))}
            </nav>
          ))}
        </div>

        {/* Trust strip */}
        <div
          style={{
            marginTop: 40,
            padding: '22px 0',
            borderTop: '1px solid var(--line)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--ink-3)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase' }}>
              Pay safely
            </span>
            <PaymentBadges />
          </div>
          <SecureLockup />
        </div>

        {/* Bottom bar */}
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', margin: 0 }}>
            © {YEAR} Slopagotchi. All rights reserved.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            <FooterLink to="/terms">Terms</FooterLink>
            <FooterLink to="/privacy">Privacy</FooterLink>
            <FooterLink to="/refunds">Refunds</FooterLink>
          </div>
        </div>

        {/* Hobby-project disclaimer — shown site-wide */}
        <p style={{ fontSize: 12, lineHeight: 1.55, fontWeight: 600, color: 'var(--ink-3)', margin: '16px 0 0', maxWidth: 760 }}>
          Slopagotchi is a hobby project, provided “as is” with no warranties and used at your own
          risk. To the maximum extent permitted by law we accept no responsibility or liability for
          any loss, downtime, data loss or data breach. Please don’t upload anything confidential or
          irreplaceable. See our <Link to="/terms" style={{ color: 'var(--accent)', fontWeight: 800 }}>Terms</Link>.
        </p>
      </div>
    </footer>
  )
}
