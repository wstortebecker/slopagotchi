import { Link, Navigate, useParams } from 'react-router-dom'
import MarketingHeader from '../components/MarketingHeader.jsx'
import SiteFooter from '../components/SiteFooter.jsx'
import { getLegal } from '../content/legal.js'

const OTHER_DOCS = [
  { slug: 'terms', label: 'Terms of Service' },
  { slug: 'privacy', label: 'Privacy Policy' },
  { slug: 'refunds', label: 'Refund Policy' },
]

export default function Legal({ doc: docProp }) {
  const params = useParams()
  const doc = docProp || params.doc
  const data = getLegal(doc)
  if (!data) return <Navigate to="/terms" replace />

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <MarketingHeader />

      <main className="container-narrow" style={{ flex: 1, padding: '48px 24px 72px' }}>
        <h1 className="pixel-display" style={{ fontSize: 'clamp(26px, 4vw, 38px)', margin: 0 }}>
          {data.title}
        </h1>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)', margin: '12px 0 0' }}>
          Last updated {data.updated}
        </p>

        {data.disclaimer && (
          <div
            role="note"
            style={{
              marginTop: 24,
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-soft)',
              border: '2px solid var(--accent)',
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
            }}
          >
            <span
              aria-hidden
              style={{
                flex: 'none',
                fontFamily: 'var(--font-pixel)',
                fontSize: 14,
                color: 'var(--accent-press)',
                lineHeight: 1.4,
              }}
            >
              ⚠
            </span>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--ink)', fontWeight: 700, margin: 0 }}>
              {data.disclaimer}
            </p>
          </div>
        )}

        <p style={{ fontSize: 17, lineHeight: 1.7, color: 'var(--ink-2)', fontWeight: 500, margin: '20px 0 0' }}>
          {data.intro}
        </p>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {data.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="pixel-display" style={{ fontSize: 18, margin: '0 0 10px' }}>
                {s.heading}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {s.body.map((para, i) => (
                  <p key={i} style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--ink-2)', fontWeight: 500, margin: 0 }}>
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Cross-links to the other legal docs */}
        <div
          style={{
            marginTop: 44,
            paddingTop: 24,
            borderTop: '1px solid var(--line)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          {OTHER_DOCS.filter((d) => d.slug !== data.slug).map((d) => (
            <Link
              key={d.slug}
              to={`/${d.slug}`}
              style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}
            >
              {d.label} →
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
